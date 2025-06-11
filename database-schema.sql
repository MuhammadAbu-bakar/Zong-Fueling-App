
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('fueler', 'cto')),
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Sites table
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id TEXT UNIQUE NOT NULL,
  last_fueling_date TIMESTAMP WITH TIME ZONE NOT NULL,
  fuel_capacity DECIMAL NOT NULL,
  current_fuel_level DECIMAL NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tickets table
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id TEXT NOT NULL,
  fueler_id UUID REFERENCES users(id),
  ticket_type TEXT NOT NULL CHECK (ticket_type IN ('uplift', 'dispersion')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'closed')),
  initiated BOOLEAN DEFAULT false,
  fuel_consumption DECIMAL,
  consumption_percentage DECIMAL,
  cto_comments TEXT,
  fueler_input JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert sample data
INSERT INTO sites (site_id, last_fueling_date, fuel_capacity, current_fuel_level) VALUES
('SITE001', '2024-01-01', 10000, 8500),
('SITE002', '2024-01-10', 15000, 7500),
('SITE003', '2024-01-15', 8000, 6000);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Sites are viewable by authenticated users" ON sites
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Tickets are viewable by owner or CTO" ON tickets
  FOR SELECT TO authenticated USING (
    fueler_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'cto')
  );

CREATE POLICY "Fuelers can create tickets" ON tickets
  FOR INSERT TO authenticated WITH CHECK (
    fueler_id = auth.uid() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'fueler' AND approved = true)
  );

CREATE POLICY "CTOs can update tickets" ON tickets
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'cto')
  );
