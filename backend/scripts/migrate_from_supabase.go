package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/models"
)

// This is a standalone utility to migrate data from Supabase PostgreSQL to PocketBase
// Usage: Set SUPABASE_DB_URL and PB_DATA_DIR environment variables, then run:
// go run backend/scripts/migrate_from_supabase.go

func main() {
	supabaseURL := os.Getenv("SUPABASE_DB_URL")
	if supabaseURL == "" {
		log.Fatal("SUPABASE_DB_URL environment variable is required")
	}

	pbDataDir := os.Getenv("PB_DATA_DIR")
	if pbDataDir == "" {
		pbDataDir = "./pb_data"
	}

	// Connect to Supabase PostgreSQL
	supabaseConn, err := pgx.Connect(context.Background(), supabaseURL)
	if err != nil {
		log.Fatalf("Unable to connect to Supabase: %v\n", err)
	}
	defer supabaseConn.Close(context.Background())

	// Initialize PocketBase
	app := pocketbase.New()
	app.RootCmd.PersistentFlags().String("dir", pbDataDir, "PocketBase data directory")

	go func() {
		if err := app.Start(); err != nil {
			log.Fatalf("Failed to start PocketBase: %v", err)
		}
	}()

	fmt.Println("Starting migration from Supabase to PocketBase...")

	// Migrate states
	if err := migrateStates(supabaseConn, app); err != nil {
		log.Printf("Error migrating states: %v\n", err)
	}

	// Migrate representatives
	if err := migrateRepresentatives(supabaseConn, app); err != nil {
		log.Printf("Error migrating representatives: %v\n", err)
	}

	// Migrate house districts
	if err := migrateHouseDistricts(supabaseConn, app); err != nil {
		log.Printf("Error migrating house districts: %v\n", err)
	}

	// Migrate senate seats
	if err := migrateSenateSeats(supabaseConn, app); err != nil {
		log.Printf("Error migrating senate seats: %v\n", err)
	}

	// Migrate bills
	if err := migrateBills(supabaseConn, app); err != nil {
		log.Printf("Error migrating bills: %v\n", err)
	}

	// Migrate bill cosponsors
	if err := migrateBillCosponsors(supabaseConn, app); err != nil {
		log.Printf("Error migrating bill cosponsors: %v\n", err)
	}

	// Migrate bill votes
	if err := migrateBillVotes(supabaseConn, app); err != nil {
		log.Printf("Error migrating bill votes: %v\n", err)
	}

	// Migrate bill committees
	if err := migrateBillCommittees(supabaseConn, app); err != nil {
		log.Printf("Error migrating bill committees: %v\n", err)
	}

	// Migrate bill committee assignments
	if err := migrateBillCommitteeAssignments(supabaseConn, app); err != nil {
		log.Printf("Error migrating bill committee assignments: %v\n", err)
	}

	fmt.Println("Migration completed!")
}

func migrateStates(supabaseConn *pgx.Conn, app *pocketbase.PocketBase) error {
	rows, err := supabaseConn.Query(context.Background(), "SELECT id, name, abbreviation, fips_code FROM states")
	if err != nil {
		return err
	}
	defer rows.Close()

	statesCollection, err := app.Dao().FindCollectionByNameOrId("states")
	if err != nil {
		return err
	}

	count := 0
	for rows.Next() {
		var id, name, abbreviation, fipsCode string
		if err := rows.Scan(&id, &name, &abbreviation, &fipsCode); err != nil {
			log.Printf("Error scanning state: %v\n", err)
			continue
		}

		record := models.NewRecord(statesCollection)
		record.SetId(id)
		record.Set("name", name)
		record.Set("abbreviation", abbreviation)
		record.Set("fips_code", fipsCode)

		if err := app.Dao().SaveRecord(record); err != nil {
			log.Printf("Error saving state %s: %v\n", name, err)
			continue
		}
		count++
	}

	fmt.Printf("Migrated %d states\n", count)
	return nil
}

func migrateRepresentatives(supabaseConn *pgx.Conn, app *pocketbase.PocketBase) error {
	rows, err := supabaseConn.Query(context.Background(),
		`SELECT id, first_name, last_name, representative_type, party, email, phone, website, 
		twitter_handle, term_start, term_end FROM representatives`)
	if err != nil {
		return err
	}
	defer rows.Close()

	repsCollection, err := app.Dao().FindCollectionByNameOrId("representatives")
	if err != nil {
		return err
	}

	count := 0
	for rows.Next() {
		var id, firstName, lastName, repType string
		var party, email, phone, website, twitter *string
		var termStart, termEnd *string

		if err := rows.Scan(&id, &firstName, &lastName, &repType, &party, &email, &phone, &website, &twitter, &termStart, &termEnd); err != nil {
			log.Printf("Error scanning representative: %v\n", err)
			continue
		}

		record := models.NewRecord(repsCollection)
		record.SetId(id)
		record.Set("first_name", firstName)
		record.Set("last_name", lastName)
		record.Set("representative_type", repType)
		if party != nil {
			record.Set("party", *party)
		}
		if email != nil {
			record.Set("email", *email)
		}
		if phone != nil {
			record.Set("phone", *phone)
		}
		if website != nil {
			record.Set("website", *website)
		}
		if twitter != nil {
			record.Set("twitter_handle", *twitter)
		}
		if termStart != nil {
			record.Set("term_start", *termStart)
		}
		if termEnd != nil {
			record.Set("term_end", *termEnd)
		}

		if err := app.Dao().SaveRecord(record); err != nil {
			log.Printf("Error saving representative %s %s: %v\n", firstName, lastName, err)
			continue
		}
		count++
	}

	fmt.Printf("Migrated %d representatives\n", count)
	return nil
}

func migrateHouseDistricts(supabaseConn *pgx.Conn, app *pocketbase.PocketBase) error {
	rows, err := supabaseConn.Query(context.Background(),
		`SELECT id, state_id, district_number, representative_id, boundary_geojson, population FROM house_districts`)
	if err != nil {
		return err
	}
	defer rows.Close()

	districtsCollection, err := app.Dao().FindCollectionByNameOrId("house_districts")
	if err != nil {
		return err
	}

	count := 0
	for rows.Next() {
		var id, stateID string
		var districtNumber int
		var repID *string
		var boundaryGeoJSON *string
		var population *int

		if err := rows.Scan(&id, &stateID, &districtNumber, &repID, &boundaryGeoJSON, &population); err != nil {
			log.Printf("Error scanning house district: %v\n", err)
			continue
		}

		record := models.NewRecord(districtsCollection)
		record.SetId(id)
		record.Set("state", stateID)
		record.Set("district_number", districtNumber)
		if repID != nil {
			record.Set("representative", *repID)
		}
		if boundaryGeoJSON != nil {
			record.Set("boundary_geojson", *boundaryGeoJSON)
		}
		if population != nil {
			record.Set("population", *population)
		}

		if err := app.Dao().SaveRecord(record); err != nil {
			log.Printf("Error saving house district: %v\n", err)
			continue
		}
		count++
	}

	fmt.Printf("Migrated %d house districts\n", count)
	return nil
}

func migrateSenateSeats(supabaseConn *pgx.Conn, app *pocketbase.PocketBase) error {
	rows, err := supabaseConn.Query(context.Background(),
		`SELECT id, state_id, seat_class, representative_id FROM senate_seats`)
	if err != nil {
		return err
	}
	defer rows.Close()

	seatsCollection, err := app.Dao().FindCollectionByNameOrId("senate_seats")
	if err != nil {
		return err
	}

	count := 0
	for rows.Next() {
		var id, stateID string
		var seatClass int
		var repID *string

		if err := rows.Scan(&id, &stateID, &seatClass, &repID); err != nil {
			log.Printf("Error scanning senate seat: %v\n", err)
			continue
		}

		record := models.NewRecord(seatsCollection)
		record.SetId(id)
		record.Set("state", stateID)
		record.Set("seat_class", seatClass)
		if repID != nil {
			record.Set("representative", *repID)
		}

		if err := app.Dao().SaveRecord(record); err != nil {
			log.Printf("Error saving senate seat: %v\n", err)
			continue
		}
		count++
	}

	fmt.Printf("Migrated %d senate seats\n", count)
	return nil
}

func migrateBills(supabaseConn *pgx.Conn, app *pocketbase.PocketBase) error {
	rows, err := supabaseConn.Query(context.Background(),
		`SELECT id, bill_type, bill_number, title, description, status, session_year, 
		state_id, primary_sponsor_id, full_text_url, last_action_date, last_action_description,
		fiscal_note_url, effective_date FROM bills`)
	if err != nil {
		return err
	}
	defer rows.Close()

	billsCollection, err := app.Dao().FindCollectionByNameOrId("bills")
	if err != nil {
		return err
	}

	count := 0
	for rows.Next() {
		var id, billType, title, status, stateID string
		var billNumber, sessionYear int
		var description, fullTextURL, lastActionDesc, fiscalNoteURL *string
		var primarySponsorID *string
		var lastActionDate, effectiveDate *string

		if err := rows.Scan(&id, &billType, &billNumber, &title, &description, &status, &sessionYear,
			&stateID, &primarySponsorID, &fullTextURL, &lastActionDate, &lastActionDesc,
			&fiscalNoteURL, &effectiveDate); err != nil {
			log.Printf("Error scanning bill: %v\n", err)
			continue
		}

		record := models.NewRecord(billsCollection)
		record.SetId(id)
		record.Set("bill_type", billType)
		record.Set("bill_number", billNumber)
		record.Set("title", title)
		record.Set("status", status)
		record.Set("session_year", sessionYear)
		record.Set("state", stateID)
		if description != nil {
			record.Set("description", *description)
		}
		if primarySponsorID != nil {
			record.Set("primary_sponsor", *primarySponsorID)
		}
		if fullTextURL != nil {
			record.Set("full_text_url", *fullTextURL)
		}
		if lastActionDate != nil {
			record.Set("last_action_date", *lastActionDate)
		}
		if lastActionDesc != nil {
			record.Set("last_action_description", *lastActionDesc)
		}
		if fiscalNoteURL != nil {
			record.Set("fiscal_note_url", *fiscalNoteURL)
		}
		if effectiveDate != nil {
			record.Set("effective_date", *effectiveDate)
		}

		if err := app.Dao().SaveRecord(record); err != nil {
			log.Printf("Error saving bill: %v\n", err)
			continue
		}
		count++
	}

	fmt.Printf("Migrated %d bills\n", count)
	return nil
}

func migrateBillCosponsors(supabaseConn *pgx.Conn, app *pocketbase.PocketBase) error {
	rows, err := supabaseConn.Query(context.Background(),
		`SELECT bill_id, representative_id FROM bill_cosponsors`)
	if err != nil {
		return err
	}
	defer rows.Close()

	cosponsorsCollection, err := app.Dao().FindCollectionByNameOrId("bill_cosponsors")
	if err != nil {
		return err
	}

	count := 0
	for rows.Next() {
		var billID, repID string

		if err := rows.Scan(&billID, &repID); err != nil {
			log.Printf("Error scanning bill cosponsor: %v\n", err)
			continue
		}

		record := models.NewRecord(cosponsorsCollection)
		record.Set("bill", billID)
		record.Set("representative", repID)

		if err := app.Dao().SaveRecord(record); err != nil {
			log.Printf("Error saving bill cosponsor: %v\n", err)
			continue
		}
		count++
	}

	fmt.Printf("Migrated %d bill cosponsors\n", count)
	return nil
}

func migrateBillVotes(supabaseConn *pgx.Conn, app *pocketbase.PocketBase) error {
	rows, err := supabaseConn.Query(context.Background(),
		`SELECT id, bill_id, representative_id, vote, vote_date, reading_number FROM bill_votes`)
	if err != nil {
		return err
	}
	defer rows.Close()

	votesCollection, err := app.Dao().FindCollectionByNameOrId("bill_votes")
	if err != nil {
		return err
	}

	count := 0
	for rows.Next() {
		var id, billID, repID, vote, voteDate string
		var readingNumber *int

		if err := rows.Scan(&id, &billID, &repID, &vote, &voteDate, &readingNumber); err != nil {
			log.Printf("Error scanning bill vote: %v\n", err)
			continue
		}

		record := models.NewRecord(votesCollection)
		record.SetId(id)
		record.Set("bill", billID)
		record.Set("representative", repID)
		record.Set("vote", vote)
		record.Set("vote_date", voteDate)
		if readingNumber != nil {
			record.Set("reading_number", *readingNumber)
		}

		if err := app.Dao().SaveRecord(record); err != nil {
			log.Printf("Error saving bill vote: %v\n", err)
			continue
		}
		count++
	}

	fmt.Printf("Migrated %d bill votes\n", count)
	return nil
}

func migrateBillCommittees(supabaseConn *pgx.Conn, app *pocketbase.PocketBase) error {
	rows, err := supabaseConn.Query(context.Background(),
		`SELECT id, name, state_id FROM bill_committees`)
	if err != nil {
		return err
	}
	defer rows.Close()

	committeesCollection, err := app.Dao().FindCollectionByNameOrId("bill_committees")
	if err != nil {
		return err
	}

	count := 0
	for rows.Next() {
		var id, name, stateID string

		if err := rows.Scan(&id, &name, &stateID); err != nil {
			log.Printf("Error scanning bill committee: %v\n", err)
			continue
		}

		record := models.NewRecord(committeesCollection)
		record.SetId(id)
		record.Set("name", name)
		record.Set("state", stateID)

		if err := app.Dao().SaveRecord(record); err != nil {
			log.Printf("Error saving bill committee: %v\n", err)
			continue
		}
		count++
	}

	fmt.Printf("Migrated %d bill committees\n", count)
	return nil
}

func migrateBillCommitteeAssignments(supabaseConn *pgx.Conn, app *pocketbase.PocketBase) error {
	rows, err := supabaseConn.Query(context.Background(),
		`SELECT bill_id, committee_id, assignment_date, status FROM bill_committee_assignments`)
	if err != nil {
		return err
	}
	defer rows.Close()

	assignmentsCollection, err := app.Dao().FindCollectionByNameOrId("bill_committee_assignments")
	if err != nil {
		return err
	}

	count := 0
	for rows.Next() {
		var billID, committeeID, assignmentDate string
		var status *string

		if err := rows.Scan(&billID, &committeeID, &assignmentDate, &status); err != nil {
			log.Printf("Error scanning committee assignment: %v\n", err)
			continue
		}

		record := models.NewRecord(assignmentsCollection)
		record.Set("bill", billID)
		record.Set("committee", committeeID)
		record.Set("assignment_date", assignmentDate)
		if status != nil {
			record.Set("status", *status)
		}

		if err := app.Dao().SaveRecord(record); err != nil {
			log.Printf("Error saving committee assignment: %v\n", err)
			continue
		}
		count++
	}

	fmt.Printf("Migrated %d committee assignments\n", count)
	return nil
}
