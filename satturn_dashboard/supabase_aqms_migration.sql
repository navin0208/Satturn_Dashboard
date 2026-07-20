-- ============================================================
-- AQMS Hardware Control — Supabase Migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. AQMS Systems Table (one row per physical rack)
CREATE TABLE IF NOT EXISTS public.aqms_systems (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  location    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. AQMS Display Configs Table (6 rows per system, one per ESP32 display)
CREATE TABLE IF NOT EXISTS public.aqms_display_configs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id      UUID NOT NULL REFERENCES public.aqms_systems(id) ON DELETE CASCADE,
  display_index  SMALLINT NOT NULL CHECK (display_index BETWEEN 1 AND 6),
  parameter      TEXT NOT NULL CHECK (parameter IN ('co2', 'no2', 'so2', 'o3', 'pm25', 'pm10')),
  mode           TEXT NOT NULL DEFAULT 'fixed' CHECK (mode IN ('fixed', 'range')),
  fixed_value    REAL DEFAULT 0,
  range_min      REAL DEFAULT 0,
  range_max      REAL DEFAULT 0,
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (system_id, display_index)
);

-- 3. Auto-update updated_at on every change
CREATE OR REPLACE FUNCTION public.update_aqms_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER aqms_display_configs_updated_at
  BEFORE UPDATE ON public.aqms_display_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_aqms_config_timestamp();

-- ============================================================
-- RLS Policies
-- ============================================================

-- Enable RLS
ALTER TABLE public.aqms_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aqms_display_configs ENABLE ROW LEVEL SECURITY;

-- aqms_systems: Anyone (including ESP32 anon key) can SELECT
CREATE POLICY "Public read aqms_systems"
  ON public.aqms_systems FOR SELECT
  USING (true);

-- aqms_systems: Only authenticated users can INSERT/UPDATE/DELETE
CREATE POLICY "Auth users manage aqms_systems"
  ON public.aqms_systems FOR ALL
  USING (auth.role() = 'authenticated');

-- aqms_display_configs: Anyone (including ESP32 anon key) can SELECT
CREATE POLICY "Public read aqms_display_configs"
  ON public.aqms_display_configs FOR SELECT
  USING (true);

-- aqms_display_configs: Only authenticated users can INSERT/UPDATE/DELETE
CREATE POLICY "Auth users manage aqms_display_configs"
  ON public.aqms_display_configs FOR ALL
  USING (auth.role() = 'authenticated');

-- ============================================================
-- Enable Realtime for dashboard live updates
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.aqms_systems;
ALTER PUBLICATION supabase_realtime ADD TABLE public.aqms_display_configs;

-- ============================================================
-- Supabase Storage: aqms_config Bucket & Policies
-- ============================================================

-- 1. Create the public bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('aqms_config', 'aqms_config', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow public read access to anyone (for the ESP32 to fetch the json)
CREATE POLICY "Public read aqms_config"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'aqms_config');

-- 3. Allow authenticated users (dashboard admins) to insert/upload files
CREATE POLICY "Auth users can upload aqms_config"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'aqms_config' 
    AND auth.role() = 'authenticated'
  );

-- 4. Allow authenticated users to update/overwrite files
CREATE POLICY "Auth users can update aqms_config"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'aqms_config' 
    AND auth.role() = 'authenticated'
  );

-- ============================================================
-- Seed: Default parameter mapping per display index
-- (Used as default when a new system is created from dashboard)
-- This is just reference data — actual rows are created per system
-- ============================================================
-- Display 1 = CO2, 2 = NO2, 3 = SO2, 4 = O3, 5 = PM2.5, 6 = PM10
