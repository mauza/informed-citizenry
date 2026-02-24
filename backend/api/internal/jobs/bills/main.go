package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/models"
)

// BillInfo represents the common bill information across different states
type BillInfo struct {
	BillType       string
	BillNumber     int
	Title          string
	Description    string
	Status         string
	SessionYear    int
	StateID        string
	PrimarySponsor string
	FullTextURL    string
	LastActionDate time.Time
	LastAction     string
	FiscalNoteURL  string
	EffectiveDate  time.Time
}

// StateLegislatureScraper interface defines methods that each state's scraper must implement
type StateLegislatureScraper interface {
	FetchBills(ctx context.Context) ([]BillInfo, error)
	GetStateAbbreviation() string
}

// Example implementation for one state (e.g., Washington)
type WashingtonScraper struct {
	apiKey string
}

func (w *WashingtonScraper) GetStateAbbreviation() string {
	return "WA"
}

func (w *WashingtonScraper) FetchBills(ctx context.Context) ([]BillInfo, error) {
	// TODO: Implement Washington-specific scraping logic
	// This would use the Washington State Legislature API
	// https://wslwebservices.leg.wa.gov/
	return nil, fmt.Errorf("not implemented")
}

func main() {
	// Get PocketBase data directory
	pbDataDir := os.Getenv("PB_DATA_DIR")
	if pbDataDir == "" {
		pbDataDir = "./pb_data"
	}

	// Initialize PocketBase
	app := pocketbase.New()

	// Set data directory
	app.RootCmd.PersistentFlags().String("dir", pbDataDir, "PocketBase data directory")

	// Start PocketBase briefly to initialize the DAO
	go func() {
		if err := app.Start(); err != nil {
			log.Fatalf("Failed to start PocketBase: %v", err)
		}
	}()

	// Wait a moment for initialization
	time.Sleep(1 * time.Second)

	// Get collections
	statesCollection, err := app.Dao().FindCollectionByNameOrId("states")
	if err != nil {
		log.Fatalf("States collection not found: %v", err)
	}

	billsCollection, err := app.Dao().FindCollectionByNameOrId("bills")
	if err != nil {
		log.Fatalf("Bills collection not found: %v", err)
	}

	repsCollection, err := app.Dao().FindCollectionByNameOrId("representatives")
	if err != nil {
		log.Fatalf("Representatives collection not found: %v", err)
	}

	// Create a slice of scrapers for different states
	scrapers := []StateLegislatureScraper{
		&WashingtonScraper{
			apiKey: os.Getenv("WA_LEGISLATURE_API_KEY"),
		},
		// Add more state scrapers here
	}

	// Process each state
	for _, scraper := range scrapers {
		stateAbbr := scraper.GetStateAbbreviation()

		// Get state record
		var stateRecord *models.Record
		err := app.Dao().RecordQuery(statesCollection).
			AndWhere(dbx.HashExp{"abbreviation": stateAbbr}).
			Limit(1).
			One(&stateRecord)

		if err != nil {
			log.Printf("Error finding state %s: %v\n", stateAbbr, err)
			continue
		}

		// Fetch bills for the state
		bills, err := scraper.FetchBills(context.Background())
		if err != nil {
			log.Printf("Error fetching bills for state %s: %v\n", stateAbbr, err)
			continue
		}

		// Process each bill
		for _, bill := range bills {
			// Find primary sponsor if provided
			var sponsorRecord *models.Record
			if bill.PrimarySponsor != "" {
				// This is a simplified lookup - you may need to adjust based on how sponsors are named
				err = app.Dao().RecordQuery(repsCollection).
					AndWhere(dbx.Like("first_name", bill.PrimarySponsor)).
					OrWhere(dbx.Like("last_name", bill.PrimarySponsor)).
					Limit(1).
					One(&sponsorRecord)
				if err != nil {
					sponsorRecord = nil
				}
			}

			// Find existing bill
			var billRecord *models.Record
			err = app.Dao().RecordQuery(billsCollection).
				AndWhere(dbx.HashExp{
					"bill_type":    bill.BillType,
					"bill_number":  bill.BillNumber,
					"session_year": bill.SessionYear,
					"state":        stateRecord.Id,
				}).
				Limit(1).
				One(&billRecord)

			if err != nil {
				billRecord = models.NewRecord(billsCollection)
			}

			billRecord.Set("bill_type", bill.BillType)
			billRecord.Set("bill_number", bill.BillNumber)
			billRecord.Set("title", bill.Title)
			billRecord.Set("description", bill.Description)
			billRecord.Set("status", bill.Status)
			billRecord.Set("session_year", bill.SessionYear)
			billRecord.Set("state", stateRecord.Id)
			billRecord.Set("full_text_url", bill.FullTextURL)
			billRecord.Set("last_action_date", bill.LastActionDate)
			billRecord.Set("last_action_description", bill.LastAction)
			billRecord.Set("fiscal_note_url", bill.FiscalNoteURL)
			billRecord.Set("effective_date", bill.EffectiveDate)

			if sponsorRecord != nil {
				billRecord.Set("primary_sponsor", sponsorRecord.Id)
			}

			if err := app.Dao().SaveRecord(billRecord); err != nil {
				log.Printf("Error saving bill %s-%d: %v\n", bill.BillType, bill.BillNumber, err)
				continue
			}

			fmt.Printf("Successfully processed bill %s-%d for state %s\n",
				bill.BillType, bill.BillNumber, stateAbbr)
		}
	}

	os.Exit(0)
}
