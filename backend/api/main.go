package main

import (
	"context"
	"log"
	"net"
	"net/http"

	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	pb "api/gen/go/proto/v1"
)

type server struct {
	pb.UnimplementedDistrictServiceServer
}

func (s *server) GetDistrictFromLocation(ctx context.Context, req *pb.GetDistrictFromLocationRequest) (*pb.GetDistrictFromLocationResponse, error) {
	// TODO: Implement the actual logic to find district from location
	return &pb.GetDistrictFromLocationResponse{
		District: &pb.District{
			DistrictId: "example-district",
			Name:       "Example District",
			State:      "Example State",
		},
	}, nil
}

func main() {
	ctx := context.Background()
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	// Create a listener on TCP port
	lis, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	// Create a gRPC server object
	s := grpc.NewServer()
	pb.RegisterDistrictServiceServer(s, &server{})

	// Serve gRPC server
	log.Println("Serving gRPC on :50051")
	go func() {
		log.Fatalln(s.Serve(lis))
	}()

	// Create a client connection to the gRPC server we just started
	conn, err := grpc.NewClient(
		"localhost:50051",
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		log.Fatalln("Failed to dial server:", err)
	}
	defer conn.Close()

	gwmux := runtime.NewServeMux()
	// Register DistrictService
	err = pb.RegisterDistrictServiceHandler(ctx, gwmux, conn)
	if err != nil {
		log.Fatalln("Failed to register gateway:", err)
	}

	gwServer := &http.Server{
		Addr:    ":8080",
		Handler: gwmux,
	}

	log.Println("Serving gRPC-Gateway on :8080")
	log.Fatalln(gwServer.ListenAndServe())
}
