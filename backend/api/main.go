package main

import (
	"context"
	"log"
	"log/slog"
	"net"
	"net/http"
	"os"

	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"github.com/jackc/pgx/v5/pgxpool"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	pb "api/gen/go/proto/v1"
	"api/internal/repository/postgres"
	"api/internal/service"
)

func main() {
	ctx := context.Background()
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	// ---------------------------------------------------------------------------
	// Database
	// ---------------------------------------------------------------------------
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL environment variable is required")
	}

	db, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer db.Close()

	// ---------------------------------------------------------------------------
	// Repositories
	// ---------------------------------------------------------------------------
	billRepo := postgres.NewBillRepository(db)
	legislatorRepo := postgres.NewLegislatorRepository(db)

	// ---------------------------------------------------------------------------
	// gRPC server
	// ---------------------------------------------------------------------------
	lis, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	grpcServer := grpc.NewServer()
	pb.RegisterBillServiceServer(grpcServer, service.NewBillService(billRepo))
	pb.RegisterLegislatorServiceServer(grpcServer, service.NewLegislatorService(legislatorRepo))
	pb.RegisterDistrictServiceServer(grpcServer, service.NewDistrictService(legislatorRepo))

	logger.Info("serving gRPC", "addr", ":50051")
	go func() {
		if err := grpcServer.Serve(lis); err != nil {
			log.Fatalf("gRPC server failed: %v", err)
		}
	}()

	// ---------------------------------------------------------------------------
	// gRPC-Gateway (HTTP/JSON)
	// ---------------------------------------------------------------------------
	conn, err := grpc.NewClient(
		"localhost:50051",
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		log.Fatalf("failed to dial gRPC server: %v", err)
	}
	defer conn.Close()

	gwmux := runtime.NewServeMux()

	if err := pb.RegisterBillServiceHandler(ctx, gwmux, conn); err != nil {
		log.Fatalf("failed to register BillService gateway: %v", err)
	}
	if err := pb.RegisterLegislatorServiceHandler(ctx, gwmux, conn); err != nil {
		log.Fatalf("failed to register LegislatorService gateway: %v", err)
	}
	if err := pb.RegisterDistrictServiceHandler(ctx, gwmux, conn); err != nil {
		log.Fatalf("failed to register DistrictService gateway: %v", err)
	}

	gwServer := &http.Server{
		Addr:    ":8080",
		Handler: gwmux,
	}

	logger.Info("serving gRPC-Gateway", "addr", ":8080")
	log.Fatalln(gwServer.ListenAndServe())
}
