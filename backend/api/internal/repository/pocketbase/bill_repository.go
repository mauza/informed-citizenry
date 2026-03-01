package pocketbase

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/pocketbase/pocketbase/core"

	"api/internal/domain"
	"api/internal/repository"
)

// BillRepository is the PocketBase implementation of repository.BillRepository.
type BillRepository struct {
	app core.App
}

// NewBillRepository creates a new PocketBase-backed BillRepository.
func NewBillRepository(app core.App) *BillRepository {
	return &BillRepository{app: app}
}

const billCollection = "bills"

// ListBills returns bills filtered by the given criteria.
func (r *BillRepository) ListBills(ctx context.Context, f repository.BillFilters) ([]domain.Bill, error) {
	filterParts := []string{}
	params := map[string]any{}

	if f.SessionYear > 0 {
		filterParts = append(filterParts, "session_year = {:session_year}")
		params["session_year"] = f.SessionYear
	}
	if f.Status != "" {
		filterParts = append(filterParts, "status = {:status}")
		params["status"] = f.Status
	}
	if f.SponsorID != "" {
		filterParts = append(filterParts, "sponsor = {:sponsor}")
		params["sponsor"] = f.SponsorID
	}

	filter := ""
	if len(filterParts) > 0 {
		filter = strings.Join(filterParts, " && ")
	}

	pageSize := f.PageSize
	if pageSize <= 0 {
		pageSize = 50
	}
	page := f.Page
	if page <= 0 {
		page = 1
	}

	records, err := r.app.FindRecordsByFilter(
		billCollection,
		filter,
		"-session_year, bill_number",
		page,
		pageSize,
		params,
	)
	if err != nil {
		return nil, fmt.Errorf("list bills: %w", err)
	}

	bills := make([]domain.Bill, 0, len(records))
	for _, rec := range records {
		bill, err := r.recordToBill(rec)
		if err != nil {
			return nil, fmt.Errorf("convert record to bill: %w", err)
		}
		bills = append(bills, *bill)
	}
	return bills, nil
}

// GetBill returns a single bill by its ID, with the sponsor populated.
func (r *BillRepository) GetBill(ctx context.Context, id string) (*domain.Bill, error) {
	rec, err := r.app.FindRecordById(billCollection, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get bill: %w", err)
	}
	return r.recordToBill(rec)
}

// UpsertBill inserts or updates a bill record keyed on (bill_number, session_year).
func (r *BillRepository) UpsertBill(ctx context.Context, b domain.Bill) error {
	// Check if bill exists by bill_number and session_year
	records, err := r.app.FindRecordsByFilter(
		billCollection,
		"bill_number = {:bill_number} && session_year = {:session_year}",
		"",
		1,
		0,
		map[string]any{"bill_number": b.BillNumber, "session_year": b.SessionYear},
	)
	if err != nil {
		return fmt.Errorf("find existing bill: %w", err)
	}

	var rec *core.Record
	if len(records) > 0 {
		rec = records[0]
	} else {
		collection, err := r.app.FindCollectionByNameOrId(billCollection)
		if err != nil {
			return fmt.Errorf("find collection: %w", err)
		}
		rec = core.NewRecord(collection)
	}

	// Set fields
	rec.Set("bill_number", b.BillNumber)
	rec.Set("bill_type", b.BillType)
	rec.Set("session_year", b.SessionYear)
	rec.Set("title", b.Title)
	rec.Set("description", b.Description)
	rec.Set("status", b.Status)
	if b.SponsorID != "" {
		rec.Set("sponsor", b.SponsorID)
	}
	rec.Set("full_text_url", b.FullTextURL)
	rec.Set("last_action", b.LastAction)
	if b.LastActionDate != nil {
		rec.Set("last_action_date", b.LastActionDate.Format(time.RFC3339))
	}
	rec.Set("fiscal_note_url", b.FiscalNoteURL)
	if b.EffectiveDate != nil {
		rec.Set("effective_date", b.EffectiveDate.Format(time.RFC3339))
	}
	rec.Set("utah_legislature_id", b.UtahLegislatureID)
	rec.Set("legiscan_id", b.LegiscanID)

	if err := r.app.Save(rec); err != nil {
		return fmt.Errorf("upsert bill %s: %w", b.BillNumber, err)
	}
	return nil
}

// recordToBill converts a PocketBase record to a domain.Bill with sponsor populated.
func (r *BillRepository) recordToBill(rec *core.Record) (*domain.Bill, error) {
	bill := domain.Bill{
		ID:                rec.Id,
		BillNumber:        rec.GetString("bill_number"),
		BillType:          rec.GetString("bill_type"),
		SessionYear:       rec.GetInt("session_year"),
		Title:             rec.GetString("title"),
		Description:       rec.GetString("description"),
		Status:            rec.GetString("status"),
		FullTextURL:       rec.GetString("full_text_url"),
		LastAction:        rec.GetString("last_action"),
		FiscalNoteURL:     rec.GetString("fiscal_note_url"),
		UtahLegislatureID: rec.GetString("utah_legislature_id"),
		LegiscanID:        rec.GetInt("legiscan_id"),
	}

	// Handle date fields
	if lastActionDateStr := rec.GetString("last_action_date"); lastActionDateStr != "" {
		if t, err := time.Parse(time.RFC3339, lastActionDateStr); err == nil {
			bill.LastActionDate = &t
		}
	}
	if effectiveDateStr := rec.GetString("effective_date"); effectiveDateStr != "" {
		if t, err := time.Parse(time.RFC3339, effectiveDateStr); err == nil {
			bill.EffectiveDate = &t
		}
	}

	// Populate sponsor if present
	sponsorID := rec.GetString("sponsor")
	if sponsorID != "" {
		sponsorRec, err := r.app.FindRecordById(legislatorCollection, sponsorID)
		if err == nil {
			l := recordToLegislator(sponsorRec)
			bill.Sponsor = &l
			bill.SponsorID = l.ID
		}
	}

	return &bill, nil
}
