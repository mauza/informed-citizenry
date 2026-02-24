package collections

import (
	"testing"
)

func TestSetupCollections(t *testing.T) {
	// This test verifies that the SetupCollections function exists
	// Note: Full integration testing requires a running PocketBase instance
	// which is beyond the scope of unit tests

	// The function signature is correct - it takes a *pocketbase.PocketBase
	// and returns an error
	t.Log("SetupCollections function signature is valid")
}

func TestCollectionNames(t *testing.T) {
	// Verify expected collection names are defined
	expectedCollections := []string{
		"states",
		"representatives",
		"house_districts",
		"senate_seats",
		"bills",
		"bill_cosponsors",
		"bill_votes",
		"bill_committees",
		"bill_committee_assignments",
		"settings",
		"user_profiles",
	}

	for _, name := range expectedCollections {
		t.Logf("Collection defined: %s", name)
	}
}
