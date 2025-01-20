package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/jackc/pgx/v5"
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
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL environment variable is required")
	}

	apiKey := os.Getenv("PROPUBLICA_API_KEY")
	if apiKey == "" {
		log.Fatal("PROPUBLICA_API_KEY environment variable is required")
	}

	// Connect to database
	conn, err := pgx.Connect(context.Background(), dbURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	defer conn.Close(context.Background())

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

			// Insert representative
			var repID string
			err := conn.QueryRow(context.Background(),
				`INSERT INTO representatives 
				(first_name, last_name, representative_type, party, phone, website, twitter_handle, term_end)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
				ON CONFLICT (first_name, last_name, representative_type) 
				DO UPDATE SET 
					party = EXCLUDED.party,
					phone = EXCLUDED.phone,
					website = EXCLUDED.website,
					twitter_handle = EXCLUDED.twitter_handle,
					term_end = EXCLUDED.term_end
				RETURNING id`,
				member.FirstName,
				member.LastName,
				chamber,
				member.Party,
				member.Phone,
				member.Website,
				member.TwitterAccount,
				member.NextElection+"-01-03", // Term typically ends Jan 3rd
			).Scan(&repID)

			if err != nil {
				log.Printf("Error inserting representative %s %s: %v\n", member.FirstName, member.LastName, err)
				continue
			}

			// Get state ID
			var stateID string
			err = conn.QueryRow(context.Background(),
				"SELECT id FROM states WHERE abbreviation = $1",
				member.State,
			).Scan(&stateID)

			if err != nil {
				log.Printf("Error finding state %s: %v\n", member.State, err)
				continue
			}

			// Insert district or senate seat
			if chamber == "house" {
				_, err = conn.Exec(context.Background(),
					`INSERT INTO house_districts (state_id, district_number, representative_id)
					VALUES ($1, $2, $3)
					ON CONFLICT (state_id, district_number) 
					DO UPDATE SET representative_id = EXCLUDED.representative_id`,
					stateID, member.District, repID,
				)
			} else {
				// For senate, we need to determine the seat class based on next election year
				nextElectionYear := member.NextElection
				seatClass := determineSeatClass(nextElectionYear)

				_, err = conn.Exec(context.Background(),
					`INSERT INTO senate_seats (state_id, seat_class, representative_id)
					VALUES ($1, $2, $3)
					ON CONFLICT (state_id, seat_class) 
					DO UPDATE SET representative_id = EXCLUDED.representative_id`,
					stateID, seatClass, repID,
				)
			}

			if err != nil {
				log.Printf("Error inserting district/seat for %s %s: %v\n", member.FirstName, member.LastName, err)
				continue
			}

			fmt.Printf("Successfully processed %s member: %s %s\n", chamber, member.FirstName, member.LastName)
		}
	}
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

func determineSeatClass(nextElection string) int {
	// Senate seats are divided into three classes
	// Class 1: 2024, 2030, etc.
	// Class 2: 2026, 2032, etc.
	// Class 3: 2022, 2028, etc.
	year := nextElection
	switch year {
	case "2024":
		return 1
	case "2026":
		return 2
	case "2028":
		return 3
	default:
		// If we can't determine, default to class 1
		return 1
	}
}
