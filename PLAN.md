# MAU-19: Focus Backend on Utah Legislature

## Overview

Refocus the backend entirely on Utah state legislation. Remove all non-Utah code (federal Congress fetching, Washington state scraper), research and integrate the official Utah Legislature API, and redesign the backend with functional design and loose coupling so the frontend can be supported and the system can be extended later.

---

## Current State Audit

### What Exists (and what's wrong with it)

| File | Problem |
|---|---|
| `backend/api/internal/jobs/districts/main.go` | Uses **ProPublica API** to fetch **US Congress** (federal) members — entirely wrong data source |
| `backend/api/internal/jobs/bills/main.go` | Has `StateLegislatureScraper` interface with a **Washington state** stub (never implemented) |
| `backend/api/main.go` | `GetDistrictFromLocation` is a hardcoded stub returning "Example District" |
| `backend/supabase/migrations/202501172211_initial.sql` | Schema has `senate_seats` with `seat_class` (1/2/3) — that is a federal Senate concept, not state; has `states` table for all 50 states; `representatives` table doesn't distinguish federal vs state |
| `backend/api/proto/v1/districts.proto` | Only has district service; no bills or legislators endpoints for the frontend |

### What Must Be Kept / Extended

| Asset | Keep? | Notes |
|---|---|---|
| gRPC + grpc-gateway stack | Yes | Good choice for mobile+web |
| buf.yaml / buf.gen.yaml | Yes | Works well |
| Supabase / Postgres | Yes | Already set up |
| `go.mod` | Yes, extend | Add `net/http` clients if needed |
| Flutter frontend | No changes in this issue | But must ensure API contract supports it |

---

## Data Source Research Summary

### Primary Source: Official Utah Legislature API (`glen.le.utah.gov`)

- **Free** — requires developer token (register at `le.utah.gov/tracking/trackingLogin`)
- **Base URL:** `https://glen.le.utah.gov`
- **Token:** appended in URL path, e.g. `https://glen.le.utah.gov/bills/2026GS/billlist/<token>`
- **Data Format:** JSON (bills, legislators, committees), XML (code/statutes)
- **Rate limits (self-imposed by docs):** Bills — once/hour; Legislators — once/day

**Key Endpoints:**
```
GET /legislators/<token>                            # all current legislators
GET /legislator/<LegislatorID>/<token>              # single legislator
GET /legislator/<Chamber>/<DistrictNumber>/<token>  # by chamber+district (H or S)
GET /bills/<session>/billlist/<token>               # all bills (e.g., session = "2026GS")
GET /bills/<session>/<billID>/<token>               # single bill (e.g., "HB0001")
GET /bills/<session>/passedlist/<token>             # passed bills only
```

### Secondary Source: LegiScan API (for roll-call votes)

- **Free tier:** 30,000 queries/month
- Utah coverage: Full, including 2026 General Session
- Use for: `getRollCall`, `getBill` (vote records not in official Utah API)
- API key env var: `LEGISCAN_API_KEY`

### Tertiary Source: OpenStates Bulk CSV (no auth required)

- Nightly CSV of current Utah legislators with contact info
- URL: `https://data.openstates.org/people/current/ut.csv`
- Useful for seeding legislator data without API key

---

## Target Architecture

### Design Principles

1. **Domain layer is pure** — no DB, no HTTP, just Go structs
2. **Repository interfaces** decouple service from DB implementation
3. **Source adapters** decouple jobs from specific external APIs
4. **Jobs are standalone binaries** — can be run by cron/scheduler independently of the API server
5. **gRPC services** depend only on repository interfaces (testable, mockable)

### Directory Structure

```
backend/api/
├── main.go                              # gRPC + HTTP gateway server
├── proto/v1/
│   ├── bills.proto                      # NEW: BillService
│   ├── legislators.proto                # NEW: LegislatorService
│   └── districts.proto                  # UPDATE: richer District model
├── gen/go/proto/v1/                     # Auto-generated (buf generate)
├── internal/
│   ├── domain/                          # Pure types, no dependencies
│   │   ├── bill.go
│   │   ├── legislator.go
│   │   └── district.go
│   ├── repository/                      # Interfaces
│   │   ├── bill_repository.go
│   │   └── legislator_repository.go
│   ├── repository/postgres/             # Postgres implementations
│   │   ├── bill_repository.go
│   │   └── legislator_repository.go
│   ├── sources/
│   │   └── utah_legislature/            # glen.le.utah.gov client
│   │       └── client.go                # FetchBills, FetchLegislators
│   ├── service/                         # gRPC handlers (use repo interfaces)
│   │   ├── bill_service.go
│   │   ├── legislator_service.go
│   │   └── district_service.go
│   └── jobs/
│       ├── bills/
│       │   └── main.go                  # Ingestion: Utah bills -> DB
│       └── legislators/
│           └── main.go                  # Ingestion: Utah legislators -> DB
└── supabase/
    └── migrations/
        └── YYYYMMDD_utah_focus.sql      # New migration
```

---

## Database Schema Changes

### New Migration: Utah-Focused Schema

Replace the multi-state federal schema with a Utah-centric design:

```sql
-- Drop federal-specific tables (in dependency order)
DROP TABLE IF EXISTS bill_committee_assignments;
DROP TABLE IF EXISTS bill_committees;
DROP TABLE IF EXISTS bill_votes;
DROP TABLE IF EXISTS bill_cosponsors;
DROP TABLE IF EXISTS bills;
DROP TYPE IF EXISTS bill_status;
DROP TYPE IF EXISTS bill_type;
DROP TABLE IF EXISTS senate_seats;
DROP TABLE IF EXISTS house_districts;
DROP TABLE IF EXISTS representatives;
DROP TABLE IF EXISTS states;

-- Utah Legislators
-- Covers both chambers (house = 75 districts, senate = 29 districts)
CREATE TABLE utah_legislators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chamber TEXT NOT NULL CHECK (chamber IN ('house', 'senate')),
    district_number INTEGER NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    party TEXT,
    email TEXT,
    phone TEXT,
    website TEXT,
    image_url TEXT,
    term_start DATE,
    term_end DATE,
    utah_legislature_id TEXT,   -- ID from glen.le.utah.gov
    legiscan_id INTEGER,
    openstates_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(chamber, district_number)
);

-- Utah Bills
CREATE TABLE utah_bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_number TEXT NOT NULL,      -- e.g. "HB0001"
    bill_type TEXT NOT NULL,        -- HB, SB, HCR, SCR, HJR, SJR, HR, SR
    session_year INTEGER NOT NULL,  -- e.g. 2026
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'introduced',
    sponsor_id UUID REFERENCES utah_legislators(id),
    full_text_url TEXT,
    last_action TEXT,
    last_action_date TIMESTAMPTZ,
    fiscal_note_url TEXT,
    effective_date DATE,
    utah_legislature_id TEXT,
    legiscan_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(bill_number, session_year)
);

-- Bill Sponsors (many-to-many: primary + cosponsors)
CREATE TABLE utah_bill_sponsors (
    bill_id UUID REFERENCES utah_bills(id) ON DELETE CASCADE,
    legislator_id UUID REFERENCES utah_legislators(id) ON DELETE CASCADE,
    sponsor_type TEXT NOT NULL CHECK (sponsor_type IN ('primary', 'cosponsor')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (bill_id, legislator_id)
);

-- Bill Votes (per-legislator votes on a bill)
CREATE TABLE utah_bill_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID NOT NULL REFERENCES utah_bills(id) ON DELETE CASCADE,
    legislator_id UUID NOT NULL REFERENCES utah_legislators(id) ON DELETE CASCADE,
    vote TEXT NOT NULL CHECK (vote IN ('yea', 'nay', 'absent', 'present')),
    vote_date TIMESTAMPTZ NOT NULL,
    chamber TEXT NOT NULL CHECK (chamber IN ('house', 'senate')),
    legiscan_roll_call_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(bill_id, legislator_id, vote_date, chamber)
);
```

Keep existing tables: `settings`, `user_profiles` (user data is unchanged).

---

## Proto Changes

### `proto/v1/legislators.proto` (NEW)

```protobuf
service LegislatorService {
  rpc ListLegislators(ListLegislatorsRequest) returns (ListLegislatorsResponse) {
    option (google.api.http) = { get: "/v1/legislators" };
  }
  rpc GetLegislator(GetLegislatorRequest) returns (GetLegislatorResponse) {
    option (google.api.http) = { get: "/v1/legislators/{id}" };
  }
}
// Legislator message: id, chamber, district_number, first_name, last_name, party,
//                    email, phone, website, image_url
// ListLegislatorsRequest filters: chamber (optional)
```

### `proto/v1/bills.proto` (NEW)

```protobuf
service BillService {
  rpc ListBills(ListBillsRequest) returns (ListBillsResponse) {
    option (google.api.http) = { get: "/v1/bills" };
  }
  rpc GetBill(GetBillRequest) returns (GetBillResponse) {
    option (google.api.http) = { get: "/v1/bills/{id}" };
  }
}
// Bill message: id, bill_number, bill_type, session_year, title, description,
//              status, sponsor (embedded Legislator), full_text_url,
//              last_action, last_action_date, fiscal_note_url
// ListBillsRequest filters: session_year, status, chamber, sponsor_id, page, page_size
```

### `proto/v1/districts.proto` (UPDATE)

Enrich `District` to include the legislator for that district:

```protobuf
message District {
  string district_id = 1;
  string name = 2;
  string chamber = 3;          // "house" or "senate"
  int32 district_number = 4;
  Legislator legislator = 5;   // embedded legislator
}
// GetDistrictFromLocation returns both the house and senate representatives
// for a given location
message GetDistrictFromLocationResponse {
  District house_district = 1;
  District senate_district = 2;
}
```

---

## Implementation Steps

### Step 1: Database Migration

Create `backend/supabase/migrations/YYYYMMDD_utah_focus.sql`:
- Drop multi-state federal tables in dependency order
- Create `utah_legislators`, `utah_bills`, `utah_bill_sponsors`, `utah_bill_votes`
- Add `updated_at` triggers
- Add RLS policies (public read for all legislative data)

### Step 2: Domain Types

Create `backend/api/internal/domain/`:
- `legislator.go` — `Legislator` struct (pure Go, no DB/HTTP tags)
- `bill.go` — `Bill` struct with `Sponsor *Legislator`
- `district.go` — `District` struct with `Legislator *Legislator`

### Step 3: Repository Interfaces

Create `backend/api/internal/repository/`:
- `bill_repository.go` — `BillRepository` interface:
  - `ListBills(ctx, filters BillFilters) ([]Bill, error)`
  - `GetBill(ctx, id string) (*Bill, error)`
  - `UpsertBill(ctx, bill Bill) error`
- `legislator_repository.go` — `LegislatorRepository` interface:
  - `ListLegislators(ctx, chamber string) ([]Legislator, error)`
  - `GetLegislator(ctx, id string) (*Legislator, error)`
  - `GetLegislatorByDistrict(ctx, chamber string, districtNum int) (*Legislator, error)`
  - `UpsertLegislator(ctx, legislator Legislator) error`

### Step 4: Postgres Repository Implementations

Create `backend/api/internal/repository/postgres/`:
- `bill_repository.go` — implements `BillRepository` using `pgx`
- `legislator_repository.go` — implements `LegislatorRepository` using `pgx`

### Step 5: Utah Legislature API Source Adapter

Create `backend/api/internal/sources/utah_legislature/client.go`:
- `Client` struct with `baseURL string`, `token string`
- `NewClient(token string) *Client`
- `FetchLegislators(ctx) ([]domain.Legislator, error)` — calls `/legislators/<token>`
- `FetchBills(ctx, session string) ([]domain.Bill, error)` — calls `/bills/<session>/billlist/<token>`
- `FetchBill(ctx, session, billID string) (*domain.Bill, error)` — calls `/bills/<session>/<billID>/<token>`
- `CurrentSession() string` — returns e.g. "2026GS" based on current date

### Step 6: Rewrite Ingestion Jobs

**Delete:**
- `backend/api/internal/jobs/districts/main.go` (ProPublica federal fetcher — entirely wrong)

**Rewrite `backend/api/internal/jobs/bills/main.go`:**
- Remove `WashingtonScraper`, `StateLegislatureScraper` interface, `determineSeatClass`
- Instantiate `utah_legislature.Client` from `UTAH_LEGISLATURE_TOKEN` env var
- Call `FetchBills(ctx, client.CurrentSession())`
- Upsert each bill via `postgres.BillRepository`
- Use `log/slog` for structured logging

**Create `backend/api/internal/jobs/legislators/main.go`:**
- Instantiate `utah_legislature.Client`
- Call `FetchLegislators(ctx)`
- Upsert each legislator via `postgres.LegislatorRepository`

### Step 7: gRPC Service Handlers

Create `backend/api/internal/service/`:
- `bill_service.go` — implements `BillServiceServer`; takes `repository.BillRepository` in constructor
- `legislator_service.go` — implements `LegislatorServiceServer`; takes `repository.LegislatorRepository`
- `district_service.go` — implements `DistrictServiceServer`; takes `repository.LegislatorRepository`; implements `GetDistrictFromLocation` by looking up which Utah house+senate district a lat/lng falls in (initially can use district number lookup from user profile address; full geo lookup is future work)

### Step 8: New Proto Definitions + `buf generate`

- Write `proto/v1/bills.proto`
- Write `proto/v1/legislators.proto`
- Update `proto/v1/districts.proto`
- Run `buf generate` from `backend/api/` to regenerate `gen/go/` and `gen/openapiv2/`

### Step 9: Update `main.go`

Wire all services via dependency injection:
```go
db := connectDB(os.Getenv("DATABASE_URL"))
billRepo := postgres.NewBillRepository(db)
legislatorRepo := postgres.NewLegislatorRepository(db)

s := grpc.NewServer()
pb.RegisterBillServiceServer(s, service.NewBillService(billRepo))
pb.RegisterLegislatorServiceServer(s, service.NewLegislatorService(legislatorRepo))
pb.RegisterDistrictServiceServer(s, service.NewDistrictService(legislatorRepo))
```

### Step 10: Environment Variables

Document required env vars:
```
DATABASE_URL                 # Supabase Postgres connection string
UTAH_LEGISLATURE_TOKEN       # Developer token from le.utah.gov
LEGISCAN_API_KEY             # Optional: for vote data from LegiScan
```

---

## What Code Is Removed

| File | Action | Reason |
|---|---|---|
| `internal/jobs/districts/main.go` | **Delete** | Fetches US Congress via ProPublica — wrong scope |
| `internal/jobs/bills/main.go` (full file) | **Rewrite** | Replace Washington stub with Utah implementation |
| `struct WashingtonScraper` | Removed via rewrite | Wrong state |
| `interface StateLegislatureScraper` | Removed via rewrite | Replace with Utah-specific source adapter |
| `func determineSeatClass` | Removed via rewrite | Federal Senate seat class — irrelevant to Utah |
| DB tables: `senate_seats`, `house_districts`, `representatives`, `states`, `bills`, `bill_*` | **Dropped in migration** | Federal/multi-state schema replaced by Utah-specific |

---

## API Endpoints (HTTP via grpc-gateway)

| Method | Path | Description |
|---|---|---|
| `GET` | `/v1/legislators` | List all Utah legislators (filter by `?chamber=house\|senate`) |
| `GET` | `/v1/legislators/{id}` | Get a specific legislator |
| `GET` | `/v1/bills` | List bills (filter by `session_year`, `status`, `chamber`, `sponsor_id`) |
| `GET` | `/v1/bills/{id}` | Get a specific bill with sponsor info |
| `GET` | `/v1/districts/location?lat={lat}&lng={lng}` | Find your house+senate reps by GPS location |

---

## Frontend API Contract Notes

The Flutter app currently has auth and profile screens. The next screens it will need:
1. **Bills feed** — `GET /v1/bills` with pagination (`page`, `page_size`)
2. **Legislator lookup** — `GET /v1/districts/location` (device GPS or address from profile)
3. **Bill detail** — `GET /v1/bills/{id}`

The `Bill` proto message embeds the sponsor `Legislator` inline so the app can render without secondary fetches. The `GetDistrictFromLocationResponse` returns both house and senate districts inline.

---

## Extensibility Notes

The architecture supports adding other states later:
- Add a new source adapter under `internal/sources/<state>/`
- Add a new job binary under `internal/jobs/<state>_bills/`, `internal/jobs/<state>_legislators/`
- The repository interfaces are generic and state-agnostic
- DB tables can be generalized by adding a `state` column when needed

The `glen.le.utah.gov` API is marked "experimental" by Utah — the source adapter pattern means we can swap to LegiScan or OpenStates without touching service or repository layers.

---

## Relevant Files

### Files to Delete
- `backend/api/internal/jobs/districts/main.go`

### Files to Rewrite
- `backend/api/internal/jobs/bills/main.go`
- `backend/api/main.go`
- `backend/api/proto/v1/districts.proto`

### Files to Create
- `backend/supabase/migrations/YYYYMMDD_utah_focus.sql`
- `backend/api/proto/v1/bills.proto`
- `backend/api/proto/v1/legislators.proto`
- `backend/api/internal/domain/bill.go`
- `backend/api/internal/domain/legislator.go`
- `backend/api/internal/domain/district.go`
- `backend/api/internal/repository/bill_repository.go` (interface)
- `backend/api/internal/repository/legislator_repository.go` (interface)
- `backend/api/internal/repository/postgres/bill_repository.go`
- `backend/api/internal/repository/postgres/legislator_repository.go`
- `backend/api/internal/sources/utah_legislature/client.go`
- `backend/api/internal/jobs/legislators/main.go`
- `backend/api/internal/service/bill_service.go`
- `backend/api/internal/service/legislator_service.go`
- `backend/api/internal/service/district_service.go`

### Auto-generated (after `buf generate`)
- `backend/api/gen/go/proto/v1/bills.pb.go` + `_grpc.pb.go` + `.pb.gw.go`
- `backend/api/gen/go/proto/v1/legislators.pb.go` + `_grpc.pb.go` + `.pb.gw.go`
- `backend/api/gen/openapiv2/proto/v1/bills.swagger.json`
- `backend/api/gen/openapiv2/proto/v1/legislators.swagger.json`
