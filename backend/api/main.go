package main

import (
	"log"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"

	"api/internal/collections"
	"api/internal/migrations"
)

func main() {
	app := pocketbase.New()

	app.OnBeforeServe().Add(func(e *core.ServeEvent) error {
		// Setup collections on first run
		if err := collections.SetupCollections(app); err != nil {
			return err
		}

		// Seed states if needed
		if err := migrations.SeedStates(app); err != nil {
			return err
		}

		// Custom API routes can be registered here
		// e.Router.GET("/api/custom", customHandler)

		return nil
	})

	// Start PocketBase with default settings
	// This will serve on port 8090 by default
	// Admin UI available at /_/
	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}
