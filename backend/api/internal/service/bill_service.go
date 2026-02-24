package service

import (
	"context"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pb "api/gen/go/proto/v1"
	"api/internal/domain"
	"api/internal/repository"
)

// BillService implements pb.BillServiceServer.
type BillService struct {
	pb.UnimplementedBillServiceServer
	repo repository.BillRepository
}

// NewBillService creates a new BillService.
func NewBillService(repo repository.BillRepository) *BillService {
	return &BillService{repo: repo}
}

// ListBills returns Utah bills with optional filtering and pagination.
func (s *BillService) ListBills(ctx context.Context, req *pb.ListBillsRequest) (*pb.ListBillsResponse, error) {
	filters := repository.BillFilters{
		SessionYear: int(req.SessionYear),
		Status:      req.Status,
		SponsorID:   req.SponsorId,
		Page:        int(req.Page),
		PageSize:    int(req.PageSize),
	}

	// Default to current year when not specified.
	if filters.SessionYear == 0 {
		filters.SessionYear = time.Now().Year()
	}

	bills, err := s.repo.ListBills(ctx, filters)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "list bills: %v", err)
	}

	pbBills := make([]*pb.Bill, 0, len(bills))
	for _, b := range bills {
		pbBills = append(pbBills, toBillPb(b))
	}

	return &pb.ListBillsResponse{Bills: pbBills, Total: int32(len(pbBills))}, nil
}

// GetBill returns a single bill by UUID with the sponsor embedded.
func (s *BillService) GetBill(ctx context.Context, req *pb.GetBillRequest) (*pb.GetBillResponse, error) {
	if req.Id == "" {
		return nil, status.Error(codes.InvalidArgument, "id is required")
	}

	b, err := s.repo.GetBill(ctx, req.Id)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "get bill: %v", err)
	}
	if b == nil {
		return nil, status.Errorf(codes.NotFound, "bill %q not found", req.Id)
	}

	return &pb.GetBillResponse{Bill: toBillPb(*b)}, nil
}

// toBillPb converts a domain.Bill to its proto representation.
func toBillPb(b domain.Bill) *pb.Bill {
	out := &pb.Bill{
		Id:            b.ID,
		BillNumber:    b.BillNumber,
		BillType:      b.BillType,
		SessionYear:   int32(b.SessionYear),
		Title:         b.Title,
		Description:   b.Description,
		Status:        b.Status,
		Sponsor:       toLegislatorPbPtr(b.Sponsor),
		FullTextUrl:   b.FullTextURL,
		LastAction:    b.LastAction,
		FiscalNoteUrl: b.FiscalNoteURL,
	}
	if b.LastActionDate != nil {
		out.LastActionDate = b.LastActionDate.Format(time.RFC3339)
	}
	return out
}
