package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/models"
)

type ProPublicaMember struct {
	ID             string `json:"id"`
	FirstName      string `json:"first_name"`
	LastName       string `json:"last_name"`
	Party          string `json:"party"`
	State          string `json:"state"`
	District       string `json:"district"`
	Phone          string `json:"phone"`
	Office         string `json:"office"`
	Website        string `json:"url"`
	TwitterAccount string `json:"twitter_account"`
	NextElection   string `json:"next_election"`
	InOffice       bool   `json:"in_office"`
	Chamber        string `json:"chamber"`
}

type ProPublicaResponse struct {
	Status  string             `json:"status"`
	Results []ProPublicaMember `json:"results"`
}

func main() {
	// Get required environment variables
	pbDataDir := os.Getenv("PB_DATA_DIR")
	if pbDataDir == "" {
		pbDataDir = "./pb_data"
	}

	apiKey := os.Getenv("PROPUBLICA_API_KEY")
	if apiKey == "" {
		log.Fatal("PROPUBLICA_API_KEY environment variable is required")
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

	repsCollection, err := app.Dao().FindCollectionByNameOrId("representatives")
	if err != nil {
		log.Fatalf("Representatives collection not found: %v", err)
	}

	districtsCollection, err := app.Dao().FindCollectionByNameOrId("house_districts")
	if err != nil {
		log.Fatalf("House districts collection not found: %v", err)
	}

	seatsCollection, err := app.Dao().FindCollectionByNameOrId("senate_seats")
	if err != nil {
		log.Fatalf("Senate seats collection not found: %v", err)
	}

	// Fetch both House and Senate members
	chambers := []string{"house", "senate"}
	for _, chamber := range chambers {
		members, err := fetchMembers(apiKey, chamber)
		if err != nil {
			log.Printf("Error fetching %s members: %v\n", chamber, err)
			continue
		}

		for _, member := range members {
			if !member.InOffice {
				continue
			}

			// Find state by abbreviation
			var stateRecord *models.Record
			err := app.Dao().RecordQuery(statesCollection).
				AndWhere(dbx.HashExp{"abbreviation": member.State}).
				Limit(1).
				One(&stateRecord)
			if err != nil {
				log.Printf("Error finding state %s: %v\n", member.State, err)
				continue
			}

			// Find or create representative
			var repRecord *models.Record
			err = app.Dao().RecordQuery(repsCollection).
				AndWhere(dbx.HashExp{
					"first_name":          member.FirstName,
					"last_name":           member.LastName,
					"representative_type": chamber,
				}).
				Limit(1).
				One(&repRecord)

			if err != nil {
				// Create new representative
				repRecord = models.NewRecord(repsCollection)
			}

			repRecord.Set("first_name", member.FirstName)
			repRecord.Set("last_name", member.LastName)
			repRecord.Set("representative_type", chamber)
			repRecord.Set("party", member.Party)
			repRecord.Set("phone", member.Phone)
			repRecord.Set("website", member.Website)
			repRecord.Set("twitter_handle", member.TwitterAccount)
			repRecord.Set("term_end", member.NextElection+"-01-03")

			if err := app.Dao().SaveRecord(repRecord); err != nil {
				log.Printf("Error saving representative %s %s: %v\n", member.FirstName, member.LastName, err)
				continue
			}

			// Insert or update district/seat
			if chamber == "house" {
				// Find existing district
				var districtRecord *models.Record
				err = app.Dao().RecordQuery(districtsCollection).
					AndWhere(dbx.HashExp{
						"state":           stateRecord.Id,
						"district_number": member.District,
					}).
					Limit(1).
					One(&districtRecord)

				if err != nil {
					districtRecord = models.NewRecord(districtsCollection)
				}

				districtRecord.Set("state", stateRecord.Id)
				districtRecord.Set("district_number", member.District)
				districtRecord.Set("representative", repRecord.Id)

				if err := app.Dao().SaveRecord(districtRecord); err != nil {
					log.Printf("Error saving district for %s %s: %v\n", member.FirstName, member.LastName, err)
					continue
				}
			} else {
				// Senate - determine seat class
				seatClass := determineSeatClass(member.NextElection)

				// Find existing seat
				var seatRecord *models.Record
				err = app.Dao().RecordQuery(seatsCollection).
					AndWhere(dbx.HashExp{
						"state":      stateRecord.Id,
						"seat_class": seatClass,
					}).
					Limit(1).
					One(&seatRecord)

				if err != nil {
					seatRecord = models.NewRecord(seatsCollection)
				}

				seatRecord.Set("state", stateRecord.Id)
				seatRecord.Set("seat_class", seatClass)
				seatRecord.Set("representative", repRecord.Id)

				if err := app.Dao().SaveRecord(seatRecord); err != nil {
					log.Printf("Error saving senate seat for %s %s: %v\n", member.FirstName, member.LastName, err)
					continue
				}
			}

			fmt.Printf("Successfully processed %s member: %s %s\n", chamber, member.FirstName, member.LastName)
		}
	}

	os.Exit(0)
}

func fetchMembers(apiKey string, chamber string) ([]ProPublicaMember, error) {
	client := &http.Client{Timeout: 10 * time.Second}

	url := fmt.Sprintf("https://api.propublica.org/congress/v1/118/%s/members.json", chamber)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Add("X-API-Key", apiKey)

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var response ProPublicaResponse
	if err := json.Unmarshal(body, &response); err != nil {
		return nil, err
	}

	return response.Results, nil
}

func determineSeatClass(nextElection string) string {
	year := nextElection
	switch year {
	case "2024":
		return "1"
	case "2026":
		return "2"
	case "2028":
		return "3"
	default:
		return "1"
	}
}
