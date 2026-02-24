package collections

import (
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
)

func SetupCollections(app *pocketbase.PocketBase) error {
	if err := setupStatesCollection(app); err != nil {
		return err
	}
	if err := setupRepresentativesCollection(app); err != nil {
		return err
	}
	if err := setupHouseDistrictsCollection(app); err != nil {
		return err
	}
	if err := setupSenateSeatsCollection(app); err != nil {
		return err
	}
	if err := setupBillsCollection(app); err != nil {
		return err
	}
	if err := setupBillCosponsorsCollection(app); err != nil {
		return err
	}
	if err := setupBillVotesCollection(app); err != nil {
		return err
	}
	if err := setupBillCommitteesCollection(app); err != nil {
		return err
	}
	if err := setupBillCommitteeAssignmentsCollection(app); err != nil {
		return err
	}
	if err := setupSettingsCollection(app); err != nil {
		return err
	}
	if err := setupUserProfilesCollection(app); err != nil {
		return err
	}
	return nil
}

func strPtr(s string) *string {
	return &s
}

func float64Ptr(f float64) *float64 {
	return &f
}

func setupStatesCollection(app *pocketbase.PocketBase) error {
	if _, err := app.FindCollectionByNameOrId("states"); err == nil {
		return nil
	}

	col := core.NewBaseCollection("states")
	col.Fields.Add(&core.TextField{Name: "name", Required: true})
	col.Fields.Add(&core.TextField{Name: "abbreviation", Required: true, Min: 2, Max: 2})
	col.Fields.Add(&core.TextField{Name: "fips_code", Required: true, Min: 2, Max: 2})

	return app.Save(col)
}

func setupRepresentativesCollection(app *pocketbase.PocketBase) error {
	if _, err := app.FindCollectionByNameOrId("representatives"); err == nil {
		return nil
	}

	col := core.NewBaseCollection("representatives")
	col.Fields.Add(&core.TextField{Name: "first_name", Required: true})
	col.Fields.Add(&core.TextField{Name: "last_name", Required: true})
	col.Fields.Add(&core.SelectField{
		Name:     "representative_type",
		Required: true,
		Values:   []string{"house", "senate"},
	})
	col.Fields.Add(&core.TextField{Name: "party"})
	col.Fields.Add(&core.EmailField{Name: "email"})
	col.Fields.Add(&core.TextField{Name: "phone"})
	col.Fields.Add(&core.URLField{Name: "website"})
	col.Fields.Add(&core.TextField{Name: "twitter_handle"})
	col.Fields.Add(&core.DateField{Name: "term_start"})
	col.Fields.Add(&core.DateField{Name: "term_end"})

	return app.Save(col)
}

func setupHouseDistrictsCollection(app *pocketbase.PocketBase) error {
	if _, err := app.FindCollectionByNameOrId("house_districts"); err == nil {
		return nil
	}

	statesCol, err := app.FindCollectionByNameOrId("states")
	if err != nil {
		return err
	}
	repsCol, err := app.FindCollectionByNameOrId("representatives")
	if err != nil {
		return err
	}

	col := core.NewBaseCollection("house_districts")
	col.Fields.Add(&core.RelationField{
		Name:         "state",
		Required:     true,
		CollectionId: statesCol.Id,
		MaxSelect:    1,
	})
	col.Fields.Add(&core.NumberField{Name: "district_number", Required: true, OnlyInt: true})
	col.Fields.Add(&core.RelationField{
		Name:         "representative",
		CollectionId: repsCol.Id,
		MaxSelect:    1,
	})
	col.Fields.Add(&core.JSONField{Name: "boundary_geojson"})
	col.Fields.Add(&core.NumberField{Name: "population", OnlyInt: true})

	return app.Save(col)
}

func setupSenateSeatsCollection(app *pocketbase.PocketBase) error {
	if _, err := app.FindCollectionByNameOrId("senate_seats"); err == nil {
		return nil
	}

	statesCol, err := app.FindCollectionByNameOrId("states")
	if err != nil {
		return err
	}
	repsCol, err := app.FindCollectionByNameOrId("representatives")
	if err != nil {
		return err
	}

	col := core.NewBaseCollection("senate_seats")
	col.Fields.Add(&core.RelationField{
		Name:         "state",
		Required:     true,
		CollectionId: statesCol.Id,
		MaxSelect:    1,
	})
	col.Fields.Add(&core.SelectField{
		Name:     "seat_class",
		Required: true,
		Values:   []string{"1", "2", "3"},
	})
	col.Fields.Add(&core.RelationField{
		Name:         "representative",
		CollectionId: repsCol.Id,
		MaxSelect:    1,
	})

	return app.Save(col)
}

func setupBillsCollection(app *pocketbase.PocketBase) error {
	if _, err := app.FindCollectionByNameOrId("bills"); err == nil {
		return nil
	}

	statesCol, err := app.FindCollectionByNameOrId("states")
	if err != nil {
		return err
	}
	repsCol, err := app.FindCollectionByNameOrId("representatives")
	if err != nil {
		return err
	}

	col := core.NewBaseCollection("bills")
	col.Fields.Add(&core.SelectField{
		Name:     "bill_type",
		Required: true,
		Values:   []string{"HB", "HCR", "HJR", "HR", "SB", "SCR", "SJR", "SR"},
	})
	col.Fields.Add(&core.NumberField{Name: "bill_number", Required: true, OnlyInt: true})
	col.Fields.Add(&core.TextField{Name: "title", Required: true})
	col.Fields.Add(&core.TextField{Name: "description"})
	col.Fields.Add(&core.SelectField{
		Name:     "status",
		Required: true,
		Values: []string{
			"introduced", "in_committee", "passed_committee", "failed_committee",
			"first_reading", "second_reading", "third_reading",
			"passed", "failed", "vetoed", "signed", "law",
		},
	})
	col.Fields.Add(&core.NumberField{Name: "session_year", Required: true, OnlyInt: true})
	col.Fields.Add(&core.RelationField{
		Name:         "state",
		Required:     true,
		CollectionId: statesCol.Id,
		MaxSelect:    1,
	})
	col.Fields.Add(&core.RelationField{
		Name:         "primary_sponsor",
		CollectionId: repsCol.Id,
		MaxSelect:    1,
	})
	col.Fields.Add(&core.URLField{Name: "full_text_url"})
	col.Fields.Add(&core.DateField{Name: "last_action_date"})
	col.Fields.Add(&core.TextField{Name: "last_action_description"})
	col.Fields.Add(&core.URLField{Name: "fiscal_note_url"})
	col.Fields.Add(&core.DateField{Name: "effective_date"})

	return app.Save(col)
}

func setupBillCosponsorsCollection(app *pocketbase.PocketBase) error {
	if _, err := app.FindCollectionByNameOrId("bill_cosponsors"); err == nil {
		return nil
	}

	billsCol, err := app.FindCollectionByNameOrId("bills")
	if err != nil {
		return err
	}
	repsCol, err := app.FindCollectionByNameOrId("representatives")
	if err != nil {
		return err
	}

	col := core.NewBaseCollection("bill_cosponsors")
	col.Fields.Add(&core.RelationField{
		Name:         "bill",
		Required:     true,
		CollectionId: billsCol.Id,
		MaxSelect:    1,
	})
	col.Fields.Add(&core.RelationField{
		Name:         "representative",
		Required:     true,
		CollectionId: repsCol.Id,
		MaxSelect:    1,
	})

	return app.Save(col)
}

func setupBillVotesCollection(app *pocketbase.PocketBase) error {
	if _, err := app.FindCollectionByNameOrId("bill_votes"); err == nil {
		return nil
	}

	billsCol, err := app.FindCollectionByNameOrId("bills")
	if err != nil {
		return err
	}
	repsCol, err := app.FindCollectionByNameOrId("representatives")
	if err != nil {
		return err
	}

	col := core.NewBaseCollection("bill_votes")
	col.Fields.Add(&core.RelationField{
		Name:         "bill",
		Required:     true,
		CollectionId: billsCol.Id,
		MaxSelect:    1,
	})
	col.Fields.Add(&core.RelationField{
		Name:         "representative",
		Required:     true,
		CollectionId: repsCol.Id,
		MaxSelect:    1,
	})
	col.Fields.Add(&core.SelectField{
		Name:     "vote",
		Required: true,
		Values:   []string{"yea", "nay", "absent", "present"},
	})
	col.Fields.Add(&core.DateField{Name: "vote_date", Required: true})
	col.Fields.Add(&core.NumberField{
		Name:    "reading_number",
		OnlyInt: true,
		Min:     float64Ptr(1),
		Max:     float64Ptr(3),
	})

	return app.Save(col)
}

func setupBillCommitteesCollection(app *pocketbase.PocketBase) error {
	if _, err := app.FindCollectionByNameOrId("bill_committees"); err == nil {
		return nil
	}

	statesCol, err := app.FindCollectionByNameOrId("states")
	if err != nil {
		return err
	}

	col := core.NewBaseCollection("bill_committees")
	col.Fields.Add(&core.TextField{Name: "name", Required: true})
	col.Fields.Add(&core.RelationField{
		Name:         "state",
		Required:     true,
		CollectionId: statesCol.Id,
		MaxSelect:    1,
	})

	return app.Save(col)
}

func setupBillCommitteeAssignmentsCollection(app *pocketbase.PocketBase) error {
	if _, err := app.FindCollectionByNameOrId("bill_committee_assignments"); err == nil {
		return nil
	}

	billsCol, err := app.FindCollectionByNameOrId("bills")
	if err != nil {
		return err
	}
	committeesCol, err := app.FindCollectionByNameOrId("bill_committees")
	if err != nil {
		return err
	}

	col := core.NewBaseCollection("bill_committee_assignments")
	col.Fields.Add(&core.RelationField{
		Name:         "bill",
		Required:     true,
		CollectionId: billsCol.Id,
		MaxSelect:    1,
	})
	col.Fields.Add(&core.RelationField{
		Name:         "committee",
		Required:     true,
		CollectionId: committeesCol.Id,
		MaxSelect:    1,
	})
	col.Fields.Add(&core.DateField{Name: "assignment_date", Required: true})
	col.Fields.Add(&core.SelectField{
		Name:   "status",
		Values: []string{"pending", "passed", "failed", "substituted"},
	})

	return app.Save(col)
}

func setupSettingsCollection(app *pocketbase.PocketBase) error {
	if _, err := app.FindCollectionByNameOrId("settings"); err == nil {
		return nil
	}

	col := core.NewBaseCollection("settings")
	col.ListRule = strPtr("user = @request.auth.id")
	col.ViewRule = strPtr("user = @request.auth.id")
	col.CreateRule = strPtr("user = @request.auth.id")
	col.UpdateRule = strPtr("user = @request.auth.id")
	col.DeleteRule = strPtr("user = @request.auth.id")

	col.Fields.Add(&core.RelationField{
		Name:         "user",
		Required:     true,
		CollectionId: "_pb_users_auth_",
		MaxSelect:    1,
	})
	col.Fields.Add(&core.BoolField{Name: "notification_enabled"})
	col.Fields.Add(&core.SelectField{
		Name:   "theme_preference",
		Values: []string{"light", "dark", "system"},
	})

	return app.Save(col)
}

func setupUserProfilesCollection(app *pocketbase.PocketBase) error {
	if _, err := app.FindCollectionByNameOrId("user_profiles"); err == nil {
		return nil
	}

	col := core.NewBaseCollection("user_profiles")
	col.ListRule = strPtr("user = @request.auth.id")
	col.ViewRule = strPtr("user = @request.auth.id")
	col.CreateRule = strPtr("user = @request.auth.id")
	col.UpdateRule = strPtr("user = @request.auth.id")
	col.DeleteRule = strPtr("user = @request.auth.id")

	col.Fields.Add(&core.RelationField{
		Name:         "user",
		Required:     true,
		CollectionId: "_pb_users_auth_",
		MaxSelect:    1,
	})
	col.Fields.Add(&core.TextField{Name: "first_name"})
	col.Fields.Add(&core.TextField{Name: "last_name"})
	col.Fields.Add(&core.DateField{Name: "birthdate"})
	col.Fields.Add(&core.TextField{Name: "street_address"})
	col.Fields.Add(&core.TextField{Name: "city"})
	col.Fields.Add(&core.TextField{Name: "state"})
	col.Fields.Add(&core.TextField{Name: "zip_code"})
	col.Fields.Add(&core.TextField{Name: "phone_number"})

	return app.Save(col)
}
