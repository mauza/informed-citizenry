package pocketbase

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/pocketbase/pocketbase/core"

	"api/internal/domain"
)

// LegislatorRepository is the PocketBase implementation of repository.LegislatorRepository.
type LegislatorRepository struct {
	app core.App
}

// NewLegislatorRepository creates a new PocketBase-backed LegislatorRepository.
func NewLegislatorRepository(app core.App) *LegislatorRepository {
	return &LegislatorRepository{app: app}
}

const legislatorCollection = "legislators"

// ListLegislators returns all legislators, optionally filtered by chamber.
func (r *LegislatorRepository) ListLegislators(ctx context.Context, chamber string) ([]domain.Legislator, error) {
	var records []*core.Record
	var err error

	if chamber != "" {
		records, err = r.app.FindRecordsByFilter(
			legislatorCollection,
			"chamber = {:chamber}",
			"chamber, district_number",
			0,
			0,
			map[string]any{"chamber": chamber},
		)
	} else {
		records, err = r.app.FindAllRecords(legislatorCollection)
	}

	if err != nil {
		return nil, fmt.Errorf("list legislators: %w", err)
	}

	legislators := make([]domain.Legislator, 0, len(records))
	for _, rec := range records {
		legislators = append(legislators, recordToLegislator(rec))
	}
	return legislators, nil
}

// GetLegislator returns a single legislator by its ID.
func (r *LegislatorRepository) GetLegislator(ctx context.Context, id string) (*domain.Legislator, error) {
	rec, err := r.app.FindRecordById(legislatorCollection, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get legislator: %w", err)
	}
	l := recordToLegislator(rec)
	return &l, nil
}

// GetLegislatorByDistrict returns the legislator for a given chamber and district number.
func (r *LegislatorRepository) GetLegislatorByDistrict(ctx context.Context, chamber string, districtNumber int) (*domain.Legislator, error) {
	records, err := r.app.FindRecordsByFilter(
		legislatorCollection,
		"chamber = {:chamber} && district_number = {:district_number}",
		"",
		1,
		0,
		map[string]any{"chamber": chamber, "district_number": districtNumber},
	)
	if err != nil {
		return nil, fmt.Errorf("get legislator by district: %w", err)
	}
	if len(records) == 0 {
		return nil, nil
	}
	l := recordToLegislator(records[0])
	return &l, nil
}

// UpsertLegislator inserts or updates a legislator record keyed on (chamber, district_number).
func (r *LegislatorRepository) UpsertLegislator(ctx context.Context, l domain.Legislator) error {
	// Check if legislator exists by chamber and district
	records, err := r.app.FindRecordsByFilter(
		legislatorCollection,
		"chamber = {:chamber} && district_number = {:district_number}",
		"",
		1,
		0,
		map[string]any{"chamber": l.Chamber, "district_number": l.DistrictNumber},
	)
	if err != nil {
		return fmt.Errorf("find existing legislator: %w", err)
	}

	var rec *core.Record
	if len(records) > 0 {
		rec = records[0]
	} else {
		collection, err := r.app.FindCollectionByNameOrId(legislatorCollection)
		if err != nil {
			return fmt.Errorf("find collection: %w", err)
		}
		rec = core.NewRecord(collection)
	}

	// Set fields
	rec.Set("chamber", l.Chamber)
	rec.Set("district_number", l.DistrictNumber)
	rec.Set("first_name", l.FirstName)
	rec.Set("last_name", l.LastName)
	rec.Set("party", l.Party)
	rec.Set("email", l.Email)
	rec.Set("phone", l.Phone)
	rec.Set("website", l.Website)
	rec.Set("image_url", l.ImageURL)
	rec.Set("utah_legislature_id", l.UtahLegislatureID)
	rec.Set("legiscan_id", l.LegiscanID)
	rec.Set("openstates_id", l.OpenStatesID)

	if err := r.app.Save(rec); err != nil {
		return fmt.Errorf("upsert legislator %s %s: %w", l.FirstName, l.LastName, err)
	}
	return nil
}

// recordToLegislator converts a PocketBase record to a domain.Legislator.
func recordToLegislator(rec *core.Record) domain.Legislator {
	return domain.Legislator{
		ID:                rec.Id,
		Chamber:           rec.GetString("chamber"),
		DistrictNumber:    rec.GetInt("district_number"),
		FirstName:         rec.GetString("first_name"),
		LastName:          rec.GetString("last_name"),
		Party:             rec.GetString("party"),
		Email:             rec.GetString("email"),
		Phone:             rec.GetString("phone"),
		Website:           rec.GetString("website"),
		ImageURL:          rec.GetString("image_url"),
		UtahLegislatureID: rec.GetString("utah_legislature_id"),
		LegiscanID:        rec.GetInt("legiscan_id"),
		OpenStatesID:      rec.GetString("openstates_id"),
	}
}
