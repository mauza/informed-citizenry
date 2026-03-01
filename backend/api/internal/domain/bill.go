package domain

import "time"

// Bill represents a Utah state bill or resolution.
type Bill struct {
	ID                string
	BillNumber        string // e.g. "HB0001"
	BillType          string // HB, SB, HCR, SCR, HJR, SJR, HR, SR
	SessionYear       int
	Title             string
	Description       string
	Status            string
	SponsorID         string
	Sponsor           *Legislator
	FullTextURL       string
	LastAction        string
	LastActionDate    *time.Time
	FiscalNoteURL     string
	EffectiveDate     *time.Time
	UtahLegislatureID string
	LegiscanID        int
}
