package service

import (
	"context"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pb "api/gen/go/proto/v1"
	"api/internal/domain"
	"api/internal/repository"
)

// LegislatorService implements pb.LegislatorServiceServer.
type LegislatorService struct {
	pb.UnimplementedLegislatorServiceServer
	repo repository.LegislatorRepository
}

// NewLegislatorService creates a new LegislatorService.
func NewLegislatorService(repo repository.LegislatorRepository) *LegislatorService {
	return &LegislatorService{repo: repo}
}

// ListLegislators returns all Utah legislators, optionally filtered by chamber.
func (s *LegislatorService) ListLegislators(ctx context.Context, req *pb.ListLegislatorsRequest) (*pb.ListLegislatorsResponse, error) {
	legislators, err := s.repo.ListLegislators(ctx, req.Chamber)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "list legislators: %v", err)
	}

	pbLegislators := make([]*pb.Legislator, 0, len(legislators))
	for _, l := range legislators {
		pbLegislators = append(pbLegislators, toLegislatorPb(l))
	}

	return &pb.ListLegislatorsResponse{Legislators: pbLegislators}, nil
}

// GetLegislator returns a single legislator by UUID.
func (s *LegislatorService) GetLegislator(ctx context.Context, req *pb.GetLegislatorRequest) (*pb.GetLegislatorResponse, error) {
	if req.Id == "" {
		return nil, status.Error(codes.InvalidArgument, "id is required")
	}

	l, err := s.repo.GetLegislator(ctx, req.Id)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "get legislator: %v", err)
	}
	if l == nil {
		return nil, status.Errorf(codes.NotFound, "legislator %q not found", req.Id)
	}

	return &pb.GetLegislatorResponse{Legislator: toLegislatorPb(*l)}, nil
}

// toLegislatorPb converts a domain.Legislator to its proto representation.
func toLegislatorPb(l domain.Legislator) *pb.Legislator {
	return &pb.Legislator{
		Id:             l.ID,
		Chamber:        l.Chamber,
		DistrictNumber: int32(l.DistrictNumber),
		FirstName:      l.FirstName,
		LastName:       l.LastName,
		Party:          l.Party,
		Email:          l.Email,
		Phone:          l.Phone,
		Website:        l.Website,
		ImageUrl:       l.ImageURL,
	}
}

// toLegislatorPbPtr is a nil-safe variant for optional sponsor fields.
func toLegislatorPbPtr(l *domain.Legislator) *pb.Legislator {
	if l == nil {
		return nil
	}
	return toLegislatorPb(*l)
}

// ensure interface is satisfied at compile time.
var _ pb.LegislatorServiceServer = (*LegislatorService)(nil)
