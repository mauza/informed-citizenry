// Command legislators fetches all current Utah state legislators from the
// official Utah Legislature API and upserts them into PocketBase.
//
// Required environment variables:
//
//	POCKETBASE_DATA_DIR      - path to PocketBase data directory (default: ./pb_data)
//	UTAH_LEGISLATURE_TOKEN   - Developer token from le.utah.gov
//
// Recommended cadence: once per day.
package main

import (
	"context"
	"log/slog"
	"os"

	pocketbaseSDK "github.com/pocketbase/pocketbase"

	pbrepo "api/internal/repository/pocketbase"
	"api/internal/sources/utah_legislature"
)

func main() {
	ctx := context.Background()
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	token := os.Getenv("UTAH_LEGISLATURE_TOKEN")
	if token == "" {
		logger.Error("UTAH_LEGISLATURE_TOKEN is required")
		os.Exit(1)
	}

	dataDir := os.Getenv("POCKETBASE_DATA_DIR")
	if dataDir == "" {
		dataDir = "./pb_data"
	}

	app := pocketbaseSDK.NewWithConfig(pocketbaseSDK.Config{
		DefaultDataDir: dataDir,
	})
	if err := app.Bootstrap(); err != nil {
		logger.Error("failed to bootstrap pocketbase", "error", err)
		os.Exit(1)
	}
	defer app.ResetBootstrapState()

	repo := pbrepo.NewLegislatorRepository(app)
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
