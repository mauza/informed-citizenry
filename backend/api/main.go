package main

import (
	"context"
	"log/slog"
	"net"
	"os"

	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	pocketbaseSDK "github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/types"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	pb "api/gen/go/proto/v1"
	"api/internal/repository/pocketbase"
	"api/internal/service"
)

func main() {
	ctx := context.Background()
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	// ---------------------------------------------------------------------------
	// Initialize PocketBase
	// ---------------------------------------------------------------------------
	dataDir := os.Getenv("POCKETBASE_DATA_DIR")
	if dataDir == "" {
		dataDir = "./pb_data"
	}

	app := pocketbaseSDK.NewWithConfig(pocketbaseSDK.Config{
		DefaultDataDir: dataDir,
	})

	// ---------------------------------------------------------------------------
	// Setup collections and start gRPC server on serve
	// ---------------------------------------------------------------------------
	app.OnServe().BindFunc(func(e *core.ServeEvent) error {
		if err := setupCollections(app); err != nil {
			logger.Error("failed to setup collections", "error", err)
			return err
		}

		// Create repositories using PocketBase
		billRepo := pocketbase.NewBillRepository(app)
		legislatorRepo := pocketbase.NewLegislatorRepository(app)

		// Start gRPC server
		lis, err := net.Listen("tcp", ":50051")
		if err != nil {
			return err
		}

		grpcServer := grpc.NewServer()
		pb.RegisterBillServiceServer(grpcServer, service.NewBillService(billRepo))
		pb.RegisterLegislatorServiceServer(grpcServer, service.NewLegislatorService(legislatorRepo))
		pb.RegisterDistrictServiceServer(grpcServer, service.NewDistrictService(legislatorRepo))

		logger.Info("serving gRPC", "addr", ":50051")
		go func() {
			if err := grpcServer.Serve(lis); err != nil {
				logger.Error("gRPC server failed", "error", err)
			}
		}()

		// Start gRPC-Gateway
		// SECURITY NOTE: Using insecure credentials is acceptable here because this
		// is internal communication between the gRPC-Gateway and the gRPC server
		// running on localhost. In production, consider using mutual TLS.
		conn, err := grpc.NewClient(
			"localhost:50051",
			grpc.WithTransportCredentials(insecure.NewCredentials()),
		)
		if err != nil {
			return err
		}

		gwmux := runtime.NewServeMux()

		if err := pb.RegisterBillServiceHandler(ctx, gwmux, conn); err != nil {
			return err
		}
		if err := pb.RegisterLegislatorServiceHandler(ctx, gwmux, conn); err != nil {
			return err
		}
		if err := pb.RegisterDistrictServiceHandler(ctx, gwmux, conn); err != nil {
			return err
		}

		// Mount gRPC-Gateway on PocketBase router
		e.Router.Any("/api/v1/{path...}", func(c *core.RequestEvent) error {
			gwmux.ServeHTTP(c.Response, c.Request)
			return nil
		})

		logger.Info("serving gRPC-Gateway", "addr", "/api/v1")
		return e.Next()
	})

	// ---------------------------------------------------------------------------
	// Start PocketBase (handles graceful shutdown internally)
	// ---------------------------------------------------------------------------
	logger.Info("starting PocketBase")
	if err := app.Start(); err != nil {
		logger.Error("failed to start app", "error", err)
		os.Exit(1)
	}
}

// setupCollections creates the legislators and bills collections if they don't exist,
// or updates their schema if they do. This is idempotent.
func setupCollections(app core.App) error {
	// Create or update legislators collection
	legislators, err := app.FindCollectionByNameOrId("legislators")
	if err != nil {
		legislators = core.NewBaseCollection("legislators")
	}

	legislators.Fields = core.NewFieldsList(
		&core.TextField{Name: "chamber", Required: true, Max: 10},
		&core.NumberField{Name: "district_number", Required: true},
		&core.TextField{Name: "first_name", Required: true, Max: 100},
		&core.TextField{Name: "last_name", Required: true, Max: 100},
		&core.TextField{Name: "party", Max: 50},
		&core.EmailField{Name: "email"},
		&core.TextField{Name: "phone", Max: 20},
		&core.URLField{Name: "website"},
		&core.URLField{Name: "image_url"},
		&core.TextField{Name: "utah_legislature_id", Max: 50},
		&core.NumberField{Name: "legiscan_id"},
		&core.TextField{Name: "openstates_id", Max: 50},
	)

	// Public read, authenticated admin write
	legislators.ListRule = types.Pointer("")
	legislators.ViewRule = types.Pointer("")
	legislators.CreateRule = types.Pointer("@request.auth.id != '' && @request.auth.isAdmin = true")
	legislators.UpdateRule = types.Pointer("@request.auth.id != '' && @request.auth.isAdmin = true")
	legislators.DeleteRule = types.Pointer("@request.auth.id != '' && @request.auth.isAdmin = true")

	if err := app.Save(legislators); err != nil {
		return err
	}

	// Create or update bills collection
	bills, err := app.FindCollectionByNameOrId("bills")
	if err != nil {
		bills = core.NewBaseCollection("bills")
	}

	bills.Fields = core.NewFieldsList(
		&core.TextField{Name: "bill_number", Required: true, Max: 20},
		&core.TextField{Name: "bill_type", Required: true, Max: 10},
		&core.NumberField{Name: "session_year", Required: true},
		&core.TextField{Name: "title", Required: true, Max: 500},
		&core.TextField{Name: "description", Max: 10000},
		&core.TextField{Name: "status", Required: true, Max: 50},
		&core.RelationField{Name: "sponsor", CollectionId: legislators.Id},
		&core.URLField{Name: "full_text_url"},
		&core.TextField{Name: "last_action", Max: 500},
		&core.DateField{Name: "last_action_date"},
		&core.URLField{Name: "fiscal_note_url"},
		&core.DateField{Name: "effective_date"},
		&core.TextField{Name: "utah_legislature_id", Max: 50},
		&core.NumberField{Name: "legiscan_id"},
	)

	// Public read, authenticated admin write
	bills.ListRule = types.Pointer("")
	bills.ViewRule = types.Pointer("")
	bills.CreateRule = types.Pointer("@request.auth.id != '' && @request.auth.isAdmin = true")
	bills.UpdateRule = types.Pointer("@request.auth.id != '' && @request.auth.isAdmin = true")
	bills.DeleteRule = types.Pointer("@request.auth.id != '' && @request.auth.isAdmin = true")

	return app.Save(bills)
}
