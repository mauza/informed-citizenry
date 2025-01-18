-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_enabled BOOLEAN DEFAULT true,
    theme_preference TEXT DEFAULT 'system',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    birthdate DATE,
    street_address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    phone_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create states table
CREATE TABLE IF NOT EXISTS states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    abbreviation CHAR(2) NOT NULL,
    fips_code CHAR(2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(abbreviation),
    UNIQUE(fips_code)
);

-- Create representatives table
CREATE TABLE IF NOT EXISTS representatives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    representative_type TEXT NOT NULL CHECK (representative_type IN ('house', 'senate')),
    party TEXT,
    email TEXT,
    phone TEXT,
    website TEXT,
    twitter_handle TEXT,
    term_start DATE,
    term_end DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create house_districts table
CREATE TABLE IF NOT EXISTS house_districts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    state_id UUID NOT NULL REFERENCES states(id) ON DELETE CASCADE,
    district_number INTEGER NOT NULL,
    boundary_geojson JSONB,
    representative_id UUID REFERENCES representatives(id),
    population INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(state_id, district_number)
);

-- Create senate_seats table (since senators represent entire states)
CREATE TABLE IF NOT EXISTS senate_seats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    state_id UUID NOT NULL REFERENCES states(id) ON DELETE CASCADE,
    seat_class INTEGER NOT NULL CHECK (seat_class IN (1, 2, 3)),
    representative_id UUID REFERENCES representatives(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(state_id, seat_class)
);

-- Create bill type enum
CREATE TYPE bill_type AS ENUM (
    'HB',  -- House Bill
    'HCR', -- House Concurrent Resolution
    'HJR', -- House Joint Resolution
    'HR',  -- House Resolution
    'SB',  -- Senate Bill
    'SCR', -- Senate Concurrent Resolution
    'SJR', -- Senate Joint Resolution
    'SR'   -- Senate Resolution
);

-- Create bill status enum
CREATE TYPE bill_status AS ENUM (
    'introduced',
    'in_committee',
    'passed_committee',
    'failed_committee',
    'first_reading',
    'second_reading',
    'third_reading',
    'passed',
    'failed',
    'vetoed',
    'signed',
    'law'
);

-- Create bills table
CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_type bill_type NOT NULL,
    bill_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status bill_status NOT NULL DEFAULT 'introduced',
    session_year INTEGER NOT NULL,
    state_id UUID NOT NULL REFERENCES states(id) ON DELETE CASCADE,
    primary_sponsor_id UUID REFERENCES representatives(id),
    full_text_url TEXT,
    last_action_date TIMESTAMPTZ,
    last_action_description TEXT,
    fiscal_note_url TEXT,
    effective_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(bill_type, bill_number, session_year, state_id)
);

-- Create bill_cosponsors table for many-to-many relationship
CREATE TABLE IF NOT EXISTS bill_cosponsors (
    bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
    representative_id UUID REFERENCES representatives(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (bill_id, representative_id)
);

-- Create bill_votes table
CREATE TABLE IF NOT EXISTS bill_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    representative_id UUID NOT NULL REFERENCES representatives(id) ON DELETE CASCADE,
    vote TEXT NOT NULL CHECK (vote IN ('yea', 'nay', 'absent', 'present')),
    vote_date TIMESTAMPTZ NOT NULL,
    reading_number INTEGER CHECK (reading_number IN (1, 2, 3)),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create bill_committees table
CREATE TABLE IF NOT EXISTS bill_committees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    state_id UUID NOT NULL REFERENCES states(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create bill_committee_assignments table
CREATE TABLE IF NOT EXISTS bill_committee_assignments (
    bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
    committee_id UUID REFERENCES bill_committees(id) ON DELETE CASCADE,
    assignment_date TIMESTAMPTZ NOT NULL,
    status TEXT CHECK (status IN ('pending', 'passed', 'failed', 'substituted')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (bill_id, committee_id)
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_representatives_updated_at
    BEFORE UPDATE ON representatives
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_states_updated_at
    BEFORE UPDATE ON states
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_house_districts_updated_at
    BEFORE UPDATE ON house_districts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_senate_seats_updated_at
    BEFORE UPDATE ON senate_seats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bills_updated_at
    BEFORE UPDATE ON bills
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bill_committees_updated_at
    BEFORE UPDATE ON bill_committees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bill_committee_assignments_updated_at
    BEFORE UPDATE ON bill_committee_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS (Row Level Security) policies
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE representatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE states ENABLE ROW LEVEL SECURITY;
ALTER TABLE house_districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE senate_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_cosponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_committees ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_committee_assignments ENABLE ROW LEVEL SECURITY;

-- Settings policies
CREATE POLICY "Users can view their own settings"
    ON settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
    ON settings FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
    ON settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- User profiles policies
CREATE POLICY "Users can view their own profile"
    ON user_profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
    ON user_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Representatives policies (publicly readable)
CREATE POLICY "Representatives are publicly readable"
    ON representatives FOR SELECT
    TO PUBLIC
    USING (true);

-- States policies (publicly readable)
CREATE POLICY "States are publicly readable"
    ON states FOR SELECT
    TO PUBLIC
    USING (true);

-- House districts policies (publicly readable)
CREATE POLICY "House districts are publicly readable"
    ON house_districts FOR SELECT
    TO PUBLIC
    USING (true);

-- Senate seats policies (publicly readable)
CREATE POLICY "Senate seats are publicly readable"
    ON senate_seats FOR SELECT
    TO PUBLIC
    USING (true);

-- Bills policies (publicly readable)
CREATE POLICY "Bills are publicly readable"
    ON bills FOR SELECT
    TO PUBLIC
    USING (true);

CREATE POLICY "Bill cosponsors are publicly readable"
    ON bill_cosponsors FOR SELECT
    TO PUBLIC
    USING (true);

CREATE POLICY "Bill votes are publicly readable"
    ON bill_votes FOR SELECT
    TO PUBLIC
    USING (true);

CREATE POLICY "Bill committees are publicly readable"
    ON bill_committees FOR SELECT
    TO PUBLIC
    USING (true);

CREATE POLICY "Bill committee assignments are publicly readable"
    ON bill_committee_assignments FOR SELECT
    TO PUBLIC
    USING (true);

-- Create trigger functions for representative type checking
CREATE OR REPLACE FUNCTION check_house_representative()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.representative_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM representatives
            WHERE id = NEW.representative_id
            AND representative_type = 'house'
        ) THEN
            RAISE EXCEPTION 'Representative must be of type house';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_senate_representative()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.representative_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM representatives
            WHERE id = NEW.representative_id
            AND representative_type = 'senate'
        ) THEN
            RAISE EXCEPTION 'Representative must be of type senate';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER ensure_house_representative
    BEFORE INSERT OR UPDATE ON house_districts
    FOR EACH ROW
    EXECUTE FUNCTION check_house_representative();

CREATE TRIGGER ensure_senate_representative
    BEFORE INSERT OR UPDATE ON senate_seats
    FOR EACH ROW
    EXECUTE FUNCTION check_senate_representative();
