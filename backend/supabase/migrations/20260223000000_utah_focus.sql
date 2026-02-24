-- MAU-19: Focus on Utah Legislature
-- Drop all federal/multi-state tables in reverse dependency order.

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

-- Drop triggers that reference removed tables (already gone with tables, but clean up functions)
DROP FUNCTION IF EXISTS check_house_representative() CASCADE;
DROP FUNCTION IF EXISTS check_senate_representative() CASCADE;

-- ---------------------------------------------------------------------------
-- Utah Legislators
-- Covers both chambers: house (75 districts) and senate (29 districts).
-- ---------------------------------------------------------------------------
CREATE TABLE utah_legislators (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chamber             TEXT NOT NULL CHECK (chamber IN ('house', 'senate')),
    district_number     INTEGER NOT NULL,
    first_name          TEXT NOT NULL,
    last_name           TEXT NOT NULL,
    party               TEXT,
    email               TEXT,
    phone               TEXT,
    website             TEXT,
    image_url           TEXT,
    term_start          DATE,
    term_end            DATE,
    utah_legislature_id TEXT,   -- ID from glen.le.utah.gov
    legiscan_id         INTEGER,
    openstates_id       TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (chamber, district_number)
);

-- ---------------------------------------------------------------------------
-- Utah Bills
-- ---------------------------------------------------------------------------
CREATE TABLE utah_bills (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_number         TEXT NOT NULL,      -- e.g. "HB0001"
    bill_type           TEXT NOT NULL,      -- HB, SB, HCR, SCR, HJR, SJR, HR, SR
    session_year        INTEGER NOT NULL,   -- e.g. 2026
    title               TEXT NOT NULL,
    description         TEXT,
    status              TEXT NOT NULL DEFAULT 'introduced',
    sponsor_id          UUID REFERENCES utah_legislators(id),
    full_text_url       TEXT,
    last_action         TEXT,
    last_action_date    TIMESTAMPTZ,
    fiscal_note_url     TEXT,
    effective_date      DATE,
    utah_legislature_id TEXT,
    legiscan_id         INTEGER,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (bill_number, session_year)
);

-- ---------------------------------------------------------------------------
-- Bill sponsors (primary + co-sponsors)
-- ---------------------------------------------------------------------------
CREATE TABLE utah_bill_sponsors (
    bill_id        UUID REFERENCES utah_bills(id) ON DELETE CASCADE,
    legislator_id  UUID REFERENCES utah_legislators(id) ON DELETE CASCADE,
    sponsor_type   TEXT NOT NULL CHECK (sponsor_type IN ('primary', 'cosponsor')),
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (bill_id, legislator_id)
);

-- ---------------------------------------------------------------------------
-- Bill votes (per-legislator roll-call votes)
-- ---------------------------------------------------------------------------
CREATE TABLE utah_bill_votes (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id              UUID NOT NULL REFERENCES utah_bills(id) ON DELETE CASCADE,
    legislator_id        UUID NOT NULL REFERENCES utah_legislators(id) ON DELETE CASCADE,
    vote                 TEXT NOT NULL CHECK (vote IN ('yea', 'nay', 'absent', 'present')),
    vote_date            TIMESTAMPTZ NOT NULL,
    chamber              TEXT NOT NULL CHECK (chamber IN ('house', 'senate')),
    legiscan_roll_call_id INTEGER,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (bill_id, legislator_id, vote_date, chamber)
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
CREATE TRIGGER update_utah_legislators_updated_at
    BEFORE UPDATE ON utah_legislators
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_utah_bills_updated_at
    BEFORE UPDATE ON utah_bills
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE utah_legislators ENABLE ROW LEVEL SECURITY;
ALTER TABLE utah_bills       ENABLE ROW LEVEL SECURITY;
ALTER TABLE utah_bill_sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE utah_bill_votes  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utah legislators are publicly readable"
    ON utah_legislators FOR SELECT TO PUBLIC USING (true);

CREATE POLICY "Utah bills are publicly readable"
    ON utah_bills FOR SELECT TO PUBLIC USING (true);

CREATE POLICY "Utah bill sponsors are publicly readable"
    ON utah_bill_sponsors FOR SELECT TO PUBLIC USING (true);

CREATE POLICY "Utah bill votes are publicly readable"
    ON utah_bill_votes FOR SELECT TO PUBLIC USING (true);
