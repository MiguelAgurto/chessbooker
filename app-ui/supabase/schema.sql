-- ChessBooker Coach Portal Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Coaches table
CREATE TABLE coaches (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  slug TEXT UNIQUE NOT NULL,
  pricing JSONB DEFAULT '{"60min": 50, "90min": 70}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Availability rules table
CREATE TABLE availability_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Booking requests table
CREATE TABLE booking_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  student_email TEXT NOT NULL,
  student_timezone TEXT NOT NULL DEFAULT 'UTC',
  requested_times JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_availability_rules_coach_id ON availability_rules(coach_id);
CREATE INDEX idx_booking_requests_coach_id ON booking_requests(coach_id);
CREATE INDEX idx_booking_requests_status ON booking_requests(status);
CREATE INDEX idx_coaches_slug ON coaches(slug);

-- Enable Row Level Security
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for coaches table
-- Coaches can read their own row
CREATE POLICY "Coaches can view own profile"
  ON coaches FOR SELECT
  USING (auth.uid() = id);

-- Coaches can update their own row
CREATE POLICY "Coaches can update own profile"
  ON coaches FOR UPDATE
  USING (auth.uid() = id);

-- Coaches can insert their own row (for initial profile creation)
CREATE POLICY "Coaches can insert own profile"
  ON coaches FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Public can view coach profiles by slug (for booking page)
CREATE POLICY "Public can view coach profiles"
  ON coaches FOR SELECT
  USING (true);

-- RLS Policies for availability_rules table
-- Coaches can view their own availability
CREATE POLICY "Coaches can view own availability"
  ON availability_rules FOR SELECT
  USING (auth.uid() = coach_id);

-- Coaches can insert their own availability
CREATE POLICY "Coaches can insert own availability"
  ON availability_rules FOR INSERT
  WITH CHECK (auth.uid() = coach_id);

-- Coaches can update their own availability
CREATE POLICY "Coaches can update own availability"
  ON availability_rules FOR UPDATE
  USING (auth.uid() = coach_id);

-- Coaches can delete their own availability
CREATE POLICY "Coaches can delete own availability"
  ON availability_rules FOR DELETE
  USING (auth.uid() = coach_id);

-- Public can view availability (for booking page)
CREATE POLICY "Public can view availability"
  ON availability_rules FOR SELECT
  USING (true);

-- RLS Policies for booking_requests table
-- Coaches can view requests for them
CREATE POLICY "Coaches can view own booking requests"
  ON booking_requests FOR SELECT
  USING (auth.uid() = coach_id);

-- Coaches can update requests for them
CREATE POLICY "Coaches can update own booking requests"
  ON booking_requests FOR UPDATE
  USING (auth.uid() = coach_id);

-- Anyone (including anonymous) can insert booking requests
CREATE POLICY "Anyone can create booking requests"
  ON booking_requests FOR INSERT
  WITH CHECK (true);
