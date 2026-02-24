package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
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
	pbDataDir := os.Getenv("PB_DATA_DIR")
	if pbDataDir == "" {
		pbDataDir = "./pb_data"
	}

	app := pocketbase.New()
	app.RootCmd.PersistentFlags().String("dir", pbDataDir, "PocketBase data directory")

	app.OnServe().BindFunc(func(e *core.ServeEvent) error {
		if err := runJob(app); err != nil {
			log.Printf("Job error: %v\n", err)
		}
		os.Exit(0)
		return e.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}

func runJob(app *pocketbase.PocketBase) error {
	scrapers := []StateLegislatureScraper{
		&WashingtonScraper{
			apiKey: os.Getenv("WA_LEGISLATURE_API_KEY"),
		},
		// Add more state scrapers here
	}

	for _, scraper := range scrapers {
		stateAbbr := scraper.GetStateAbbreviation()

		stateRecord, err := app.FindFirstRecordByFilter("states", "abbreviation = {:abbr}", dbx.Params{"abbr": stateAbbr})
		if err != nil {
			log.Printf("Error finding state %s: %v\n", stateAbbr, err)
			continue
		}

		bills, err := scraper.FetchBills(context.Background())
		if err != nil {
			log.Printf("Error fetching bills for state %s: %v\n", stateAbbr, err)
			continue
		}

		for _, bill := range bills {
			var sponsorRecord *core.Record
			if bill.PrimarySponsor != "" {
				sponsorRecords, err := app.FindRecordsByFilter(
					"representatives",
					"first_name ~ {:name} || last_name ~ {:name}",
					"", 1, 0,
					dbx.Params{"name": bill.PrimarySponsor},
				)
				if err == nil && len(sponsorRecords) > 0 {
					sponsorRecord = sponsorRecords[0]
				}
			}

			billRecords, err := app.FindRecordsByFilter(
				"bills",
				"bill_type = {:type} && bill_number = {:num} && session_year = {:year} && state = {:state}",
				"", 1, 0,
				dbx.Params{
					"type":  bill.BillType,
					"num":   bill.BillNumber,
					"year":  bill.SessionYear,
					"state": stateRecord.Id,
				},
			)

			var billRecord *core.Record
			if err != nil || len(billRecords) == 0 {
				billsCol, err := app.FindCollectionByNameOrId("bills")
				if err != nil {
					log.Printf("Error finding bills collection: %v\n", err)
					continue
				}
				billRecord = core.NewRecord(billsCol)
			} else {
				billRecord = billRecords[0]
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

			if err := app.Save(billRecord); err != nil {
				log.Printf("Error saving bill %s-%d: %v\n", bill.BillType, bill.BillNumber, err)
				continue
			}

			fmt.Printf("Successfully processed bill %s-%d for state %s\n",
				bill.BillType, bill.BillNumber, stateAbbr)
		}
	}
	return nil
}
