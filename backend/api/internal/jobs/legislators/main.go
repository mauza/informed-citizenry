// Command legislators fetches all current Utah state legislators from the
// official Utah Legislature API and upserts them into the database.
//
// Required environment variables:
//
//	DATABASE_URL             - Supabase Postgres connection string
//	UTAH_LEGISLATURE_TOKEN   - Developer token from le.utah.gov
//
// Recommended cadence: once per day.
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

	db, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		logger.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	repo := postgres.NewLegislatorRepository(db)
	client := utah_legislature.NewClient(token)

	logger.Info("fetching Utah legislators")
	legislators, err := client.FetchLegislators(ctx)
	if err != nil {
		logger.Error("failed to fetch legislators", "error", err)
		os.Exit(1)
	}
	logger.Info("fetched legislators", "count", len(legislators))

	ok, failed := 0, 0
	for _, l := range legislators {
		if err := repo.UpsertLegislator(ctx, l); err != nil {
			logger.Error("failed to upsert legislator",
				"name", l.FirstName+" "+l.LastName,
				"error", err,
			)
			failed++
			continue
		}
		ok++
	}

	logger.Info("legislators sync complete", "upserted", ok, "failed", failed)
	if failed > 0 {
		os.Exit(1)
	}
}
