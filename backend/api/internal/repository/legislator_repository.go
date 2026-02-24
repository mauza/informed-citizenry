package repository

import (
	"context"

	"api/internal/domain"
)

// LegislatorRepository defines the operations on the legislators store.
// Implementations are swappable (Postgres, in-memory, etc.).
type LegislatorRepository interface {
	ListLegislators(ctx context.Context, chamber string) ([]domain.Legislator, error)
	GetLegislator(ctx context.Context, id string) (*domain.Legislator, error)
	GetLegislatorByDistrict(ctx context.Context, chamber string, districtNumber int) (*domain.Legislator, error)
	UpsertLegislator(ctx context.Context, legislator domain.Legislator) error
}
