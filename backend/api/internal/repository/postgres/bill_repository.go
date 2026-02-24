package postgres

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"api/internal/domain"
	"api/internal/repository"
)

// BillRepository is the Postgres implementation of repository.BillRepository.
type BillRepository struct {
	db *pgxpool.Pool
}

// NewBillRepository creates a new Postgres-backed BillRepository.
func NewBillRepository(db *pgxpool.Pool) *BillRepository {
	return &BillRepository{db: db}
}

// ListBills returns bills filtered by the given criteria.
func (r *BillRepository) ListBills(ctx context.Context, f repository.BillFilters) ([]domain.Bill, error) {
	where := []string{}
	args := []any{}
	argN := 1

	if f.SessionYear > 0 {
		where = append(where, fmt.Sprintf("b.session_year = $%d", argN))
		args = append(args, f.SessionYear)
		argN++
	}
	if f.Status != "" {
		where = append(where, fmt.Sprintf("b.status = $%d", argN))
		args = append(args, f.Status)
		argN++
	}
	if f.SponsorID != "" {
		where = append(where, fmt.Sprintf("b.sponsor_id = $%d", argN))
		args = append(args, f.SponsorID)
		argN++
	}

	clause := ""
	if len(where) > 0 {
		clause = "WHERE " + strings.Join(where, " AND ")
	}

	pageSize := f.PageSize
	if pageSize <= 0 {
		pageSize = 50
	}
	page := f.Page
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * pageSize

	query := fmt.Sprintf(`
		SELECT
			b.id, b.bill_number, b.bill_type, b.session_year,
			b.title, b.description, b.status,
			b.full_text_url, b.last_action, b.last_action_date,
			b.fiscal_note_url, b.utah_legislature_id, b.legiscan_id,
			l.id, l.chamber, l.district_number, l.first_name, l.last_name,
			l.party, l.email, l.phone, l.website, l.image_url,
			l.utah_legislature_id, l.legiscan_id, l.openstates_id
		FROM utah_bills b
		LEFT JOIN utah_legislators l ON b.sponsor_id = l.id
		%s
		ORDER BY b.session_year DESC, b.bill_number
		LIMIT $%d OFFSET $%d`,
		clause, argN, argN+1,
	)
	args = append(args, pageSize, offset)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list bills: %w", err)
	}
	defer rows.Close()

	var bills []domain.Bill
	for rows.Next() {
		bill, err := scanBillWithSponsor(rows)
		if err != nil {
			return nil, fmt.Errorf("scan bill: %w", err)
		}
		bills = append(bills, *bill)
	}
	return bills, rows.Err()
}

// GetBill returns a single bill by its UUID, with the sponsor populated.
func (r *BillRepository) GetBill(ctx context.Context, id string) (*domain.Bill, error) {
	row := r.db.QueryRow(ctx, `
		SELECT
			b.id, b.bill_number, b.bill_type, b.session_year,
			b.title, b.description, b.status,
			b.full_text_url, b.last_action, b.last_action_date,
			b.fiscal_note_url, b.utah_legislature_id, b.legiscan_id,
			l.id, l.chamber, l.district_number, l.first_name, l.last_name,
			l.party, l.email, l.phone, l.website, l.image_url,
			l.utah_legislature_id, l.legiscan_id, l.openstates_id
		FROM utah_bills b
		LEFT JOIN utah_legislators l ON b.sponsor_id = l.id
		WHERE b.id = $1`,
		id,
	)
	bill, err := scanBillWithSponsor(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return bill, err
}

// UpsertBill inserts or updates a bill record keyed on (bill_number, session_year).
func (r *BillRepository) UpsertBill(ctx context.Context, b domain.Bill) error {
	// Resolve sponsor UUID from the legislature ID if provided.
	var sponsorID *string
	if b.SponsorID != "" {
		sponsorID = &b.SponsorID
	}

	_, err := r.db.Exec(ctx, `
		INSERT INTO utah_bills
			(bill_number, bill_type, session_year, title, description, status,
			 sponsor_id, full_text_url, last_action, last_action_date,
			 fiscal_note_url, utah_legislature_id, legiscan_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		ON CONFLICT (bill_number, session_year) DO UPDATE SET
			bill_type           = EXCLUDED.bill_type,
			title               = EXCLUDED.title,
			description         = EXCLUDED.description,
			status              = EXCLUDED.status,
			sponsor_id          = EXCLUDED.sponsor_id,
			full_text_url       = EXCLUDED.full_text_url,
			last_action         = EXCLUDED.last_action,
			last_action_date    = EXCLUDED.last_action_date,
			fiscal_note_url     = EXCLUDED.fiscal_note_url,
			utah_legislature_id = EXCLUDED.utah_legislature_id,
			legiscan_id         = EXCLUDED.legiscan_id,
			updated_at          = NOW()`,
		b.BillNumber, b.BillType, b.SessionYear, b.Title, b.Description, b.Status,
		sponsorID, b.FullTextURL, b.LastAction, b.LastActionDate,
		b.FiscalNoteURL, b.UtahLegislatureID, nullableInt(b.LegiscanID),
	)
	if err != nil {
		return fmt.Errorf("upsert bill %s: %w", b.BillNumber, err)
	}
	return nil
}

// scanBillWithSponsor scans a row that joins utah_bills with utah_legislators.
func scanBillWithSponsor(row pgx.Row) (*domain.Bill, error) {
	var b domain.Bill
	var l domain.Legislator
	var sponsorID, sponsorChamber, sponsorFirstName, sponsorLastName *string
	var sponsorDistrict *int
	var sponsorParty, sponsorEmail, sponsorPhone, sponsorWebsite, sponsorImageURL *string
	var sponsorULID, sponsorOpenstatesID *string
	var sponsorLegiscanID *int

	err := row.Scan(
		&b.ID, &b.BillNumber, &b.BillType, &b.SessionYear,
		&b.Title, &b.Description, &b.Status,
		&b.FullTextURL, &b.LastAction, &b.LastActionDate,
		&b.FiscalNoteURL, &b.UtahLegislatureID, &b.LegiscanID,
		&sponsorID, &sponsorChamber, &sponsorDistrict, &sponsorFirstName, &sponsorLastName,
		&sponsorParty, &sponsorEmail, &sponsorPhone, &sponsorWebsite, &sponsorImageURL,
		&sponsorULID, &sponsorLegiscanID, &sponsorOpenstatesID,
	)
	if err != nil {
		return nil, err
	}

	if sponsorID != nil {
		l.ID = derefString(sponsorID)
		l.Chamber = derefString(sponsorChamber)
		l.DistrictNumber = derefInt(sponsorDistrict)
		l.FirstName = derefString(sponsorFirstName)
		l.LastName = derefString(sponsorLastName)
		l.Party = derefString(sponsorParty)
		l.Email = derefString(sponsorEmail)
		l.Phone = derefString(sponsorPhone)
		l.Website = derefString(sponsorWebsite)
		l.ImageURL = derefString(sponsorImageURL)
		l.UtahLegislatureID = derefString(sponsorULID)
		l.LegiscanID = derefInt(sponsorLegiscanID)
		l.OpenStatesID = derefString(sponsorOpenstatesID)
		b.Sponsor = &l
		b.SponsorID = l.ID
	}

	return &b, nil
}

func nullableInt(v int) *int {
	if v == 0 {
		return nil
	}
	return &v
}

func derefString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func derefInt(i *int) int {
	if i == nil {
		return 0
	}
	return *i
}
