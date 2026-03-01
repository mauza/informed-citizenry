package service

import (
	"context"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pb "api/gen/go/proto/v1"
	"api/internal/domain"
	"api/internal/repository"
)

// DistrictService implements pb.DistrictServiceServer.
type DistrictService struct {
	pb.UnimplementedDistrictServiceServer
	repo repository.LegislatorRepository
}

// NewDistrictService creates a new DistrictService.
func NewDistrictService(repo repository.LegislatorRepository) *DistrictService {
	return &DistrictService{repo: repo}
}

// GetDistrictFromLocation returns the Utah House and Senate representatives
// for a given GPS location.
//
// Full geo lookup (point-in-polygon against district boundary GeoJSON) is
// planned as future work. This implementation returns Unimplemented until
// district boundary data is available.
func (s *DistrictService) GetDistrictFromLocation(ctx context.Context, req *pb.GetDistrictFromLocationRequest) (*pb.GetDistrictFromLocationResponse, error) {
	if req.Location == nil {
		return nil, status.Error(codes.InvalidArgument, "location is required")
	}

	lat := req.Location.Latitude
	lng := req.Location.Longitude

	// Rough bounding box check: Utah is approximately
	//   lat 36.998–42.001 N, lng -114.053–-109.041 W
	if lat < 36.998 || lat > 42.001 || lng < -114.053 || lng > -109.041 {
		return nil, status.Errorf(codes.InvalidArgument,
			"coordinates (%.4f, %.4f) are outside Utah", lat, lng)
	}

	// TODO: replace with point-in-polygon lookup once district boundary
	// GeoJSON data is loaded into the database.
	return nil, status.Error(codes.Unimplemented,
		"district geo-lookup is not yet available; boundary data coming soon")
}

// toDistrictPb converts a domain.District to its proto representation.
func toDistrictPb(d *domain.District) *pb.District {
	if d == nil {
		return nil
	}
	return &pb.District{
		DistrictId:     d.DistrictID,
		Name:           d.Name,
		Chamber:        d.Chamber,
		DistrictNumber: int32(d.DistrictNumber),
		Legislator:     toLegislatorPbPtr(d.Legislator),
	}
}

// ensure interface is satisfied at compile time.
var _ pb.DistrictServiceServer = (*DistrictService)(nil)
