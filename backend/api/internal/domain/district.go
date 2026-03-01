package domain

// District represents a Utah legislative district (house or senate).
type District struct {
	DistrictID     string
	Name           string
	Chamber        string // "house" or "senate"
	DistrictNumber int
	Legislator     *Legislator
}
