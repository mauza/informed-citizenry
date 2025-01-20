package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5"
)

type State struct {
	Name         string
	Abbreviation string
	FIPSCode     string
}

var states = []State{
	{"Alabama", "AL", "01"},
	{"Alaska", "AK", "02"},
	{"Arizona", "AZ", "04"},
	{"Arkansas", "AR", "05"},
	{"California", "CA", "06"},
	{"Colorado", "CO", "08"},
	{"Connecticut", "CT", "09"},
	{"Delaware", "DE", "10"},
	{"Florida", "FL", "12"},
	{"Georgia", "GA", "13"},
	{"Hawaii", "HI", "15"},
	{"Idaho", "ID", "16"},
	{"Illinois", "IL", "17"},
	{"Indiana", "IN", "18"},
	{"Iowa", "IA", "19"},
	{"Kansas", "KS", "20"},
	{"Kentucky", "KY", "21"},
	{"Louisiana", "LA", "22"},
	{"Maine", "ME", "23"},
	{"Maryland", "MD", "24"},
	{"Massachusetts", "MA", "25"},
	{"Michigan", "MI", "26"},
	{"Minnesota", "MN", "27"},
	{"Mississippi", "MS", "28"},
	{"Missouri", "MO", "29"},
	{"Montana", "MT", "30"},
	{"Nebraska", "NE", "31"},
	{"Nevada", "NV", "32"},
	{"New Hampshire", "NH", "33"},
	{"New Jersey", "NJ", "34"},
	{"New Mexico", "NM", "35"},
	{"New York", "NY", "36"},
	{"North Carolina", "NC", "37"},
	{"North Dakota", "ND", "38"},
	{"Ohio", "OH", "39"},
	{"Oklahoma", "OK", "40"},
	{"Oregon", "OR", "41"},
	{"Pennsylvania", "PA", "42"},
	{"Rhode Island", "RI", "44"},
	{"South Carolina", "SC", "45"},
	{"South Dakota", "SD", "46"},
	{"Tennessee", "TN", "47"},
	{"Texas", "TX", "48"},
	{"Utah", "UT", "49"},
	{"Vermont", "VT", "50"},
	{"Virginia", "VA", "51"},
	{"Washington", "WA", "53"},
	{"West Virginia", "WV", "54"},
	{"Wisconsin", "WI", "55"},
	{"Wyoming", "WY", "56"},
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

	// Insert states
	for _, state := range states {
		_, err := conn.Exec(context.Background(),
			`INSERT INTO states (name, abbreviation, fips_code)
			 VALUES ($1, $2, $3)
			 ON CONFLICT (abbreviation) DO UPDATE
			 SET name = EXCLUDED.name,
			     fips_code = EXCLUDED.fips_code`,
			state.Name, state.Abbreviation, state.FIPSCode)

		if err != nil {
			log.Printf("Error inserting state %s: %v\n", state.Name, err)
			continue
		}
		fmt.Printf("Inserted/Updated state: %s\n", state.Name)
	}
}
