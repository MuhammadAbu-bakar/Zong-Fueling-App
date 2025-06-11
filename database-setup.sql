
-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('fueler', 'cto')),
    approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    PRIMARY KEY (id)
);

-- Create sites table
CREATE TABLE IF NOT EXISTS public.sites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    site_id TEXT UNIQUE NOT NULL,
    last_fueling_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    fuel_capacity NUMERIC NOT NULL,
    current_fuel_level NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create tickets table
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    site_id TEXT NOT NULL,
    fueler_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    ticket_type TEXT NOT NULL CHECK (ticket_type IN ('uplift', 'dispersion')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'closed')) DEFAULT 'pending',
    initiated BOOLEAN NOT NULL DEFAULT FALSE,
    fuel_consumption NUMERIC,
    consumption_percentage NUMERIC,
    cto_comments TEXT,
    fueler_input JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Insert sample site data
INSERT INTO public.sites (site_id, fuel_capacity, current_fuel_level, last_fueling_date) VALUES
('SITE001', 10000, 8500, NOW() - INTERVAL '10 days'),
('SITE002', 15000, 12000, NOW() - INTERVAL '5 days'),
('SITE003', 8000, 2000, NOW() - INTERVAL '20 days'),
('SITE004', 12000, 9000, NOW() - INTERVAL '7 days'),
('SITE005', 20000, 5000, NOW() - INTERVAL '25 days')
ON CONFLICT (site_id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Anyone can view sites" ON public.sites
    FOR SELECT USING (true);

CREATE POLICY "Users can view tickets" ON public.tickets
    FOR SELECT USING (true);

CREATE POLICY "Fuelers can create tickets" ON public.tickets
    FOR INSERT WITH CHECK (auth.uid() = fueler_id);

CREATE POLICY "Users can update tickets" ON public.tickets
    FOR UPDATE USING (true);
