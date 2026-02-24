package collections

import (
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/models"
	"github.com/pocketbase/pocketbase/models/schema"
)

func SetupCollections(app *pocketbase.PocketBase) error {
	// Setup states collection
	if err := setupStatesCollection(app); err != nil {
		return err
	}

	// Setup representatives collection
	if err := setupRepresentativesCollection(app); err != nil {
		return err
	}

	// Setup house_districts collection
	if err := setupHouseDistrictsCollection(app); err != nil {
		return err
	}

	// Setup senate_seats collection
	if err := setupSenateSeatsCollection(app); err != nil {
		return err
	}

	// Setup bills collection
	if err := setupBillsCollection(app); err != nil {
		return err
	}

	// Setup bill_cosponsors collection
	if err := setupBillCosponsorsCollection(app); err != nil {
		return err
	}

	// Setup bill_votes collection
	if err := setupBillVotesCollection(app); err != nil {
		return err
	}

	// Setup bill_committees collection
	if err := setupBillCommitteesCollection(app); err != nil {
		return err
	}

	// Setup bill_committee_assignments collection
	if err := setupBillCommitteeAssignmentsCollection(app); err != nil {
		return err
	}

	// Setup settings collection (user-specific, private)
	if err := setupSettingsCollection(app); err != nil {
		return err
	}

	// Setup user_profiles collection (extends users, private)
	if err := setupUserProfilesCollection(app); err != nil {
		return err
	}

	return nil
}

func setupStatesCollection(app *pocketbase.PocketBase) error {
	collection, err := app.Dao().FindCollectionByNameOrId("states")
	if err == nil {
		return nil
	}

	collection = &models.Collection{
		Name:       "states",
		Type:       models.CollectionTypeBase,
		ListRule:   nil,
		ViewRule:   nil,
		CreateRule: nil,
		UpdateRule: nil,
		DeleteRule: nil,
		Schema: schema.NewSchema(
			&schema.SchemaField{
				Name:     "name",
				Type:     schema.FieldTypeText,
				Required: true,
			},
			&schema.SchemaField{
				Name:     "abbreviation",
				Type:     schema.FieldTypeText,
				Required: true,
				Options:  &schema.TextOptions{Max: 2, Min: 2},
			},
			&schema.SchemaField{
				Name:     "fips_code",
				Type:     schema.FieldTypeText,
				Required: true,
				Options:  &schema.TextOptions{Max: 2, Min: 2},
			},
		),
	}

	return app.Dao().SaveCollection(collection)
}

func setupRepresentativesCollection(app *pocketbase.PocketBase) error {
	collection, err := app.Dao().FindCollectionByNameOrId("representatives")
	if err == nil {
		return nil
	}

	collection = &models.Collection{
		Name:       "representatives",
		Type:       models.CollectionTypeBase,
		ListRule:   nil,
		ViewRule:   nil,
		CreateRule: nil,
		UpdateRule: nil,
		DeleteRule: nil,
		Schema: schema.NewSchema(
			&schema.SchemaField{
				Name:     "first_name",
				Type:     schema.FieldTypeText,
				Required: true,
			},
			&schema.SchemaField{
				Name:     "last_name",
				Type:     schema.FieldTypeText,
				Required: true,
			},
			&schema.SchemaField{
				Name:     "representative_type",
				Type:     schema.FieldTypeSelect,
				Required: true,
				Options:  &schema.SelectOptions{Values: []string{"house", "senate"}},
			},
			&schema.SchemaField{
				Name:    "party",
				Type:    schema.FieldTypeText,
				Options: &schema.TextOptions{},
			},
			&schema.SchemaField{
				Name:    "email",
				Type:    schema.FieldTypeEmail,
				Options: &schema.EmailOptions{},
			},
			&schema.SchemaField{
				Name:    "phone",
				Type:    schema.FieldTypeText,
				Options: &schema.TextOptions{},
			},
			&schema.SchemaField{
				Name:    "website",
				Type:    schema.FieldTypeUrl,
				Options: &schema.UrlOptions{},
			},
			&schema.SchemaField{
				Name:    "twitter_handle",
				Type:    schema.FieldTypeText,
				Options: &schema.TextOptions{},
			},
			&schema.SchemaField{
				Name:    "term_start",
				Type:    schema.FieldTypeDate,
				Options: &schema.DateOptions{},
			},
			&schema.SchemaField{
				Name:    "term_end",
				Type:    schema.FieldTypeDate,
				Options: &schema.DateOptions{},
			},
		),
	}

	return app.Dao().SaveCollection(collection)
}

func setupHouseDistrictsCollection(app *pocketbase.PocketBase) error {
	collection, err := app.Dao().FindCollectionByNameOrId("house_districts")
	if err == nil {
		return nil
	}

	collection = &models.Collection{
		Name:       "house_districts",
		Type:       models.CollectionTypeBase,
		ListRule:   nil,
		ViewRule:   nil,
		CreateRule: nil,
		UpdateRule: nil,
		DeleteRule: nil,
		Schema: schema.NewSchema(
			&schema.SchemaField{
				Name:     "state",
				Type:     schema.FieldTypeRelation,
				Required: true,
				Options:  &schema.RelationOptions{CollectionId: "states", MaxSelect: 1},
			},
			&schema.SchemaField{
				Name:     "district_number",
				Type:     schema.FieldTypeNumber,
				Required: true,
				Options:  &schema.NumberOptions{OnlyInt: true},
			},
			&schema.SchemaField{
				Name:    "representative",
				Type:    schema.FieldTypeRelation,
				Options: &schema.RelationOptions{CollectionId: "representatives", MaxSelect: 1},
			},
			&schema.SchemaField{
				Name:    "boundary_geojson",
				Type:    schema.FieldTypeJson,
				Options: &schema.JsonOptions{},
			},
			&schema.SchemaField{
				Name:    "population",
				Type:    schema.FieldTypeNumber,
				Options: &schema.NumberOptions{OnlyInt: true},
			},
		),
	}

	return app.Dao().SaveCollection(collection)
}

func setupSenateSeatsCollection(app *pocketbase.PocketBase) error {
	collection, err := app.Dao().FindCollectionByNameOrId("senate_seats")
	if err == nil {
		return nil
	}

	collection = &models.Collection{
		Name:       "senate_seats",
		Type:       models.CollectionTypeBase,
		ListRule:   nil,
		ViewRule:   nil,
		CreateRule: nil,
		UpdateRule: nil,
		DeleteRule: nil,
		Schema: schema.NewSchema(
			&schema.SchemaField{
				Name:     "state",
				Type:     schema.FieldTypeRelation,
				Required: true,
				Options:  &schema.RelationOptions{CollectionId: "states", MaxSelect: 1},
			},
			&schema.SchemaField{
				Name:     "seat_class",
				Type:     schema.FieldTypeSelect,
				Required: true,
				Options:  &schema.SelectOptions{Values: []string{"1", "2", "3"}},
			},
			&schema.SchemaField{
				Name:    "representative",
				Type:    schema.FieldTypeRelation,
				Options: &schema.RelationOptions{CollectionId: "representatives", MaxSelect: 1},
			},
		),
	}

	return app.Dao().SaveCollection(collection)
}

func setupBillsCollection(app *pocketbase.PocketBase) error {
	collection, err := app.Dao().FindCollectionByNameOrId("bills")
	if err == nil {
		return nil
	}

	collection = &models.Collection{
		Name:       "bills",
		Type:       models.CollectionTypeBase,
		ListRule:   nil,
		ViewRule:   nil,
		CreateRule: nil,
		UpdateRule: nil,
		DeleteRule: nil,
		Schema: schema.NewSchema(
			&schema.SchemaField{
				Name:     "bill_type",
				Type:     schema.FieldTypeSelect,
				Required: true,
				Options:  &schema.SelectOptions{Values: []string{"HB", "HCR", "HJR", "HR", "SB", "SCR", "SJR", "SR"}},
			},
			&schema.SchemaField{
				Name:     "bill_number",
				Type:     schema.FieldTypeNumber,
				Required: true,
				Options:  &schema.NumberOptions{OnlyInt: true},
			},
			&schema.SchemaField{
				Name:     "title",
				Type:     schema.FieldTypeText,
				Required: true,
			},
			&schema.SchemaField{
				Name:    "description",
				Type:    schema.FieldTypeText,
				Options: &schema.TextOptions{},
			},
			&schema.SchemaField{
				Name:     "status",
				Type:     schema.FieldTypeSelect,
				Required: true,
				Options: &schema.SelectOptions{
					Values: []string{"introduced", "in_committee", "passed_committee", "failed_committee",
						"first_reading", "second_reading", "third_reading", "passed", "failed", "vetoed", "signed", "law"},
				},
			},
			&schema.SchemaField{
				Name:     "session_year",
				Type:     schema.FieldTypeNumber,
				Required: true,
				Options:  &schema.NumberOptions{OnlyInt: true},
			},
			&schema.SchemaField{
				Name:     "state",
				Type:     schema.FieldTypeRelation,
				Required: true,
				Options:  &schema.RelationOptions{CollectionId: "states", MaxSelect: 1},
			},
			&schema.SchemaField{
				Name:    "primary_sponsor",
				Type:    schema.FieldTypeRelation,
				Options: &schema.RelationOptions{CollectionId: "representatives", MaxSelect: 1},
			},
			&schema.SchemaField{
				Name:    "full_text_url",
				Type:    schema.FieldTypeUrl,
				Options: &schema.UrlOptions{},
			},
			&schema.SchemaField{
				Name:    "last_action_date",
				Type:    schema.FieldTypeDate,
				Options: &schema.DateOptions{},
			},
			&schema.SchemaField{
				Name:    "last_action_description",
				Type:    schema.FieldTypeText,
				Options: &schema.TextOptions{},
			},
			&schema.SchemaField{
				Name:    "fiscal_note_url",
				Type:    schema.FieldTypeUrl,
				Options: &schema.UrlOptions{},
			},
			&schema.SchemaField{
				Name:    "effective_date",
				Type:    schema.FieldTypeDate,
				Options: &schema.DateOptions{},
			},
		),
	}

	return app.Dao().SaveCollection(collection)
}

func setupBillCosponsorsCollection(app *pocketbase.PocketBase) error {
	collection, err := app.Dao().FindCollectionByNameOrId("bill_cosponsors")
	if err == nil {
		return nil
	}

	collection = &models.Collection{
		Name:       "bill_cosponsors",
		Type:       models.CollectionTypeBase,
		ListRule:   nil,
		ViewRule:   nil,
		CreateRule: nil,
		UpdateRule: nil,
		DeleteRule: nil,
		Schema: schema.NewSchema(
			&schema.SchemaField{
				Name:     "bill",
				Type:     schema.FieldTypeRelation,
				Required: true,
				Options:  &schema.RelationOptions{CollectionId: "bills", MaxSelect: 1},
			},
			&schema.SchemaField{
				Name:     "representative",
				Type:     schema.FieldTypeRelation,
				Required: true,
				Options:  &schema.RelationOptions{CollectionId: "representatives", MaxSelect: 1},
			},
		),
	}

	return app.Dao().SaveCollection(collection)
}

func setupBillVotesCollection(app *pocketbase.PocketBase) error {
	collection, err := app.Dao().FindCollectionByNameOrId("bill_votes")
	if err == nil {
		return nil
	}

	collection = &models.Collection{
		Name:       "bill_votes",
		Type:       models.CollectionTypeBase,
		ListRule:   nil,
		ViewRule:   nil,
		CreateRule: nil,
		UpdateRule: nil,
		DeleteRule: nil,
		Schema: schema.NewSchema(
			&schema.SchemaField{
				Name:     "bill",
				Type:     schema.FieldTypeRelation,
				Required: true,
				Options:  &schema.RelationOptions{CollectionId: "bills", MaxSelect: 1},
			},
			&schema.SchemaField{
				Name:     "representative",
				Type:     schema.FieldTypeRelation,
				Required: true,
				Options:  &schema.RelationOptions{CollectionId: "representatives", MaxSelect: 1},
			},
			&schema.SchemaField{
				Name:     "vote",
				Type:     schema.FieldTypeSelect,
				Required: true,
				Options:  &schema.SelectOptions{Values: []string{"yea", "nay", "absent", "present"}},
			},
			&schema.SchemaField{
				Name:     "vote_date",
				Type:     schema.FieldTypeDate,
				Required: true,
				Options:  &schema.DateOptions{},
			},
			&schema.SchemaField{
				Name:    "reading_number",
				Type:    schema.FieldTypeNumber,
				Options: &schema.NumberOptions{OnlyInt: true, Min: 1, Max: 3},
			},
		),
	}

	return app.Dao().SaveCollection(collection)
}

func setupBillCommitteesCollection(app *pocketbase.PocketBase) error {
	collection, err := app.Dao().FindCollectionByNameOrId("bill_committees")
	if err == nil {
		return nil
	}

	collection = &models.Collection{
		Name:       "bill_committees",
		Type:       models.CollectionTypeBase,
		ListRule:   nil,
		ViewRule:   nil,
		CreateRule: nil,
		UpdateRule: nil,
		DeleteRule: nil,
		Schema: schema.NewSchema(
			&schema.SchemaField{
				Name:     "name",
				Type:     schema.FieldTypeText,
				Required: true,
			},
			&schema.SchemaField{
				Name:     "state",
				Type:     schema.FieldTypeRelation,
				Required: true,
				Options:  &schema.RelationOptions{CollectionId: "states", MaxSelect: 1},
			},
		),
	}

	return app.Dao().SaveCollection(collection)
}

func setupBillCommitteeAssignmentsCollection(app *pocketbase.PocketBase) error {
	collection, err := app.Dao().FindCollectionByNameOrId("bill_committee_assignments")
	if err == nil {
		return nil
	}

	collection = &models.Collection{
		Name:       "bill_committee_assignments",
		Type:       models.CollectionTypeBase,
		ListRule:   nil,
		ViewRule:   nil,
		CreateRule: nil,
		UpdateRule: nil,
		DeleteRule: nil,
		Schema: schema.NewSchema(
			&schema.SchemaField{
				Name:     "bill",
				Type:     schema.FieldTypeRelation,
				Required: true,
				Options:  &schema.RelationOptions{CollectionId: "bills", MaxSelect: 1},
			},
			&schema.SchemaField{
				Name:     "committee",
				Type:     schema.FieldTypeRelation,
				Required: true,
				Options:  &schema.RelationOptions{CollectionId: "bill_committees", MaxSelect: 1},
			},
			&schema.SchemaField{
				Name:     "assignment_date",
				Type:     schema.FieldTypeDate,
				Required: true,
				Options:  &schema.DateOptions{},
			},
			&schema.SchemaField{
				Name:    "status",
				Type:    schema.FieldTypeSelect,
				Options: &schema.SelectOptions{Values: []string{"pending", "passed", "failed", "substituted"}},
			},
		),
	}

	return app.Dao().SaveCollection(collection)
}

func setupSettingsCollection(app *pocketbase.PocketBase) error {
	collection, err := app.Dao().FindCollectionByNameOrId("settings")
	if err == nil {
		return nil
	}

	collection = &models.Collection{
		Name: "settings",
		Type: models.CollectionTypeBase,
		// Users can only view their own settings
		ListRule:   "user = @request.auth.id",
		ViewRule:   "user = @request.auth.id",
		CreateRule: "user = @request.auth.id",
		UpdateRule: "user = @request.auth.id",
		DeleteRule: "user = @request.auth.id",
		Schema: schema.NewSchema(
			&schema.SchemaField{
				Name:     "user",
				Type:     schema.FieldTypeRelation,
				Required: true,
				Options:  &schema.RelationOptions{CollectionId: "_pb_users_auth_", MaxSelect: 1},
			},
			&schema.SchemaField{
				Name:    "notification_enabled",
				Type:    schema.FieldTypeBool,
				Options: &schema.BoolOptions{},
			},
			&schema.SchemaField{
				Name:    "theme_preference",
				Type:    schema.FieldTypeSelect,
				Options: &schema.SelectOptions{Values: []string{"light", "dark", "system"}},
			},
		),
	}

	return app.Dao().SaveCollection(collection)
}

func setupUserProfilesCollection(app *pocketbase.PocketBase) error {
	collection, err := app.Dao().FindCollectionByNameOrId("user_profiles")
	if err == nil {
		return nil
	}

	collection = &models.Collection{
		Name: "user_profiles",
		Type: models.CollectionTypeBase,
		// Users can only view their own profile
		ListRule:   "user = @request.auth.id",
		ViewRule:   "user = @request.auth.id",
		CreateRule: "user = @request.auth.id",
		UpdateRule: "user = @request.auth.id",
		DeleteRule: "user = @request.auth.id",
		Schema: schema.NewSchema(
			&schema.SchemaField{
				Name:     "user",
				Type:     schema.FieldTypeRelation,
				Required: true,
				Options:  &schema.RelationOptions{CollectionId: "_pb_users_auth_", MaxSelect: 1},
			},
			&schema.SchemaField{
				Name:    "first_name",
				Type:    schema.FieldTypeText,
				Options: &schema.TextOptions{},
			},
			&schema.SchemaField{
				Name:    "last_name",
				Type:    schema.FieldTypeText,
				Options: &schema.TextOptions{},
			},
			&schema.SchemaField{
				Name:    "birthdate",
				Type:    schema.FieldTypeDate,
				Options: &schema.DateOptions{},
			},
			&schema.SchemaField{
				Name:    "street_address",
				Type:    schema.FieldTypeText,
				Options: &schema.TextOptions{},
			},
			&schema.SchemaField{
				Name:    "city",
				Type:    schema.FieldTypeText,
				Options: &schema.TextOptions{},
			},
			&schema.SchemaField{
				Name:    "state",
				Type:    schema.FieldTypeText,
				Options: &schema.TextOptions{},
			},
			&schema.SchemaField{
				Name:    "zip_code",
				Type:    schema.FieldTypeText,
				Options: &schema.TextOptions{},
			},
			&schema.SchemaField{
				Name:    "phone_number",
				Type:    schema.FieldTypeText,
				Options: &schema.TextOptions{},
			},
		),
	}

	return app.Dao().SaveCollection(collection)
}
