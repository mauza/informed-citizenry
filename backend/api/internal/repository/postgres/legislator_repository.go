package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"api/internal/domain"
)

// LegislatorRepository is the Postgres implementation of repository.LegislatorRepository.
type LegislatorRepository struct {
	db *pgxpool.Pool
}

// NewLegislatorRepository creates a new Postgres-backed LegislatorRepository.
func NewLegislatorRepository(db *pgxpool.Pool) *LegislatorRepository {
	return &LegislatorRepository{db: db}
}

const legislatorColumns = `
	id, chamber, district_number,
	first_name, last_name, party,
	email, phone, website, image_url,
	utah_legislature_id, legiscan_id, openstates_id`

func scanLegislator(row pgx.Row) (*domain.Legislator, error) {
	var l domain.Legislator
	err := row.Scan(
		&l.ID, &l.Chamber, &l.DistrictNumber,
		&l.FirstName, &l.LastName, &l.Party,
		&l.Email, &l.Phone, &l.Website, &l.ImageURL,
		&l.UtahLegislatureID, &l.LegiscanID, &l.OpenStatesID,
	)
	if err != nil {
		return nil, err
	}
	return &l, nil
}

// ListLegislators returns all legislators, optionally filtered by chamber.
func (r *LegislatorRepository) ListLegislators(ctx context.Context, chamber string) ([]domain.Legislator, error) {
	query := fmt.Sprintf(`SELECT %s FROM utah_legislators`, legislatorColumns)
	args := []any{}

	if chamber != "" {
		query += " WHERE chamber = $1"
		args = append(args, chamber)
	}

	query += " ORDER BY chamber, district_number"

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list legislators: %w", err)
	}
	defer rows.Close()

	var legislators []domain.Legislator
	for rows.Next() {
		l, err := scanLegislator(rows)
		if err != nil {
			return nil, fmt.Errorf("scan legislator: %w", err)
		}
		legislators = append(legislators, *l)
	}
	return legislators, rows.Err()
}

// GetLegislator returns a single legislator by its UUID.
func (r *LegislatorRepository) GetLegislator(ctx context.Context, id string) (*domain.Legislator, error) {
	query := fmt.Sprintf(`SELECT %s FROM utah_legislators WHERE id = $1`, legislatorColumns)
	l, err := scanLegislator(r.db.QueryRow(ctx, query, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return l, err
}

// GetLegislatorByDistrict returns the legislator for a given chamber and district number.
func (r *LegislatorRepository) GetLegislatorByDistrict(ctx context.Context, chamber string, districtNumber int) (*domain.Legislator, error) {
	query := fmt.Sprintf(
		`SELECT %s FROM utah_legislators WHERE chamber = $1 AND district_number = $2`,
		legislatorColumns,
	)
	l, err := scanLegislator(r.db.QueryRow(ctx, query, chamber, districtNumber))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return l, err
}

// UpsertLegislator inserts or updates a legislator record keyed on (chamber, district_number).
func (r *LegislatorRepository) UpsertLegislator(ctx context.Context, l domain.Legislator) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO utah_legislators
			(chamber, district_number, first_name, last_name, party,
			 email, phone, website, image_url, utah_legislature_id, legiscan_id, openstates_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		ON CONFLICT (chamber, district_number) DO UPDATE SET
			first_name          = EXCLUDED.first_name,
			last_name           = EXCLUDED.last_name,
			party               = EXCLUDED.party,
			email               = EXCLUDED.email,
			phone               = EXCLUDED.phone,
			website             = EXCLUDED.website,
			image_url           = EXCLUDED.image_url,
			utah_legislature_id = EXCLUDED.utah_legislature_id,
			legiscan_id         = EXCLUDED.legiscan_id,
			openstates_id       = EXCLUDED.openstates_id,
			updated_at          = NOW()`,
		l.Chamber, l.DistrictNumber, l.FirstName, l.LastName, l.Party,
		l.Email, l.Phone, l.Website, l.ImageURL, l.UtahLegislatureID, l.LegiscanID, l.OpenStatesID,
	)
	if err != nil {
		return fmt.Errorf("upsert legislator %s %s: %w", l.FirstName, l.LastName, err)
	}
	return nil
}
