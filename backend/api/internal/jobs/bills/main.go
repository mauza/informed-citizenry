// Command bills fetches all bills for the current Utah legislative session
// from the official Utah Legislature API and upserts them into the database.
//
// Bills are keyed on (bill_number, session_year). The sponsor is resolved
// by looking up the legislator's utah_legislature_id in the database, so run
// the legislators job first to ensure sponsors are present.
//
// Required environment variables:
//
//	DATABASE_URL             - Supabase Postgres connection string
//	UTAH_LEGISLATURE_TOKEN   - Developer token from le.utah.gov
//
// Optional:
//
//	UTAH_SESSION             - Session string, e.g. "2026GS" (defaults to current year)
//
// Recommended cadence: once per hour during session.
package main

import (
	"context"
	"log/slog"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"

	"api/internal/repository/postgres"
	"api/internal/sources/utah_legislature"
)

func main() {
	ctx := context.Background()
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		logger.Error("DATABASE_URL is required")
		os.Exit(1)
	}

	token := os.Getenv("UTAH_LEGISLATURE_TOKEN")
	if token == "" {
		logger.Error("UTAH_LEGISLATURE_TOKEN is required")
		os.Exit(1)
	}

	session := os.Getenv("UTAH_SESSION")
	if session == "" {
		session = utah_legislature.CurrentSession()
	}

	db, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		logger.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	billRepo := postgres.NewBillRepository(db)
	legislatorRepo := postgres.NewLegislatorRepository(db)
	client := utah_legislature.NewClient(token)

	logger.Info("fetching Utah bills", "session", session)
	bills, err := client.FetchBills(ctx, session)
	if err != nil {
		logger.Error("failed to fetch bills", "session", session, "error", err)
		os.Exit(1)
	}
	logger.Info("fetched bills", "count", len(bills), "session", session)

	// Build a cache of utah_legislature_id → DB UUID for sponsors.
	sponsorCache, err := buildSponsorCache(ctx, legislatorRepo)
	if err != nil {
		logger.Warn("could not build sponsor cache; sponsor links may be missing", "error", err)
	}

	ok, failed := 0, 0
	for _, b := range bills {
		// Resolve the raw utah_legislature_id in SponsorID to a real DB UUID.
		if id, found := sponsorCache[b.SponsorID]; found {
			b.SponsorID = id
		} else {
			b.SponsorID = "" // unknown sponsor; insert without FK
		}

		if err := billRepo.UpsertBill(ctx, b); err != nil {
			logger.Error("failed to upsert bill", "bill", b.BillNumber, "error", err)
			failed++
			continue
		}
		ok++
	}

	logger.Info("bills sync complete", "session", session, "upserted", ok, "failed", failed)
	if failed > 0 {
		os.Exit(1)
	}
}

// buildSponsorCache returns a map of utah_legislature_id → UUID for all
// legislators currently in the database.
func buildSponsorCache(ctx context.Context, repo *postgres.LegislatorRepository) (map[string]string, error) {
	legislators, err := repo.ListLegislators(ctx, "")
	if err != nil {
		return nil, err
	}
	cache := make(map[string]string, len(legislators))
	for _, l := range legislators {
		if l.UtahLegislatureID != "" {
			cache[l.UtahLegislatureID] = l.ID
		}
	}
	return cache, nil
}
