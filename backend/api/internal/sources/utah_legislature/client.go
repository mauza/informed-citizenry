// Package utah_legislature provides a client for the official Utah Legislature
// developer API at glen.le.utah.gov.
//
// Obtain a developer token by registering at:
//
//	https://le.utah.gov/tracking/trackingLogin
//
// Set it via the UTAH_LEGISLATURE_TOKEN environment variable.
//
// Recommended polling cadence (from le.utah.gov docs):
//   - Bill list: once per hour
//   - Legislators: once per day
//
// NOTE: The glen.le.utah.gov API is marked "experimental" by Utah. If the
// field names or URL structure change, only this file needs updating. The
// domain, repository, and service layers are unaffected.
package utah_legislature

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"api/internal/domain"
)

const baseURL = "https://glen.le.utah.gov"

// Client is a thin HTTP adapter for the Utah Legislature API.
type Client struct {
	token      string
	httpClient *http.Client
}

// NewClient creates a new Utah Legislature API client.
func NewClient(token string) *Client {
	return &Client{
		token: token,
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

// CurrentSession returns the session identifier for the current calendar year's
// General Session (e.g. "2026GS").
func CurrentSession() string {
	return fmt.Sprintf("%dGS", time.Now().Year())
}

// ---------------------------------------------------------------------------
// Legislators
// ---------------------------------------------------------------------------

// apiLegislator mirrors the JSON shape returned by /legislators/<token>.
// Field names follow the Utah Legislature API camelCase convention.
// Adjust these tags if the actual API response differs.
type apiLegislator struct {
	ID             string `json:"id"`
	FirstName      string `json:"firstName"`
	LastName       string `json:"lastName"`
	Chamber        string `json:"chamber"`  // "H" or "S"
	District       int    `json:"district"`
	Party          string `json:"party"`
	Email          string `json:"email"`
	Phone          string `json:"phone"`
	Website        string `json:"website"`
	ImageURL       string `json:"imageUrl"`
}

// FetchLegislators retrieves all current Utah legislators.
func (c *Client) FetchLegislators(ctx context.Context) ([]domain.Legislator, error) {
	url := fmt.Sprintf("%s/legislators/%s", baseURL, c.token)

	var raw []apiLegislator
	if err := c.getJSON(ctx, url, &raw); err != nil {
		return nil, fmt.Errorf("fetch legislators: %w", err)
	}

	legislators := make([]domain.Legislator, 0, len(raw))
	for _, r := range raw {
		legislators = append(legislators, domain.Legislator{
			UtahLegislatureID: r.ID,
			Chamber:           normalizeChamber(r.Chamber),
			DistrictNumber:    r.District,
			FirstName:         r.FirstName,
			LastName:          r.LastName,
			Party:             r.Party,
			Email:             r.Email,
			Phone:             r.Phone,
			Website:           r.Website,
			ImageURL:          r.ImageURL,
		})
	}
	return legislators, nil
}

// ---------------------------------------------------------------------------
// Bills
// ---------------------------------------------------------------------------

// apiBillSummary mirrors the JSON shape returned by /bills/<session>/billlist/<token>.
type apiBillSummary struct {
	ID          string `json:"id"`
	ShortTitle  string `json:"shortTitle"`
	LongTitle   string `json:"longTitle"`
	Status      string `json:"status"`
	Sponsor     string `json:"sponsor"`
	SessionID   string `json:"sessionId"`
}

// apiBillDetail mirrors the JSON shape returned by /bills/<session>/<billID>/<token>.
type apiBillDetail struct {
	ID             string `json:"id"`
	ShortTitle     string `json:"shortTitle"`
	LongTitle      string `json:"longTitle"`
	Status         string `json:"status"`
	Sponsor        string `json:"sponsor"`
	SessionID      string `json:"sessionId"`
	Description    string `json:"description"`
	LastAction     string `json:"lastAction"`
	LastActionDate string `json:"lastActionDate"` // "YYYY-MM-DD" or RFC3339
	FullTextURL    string `json:"billFileURL"`
	FiscalNoteURL  string `json:"fiscalNoteURL"`
}

// FetchBills retrieves the bill list for the given session (e.g. "2026GS").
func (c *Client) FetchBills(ctx context.Context, session string) ([]domain.Bill, error) {
	url := fmt.Sprintf("%s/bills/%s/billlist/%s", baseURL, session, c.token)

	var raw []apiBillSummary
	if err := c.getJSON(ctx, url, &raw); err != nil {
		return nil, fmt.Errorf("fetch bills (%s): %w", session, err)
	}

	sessionYear := sessionToYear(session)
	bills := make([]domain.Bill, 0, len(raw))
	for _, r := range raw {
		bills = append(bills, domain.Bill{
			UtahLegislatureID: r.ID,
			BillNumber:        r.ID,
			BillType:          billType(r.ID),
			SessionYear:       sessionYear,
			Title:             firstNonEmpty(r.LongTitle, r.ShortTitle),
			Status:            r.Status,
			// SponsorID is the UtahLegislatureID of the sponsor legislator.
			// The ingestion job resolves it to a UUID after upserting legislators.
			SponsorID: r.Sponsor,
		})
	}
	return bills, nil
}

// FetchBill retrieves full detail for a single bill.
func (c *Client) FetchBill(ctx context.Context, session, billID string) (*domain.Bill, error) {
	url := fmt.Sprintf("%s/bills/%s/%s/%s", baseURL, session, billID, c.token)

	var r apiBillDetail
	if err := c.getJSON(ctx, url, &r); err != nil {
		return nil, fmt.Errorf("fetch bill %s/%s: %w", session, billID, err)
	}

	bill := &domain.Bill{
		UtahLegislatureID: r.ID,
		BillNumber:        r.ID,
		BillType:          billType(r.ID),
		SessionYear:       sessionToYear(session),
		Title:             firstNonEmpty(r.LongTitle, r.ShortTitle),
		Description:       r.Description,
		Status:            r.Status,
		SponsorID:         r.Sponsor,
		FullTextURL:       r.FullTextURL,
		LastAction:        r.LastAction,
		FiscalNoteURL:     r.FiscalNoteURL,
	}

	if r.LastActionDate != "" {
		t, err := parseDate(r.LastActionDate)
		if err == nil {
			bill.LastActionDate = &t
		}
	}

	return bill, nil
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func (c *Client) getJSON(ctx context.Context, url string, dest any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status %d from %s", resp.StatusCode, url)
	}

	return json.NewDecoder(resp.Body).Decode(dest)
}

// normalizeChamber maps "H" → "house" and "S" → "senate".
func normalizeChamber(c string) string {
	switch strings.ToUpper(c) {
	case "H":
		return "house"
	case "S":
		return "senate"
	default:
		return strings.ToLower(c)
	}
}

// billType extracts the bill type prefix from an ID like "HB0001" → "HB".
func billType(id string) string {
	for i, ch := range id {
		if ch >= '0' && ch <= '9' {
			return id[:i]
		}
	}
	return id
}

// sessionToYear extracts the year from a session string like "2026GS" → 2026.
func sessionToYear(session string) int {
	var year int
	fmt.Sscanf(session, "%d", &year)
	return year
}

// parseDate parses common date formats returned by the API.
func parseDate(s string) (time.Time, error) {
	layouts := []string{
		"2006-01-02",
		time.RFC3339,
	}
	for _, layout := range layouts {
		if t, err := time.Parse(layout, s); err == nil {
			return t, nil
		}
	}
	return time.Time{}, fmt.Errorf("unrecognised date format: %s", s)
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if v != "" {
			return v
		}
	}
	return ""
}
