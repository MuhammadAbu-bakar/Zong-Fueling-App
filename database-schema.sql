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

-- Create the fueling_history table
CREATE TABLE public.fueling_history (
    "Ticket Category" text NULL,
    "Ticket No" text NULL,
    "Request Title" text NULL,
    "Create Time" text NULL,
    "Current Node" text NULL,
    "Site ID Name" text NULL,
    "Manager Approval" text NULL,
    "RCTO Approval" text NULL,
    "Site in Manual Approval List" text NULL,
    "Site in Auto Approval List" text NULL,
    "Created By" text NULL,
    "Auto Approval" text NULL,
    "Only Need Manager Approval" text NULL,
    "Fuel Prediction (With No. of Days) (Ltrs)" text NULL,
    "Available Fuel in Tank (Ltrs)" double precision NULL,
    "Fueling Team Name" text NULL,
    "Fueling Team (Before)" text NULL,
    "Fueler Name" text NULL,
    "Fueler Phone" bigint NULL,
    "Refueling Time" text NULL,
    "Refueling Time (Before)" text NULL,
    "Left Fuel in Vehicle" text NULL,
    "Current DG Meter Status" text NULL,
    "DG Label No." text NULL,
    "DG Capacity (KVA)" double precision NULL,
    "Internal Tank Capacity (L)" text NULL,
    "External Tank Capacity (L)" text NULL,
    "DG Hour Meter Reading" text NULL,
    "DG Hour Meter Reading (Before)" text NULL,
    "Before Filling Fuel Quantity" text NULL,
    "Before Filling Fuel Quantity (Before)" text NULL,
    "Fuel Quantity Filled" bigint NULL,
    "Fuel Quantity Filled (Before)" bigint NULL,
    "Remark" text NULL,
    "CDR Status" text NULL,
    "CDR Site" bigint NULL,
    "Region" text NULL,
    "Current Site Status" text NULL,
    "NE in Core Location" text NULL,
    "Request Fuel Quantity" text NULL,
    "Fueling Required Date" text NULL,
    "Approve Fuel Quantity" text NULL,
    "Refueling Date" text NULL,
    "Total Fuel" bigint NULL,
    "Site ID + Date" text NOT NULL,
    CONSTRAINT fueling_history_pkey PRIMARY KEY ("Site ID + Date")
) TABLESPACE pg_default;

-- Add RLS policy
ALTER TABLE public.fueling_history ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read fueling history
CREATE POLICY "Allow authenticated users to read fueling history"
    ON public.fueling_history
    FOR SELECT
    TO authenticated
    USING (true);

-- Sample data for testing
INSERT INTO public.fueling_history (
    "Site ID Name",
    "Available Fuel in Tank (Ltrs)",
    "Total Fuel",
    "Fueling Team Name",
    "Fueler Name",
    "Refueling Time",
    "DG Capacity (KVA)",
    "Internal Tank Capacity (L)",
    "External Tank Capacity (L)",
    "Fuel Quantity Filled",
    "Region",
    "Current Site Status",
    "Site ID + Date"
) VALUES (
    '4010',
    800.5,
    1000,
    'Team Alpha',
    'John Doe',
    '2024-03-20 10:30:00',
    75.5,
    '500L',
    '1000L',
    200,
    'North',
    'Active',
    '4010_2024-03-20'
);

-- Table to store RM contact information for WhatsApp alerts
CREATE TABLE rm_contacts (
    id SERIAL PRIMARY KEY,
    grid VARCHAR(50) NOT NULL UNIQUE,
    phone_number VARCHAR(20) NOT NULL,
    rm_name VARCHAR(100) NOT NULL,
    rm_email VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add RLS policies for rm_contacts
ALTER TABLE rm_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to rm_contacts for authenticated users" 
    ON rm_contacts FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Allow insert/update access to rm_contacts for admin users" 
    ON rm_contacts FOR ALL 
    TO authenticated 
    USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Contact Numbers table for storing phone numbers
CREATE TABLE public."Contact Numbers" (
  "Contact" bigint generated by default as identity not null,
  created_at timestamp with time zone not null default now(),
  constraint "Contact Numbers_pkey" primary key ("Contact")
) TABLESPACE pg_default;

-- Add RLS policy for Contact Numbers
ALTER TABLE public."Contact Numbers" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to Contact Numbers for authenticated users" 
    ON public."Contact Numbers" FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Allow insert/update access to Contact Numbers for admin users" 
    ON public."Contact Numbers" FOR ALL 
    TO authenticated 
    USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- SMS Contacts table for managing RM, GTL, and Security contacts
CREATE TABLE sms_contacts (
    id SERIAL PRIMARY KEY,
    role VARCHAR(20) NOT NULL CHECK (role IN ('rm', 'gtl', 'security')),
    phone_number VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    contact_id bigint REFERENCES public."Contact Numbers"("Contact"),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SMS Logs table for tracking sent SMS alerts
CREATE TABLE sms_logs (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(10) NOT NULL CHECK (status IN ('sent', 'failed')),
    site_id VARCHAR(50) NOT NULL,
    grid VARCHAR(50) NOT NULL,
    deviation_value DECIMAL(10,2) NOT NULL,
    fueler_name VARCHAR(100) NOT NULL,
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add RLS policies for sms_contacts
ALTER TABLE sms_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to sms_contacts for authenticated users" 
    ON sms_contacts FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Allow insert/update access to sms_contacts for admin users" 
    ON sms_contacts FOR ALL 
    TO authenticated 
    USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Add RLS policies for sms_logs
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to sms_logs for authenticated users" 
    ON sms_logs FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Allow insert access to sms_logs for authenticated users" 
    ON sms_logs FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

-- Insert sample contact numbers
INSERT INTO public."Contact Numbers" ("Contact") VALUES
(03216889422),
(03001234567),
(03009876543),
(03005556666),
(03001112222),
(03003334444);

-- Insert sample SMS contacts with references to Contact Numbers
INSERT INTO sms_contacts (role, phone_number, name, email, contact_id) VALUES
('rm', '03216889422', 'RM Contact 1', 'rm1@company.com', 1),
('rm', '03001234567', 'RM Contact 2', 'rm2@company.com', 2),
('gtl', '03009876543', 'GTL Contact 1', 'gtl1@company.com', 3),
('gtl', '03005556666', 'GTL Contact 2', 'gtl2@company.com', 4),
('security', '03001112222', 'Security Contact 1', 'security1@company.com', 5),
('security', '03003334444', 'Security Contact 2', 'security2@company.com', 6);

-- Create indexes for better performance
CREATE INDEX idx_contact_numbers_contact ON public."Contact Numbers"("Contact");
CREATE INDEX idx_sms_contacts_role ON sms_contacts(role);
CREATE INDEX idx_sms_contacts_active ON sms_contacts(is_active);
CREATE INDEX idx_sms_contacts_contact_id ON sms_contacts(contact_id);
CREATE INDEX idx_sms_logs_sent_at ON sms_logs(sent_at);
CREATE INDEX idx_sms_logs_status ON sms_logs(status);
CREATE INDEX idx_sms_logs_site_id ON sms_logs(site_id);
