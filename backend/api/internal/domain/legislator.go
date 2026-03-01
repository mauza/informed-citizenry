package domain

import "time"

// Legislator represents a Utah state legislator from either chamber.
type Legislator struct {
	ID                string
	Chamber           string // "house" or "senate"
	DistrictNumber    int
	FirstName         string
	LastName          string
	Party             string
	Email             string
	Phone             string
	Website           string
	ImageURL          string
	TermStart         *time.Time
	TermEnd           *time.Time
	UtahLegislatureID string // ID from glen.le.utah.gov
	LegiscanID        int
	OpenStatesID      string
}
