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
	"github.com/pocketbase/pocketbase/core"
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
	pbDataDir := os.Getenv("PB_DATA_DIR")
	if pbDataDir == "" {
		pbDataDir = "./pb_data"
	}

	apiKey := os.Getenv("PROPUBLICA_API_KEY")
	if apiKey == "" {
		log.Fatal("PROPUBLICA_API_KEY environment variable is required")
	}

	app := pocketbase.New()
	app.RootCmd.PersistentFlags().String("dir", pbDataDir, "PocketBase data directory")

	app.OnServe().BindFunc(func(e *core.ServeEvent) error {
		if err := runJob(app, apiKey); err != nil {
			log.Printf("Job error: %v\n", err)
		}
		os.Exit(0)
		return e.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}

func runJob(app *pocketbase.PocketBase, apiKey string) error {
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

			stateRecord, err := app.FindFirstRecordByFilter("states", "abbreviation = {:abbr}", dbx.Params{"abbr": member.State})
			if err != nil {
				log.Printf("Error finding state %s: %v\n", member.State, err)
				continue
			}

			repRecords, err := app.FindRecordsByFilter(
				"representatives",
				"first_name = {:fn} && last_name = {:ln} && representative_type = {:type}",
				"", 1, 0,
				dbx.Params{"fn": member.FirstName, "ln": member.LastName, "type": chamber},
			)

			var repRecord *core.Record
			if err != nil || len(repRecords) == 0 {
				repsCol, err := app.FindCollectionByNameOrId("representatives")
				if err != nil {
					log.Printf("Error finding representatives collection: %v\n", err)
					continue
				}
				repRecord = core.NewRecord(repsCol)
			} else {
				repRecord = repRecords[0]
			}

			repRecord.Set("first_name", member.FirstName)
			repRecord.Set("last_name", member.LastName)
			repRecord.Set("representative_type", chamber)
			repRecord.Set("party", member.Party)
			repRecord.Set("phone", member.Phone)
			repRecord.Set("website", member.Website)
			repRecord.Set("twitter_handle", member.TwitterAccount)
			repRecord.Set("term_end", member.NextElection+"-01-03")

			if err := app.Save(repRecord); err != nil {
				log.Printf("Error saving representative %s %s: %v\n", member.FirstName, member.LastName, err)
				continue
			}

			if chamber == "house" {
				districtRecords, err := app.FindRecordsByFilter(
					"house_districts",
					"state = {:state} && district_number = {:num}",
					"", 1, 0,
					dbx.Params{"state": stateRecord.Id, "num": member.District},
				)

				var districtRecord *core.Record
				if err != nil || len(districtRecords) == 0 {
					districtsCol, err := app.FindCollectionByNameOrId("house_districts")
					if err != nil {
						log.Printf("Error finding house_districts collection: %v\n", err)
						continue
					}
					districtRecord = core.NewRecord(districtsCol)
				} else {
					districtRecord = districtRecords[0]
				}

				districtRecord.Set("state", stateRecord.Id)
				districtRecord.Set("district_number", member.District)
				districtRecord.Set("representative", repRecord.Id)

				if err := app.Save(districtRecord); err != nil {
					log.Printf("Error saving district for %s %s: %v\n", member.FirstName, member.LastName, err)
					continue
				}
			} else {
				seatClass := determineSeatClass(member.NextElection)
				seatRecords, err := app.FindRecordsByFilter(
					"senate_seats",
					"state = {:state} && seat_class = {:class}",
					"", 1, 0,
					dbx.Params{"state": stateRecord.Id, "class": seatClass},
				)

				var seatRecord *core.Record
				if err != nil || len(seatRecords) == 0 {
					seatsCol, err := app.FindCollectionByNameOrId("senate_seats")
					if err != nil {
						log.Printf("Error finding senate_seats collection: %v\n", err)
						continue
					}
					seatRecord = core.NewRecord(seatsCol)
				} else {
					seatRecord = seatRecords[0]
				}

				seatRecord.Set("state", stateRecord.Id)
				seatRecord.Set("seat_class", seatClass)
				seatRecord.Set("representative", repRecord.Id)

				if err := app.Save(seatRecord); err != nil {
					log.Printf("Error saving senate seat for %s %s: %v\n", member.FirstName, member.LastName, err)
					continue
				}
			}

			fmt.Printf("Successfully processed %s member: %s %s\n", chamber, member.FirstName, member.LastName)
		}
	}
	return nil
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
	switch nextElection {
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
