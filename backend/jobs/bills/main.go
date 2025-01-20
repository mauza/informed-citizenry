package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5"
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
	// Get database URL from environment variable
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL environment variable is required")
	}

	// Connect to the database
	conn, err := pgx.Connect(context.Background(), dbURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	defer conn.Close(context.Background())

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

		// Get state ID
		var stateID string
		err := conn.QueryRow(context.Background(),
			"SELECT id FROM states WHERE abbreviation = $1",
			stateAbbr,
		).Scan(&stateID)

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
			// Set the state ID from our database
			bill.StateID = stateID

			// Insert the bill
			_, err := conn.Exec(context.Background(),
				`INSERT INTO bills 
				(bill_type, bill_number, title, description, status, session_year,
				state_id, full_text_url, last_action_date, last_action_description,
				fiscal_note_url, effective_date)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
				ON CONFLICT (bill_type, bill_number, session_year, state_id)
				DO UPDATE SET
					title = EXCLUDED.title,
					description = EXCLUDED.description,
					status = EXCLUDED.status,
					full_text_url = EXCLUDED.full_text_url,
					last_action_date = EXCLUDED.last_action_date,
					last_action_description = EXCLUDED.last_action_description,
					fiscal_note_url = EXCLUDED.fiscal_note_url,
					effective_date = EXCLUDED.effective_date`,
				bill.BillType, bill.BillNumber, bill.Title, bill.Description,
				bill.Status, bill.SessionYear, bill.StateID, bill.FullTextURL,
				bill.LastActionDate, bill.LastAction, bill.FiscalNoteURL,
				bill.EffectiveDate,
			)

			if err != nil {
				log.Printf("Error inserting bill %s-%d: %v\n", bill.BillType, bill.BillNumber, err)
				continue
			}

			fmt.Printf("Successfully processed bill %s-%d for state %s\n",
				bill.BillType, bill.BillNumber, stateAbbr)
		}
	}
}
