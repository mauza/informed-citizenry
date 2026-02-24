package repository

import (
	"context"

	"api/internal/domain"
)

// BillFilters holds optional filters for listing bills.
type BillFilters struct {
	SessionYear int
	Status      string
	Chamber     string // filter by sponsor's chamber: "house" or "senate"
	SponsorID   string
	Page        int
	PageSize    int
}

// BillRepository defines the operations on the bills store.
// Implementations are swappable (Postgres, in-memory, etc.).
type BillRepository interface {
	ListBills(ctx context.Context, filters BillFilters) ([]domain.Bill, error)
	GetBill(ctx context.Context, id string) (*domain.Bill, error)
	UpsertBill(ctx context.Context, bill domain.Bill) error
}
