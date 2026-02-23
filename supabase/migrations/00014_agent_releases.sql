-- Agent Release Downloads
-- Storage bucket + metadata table for desktop agent binaries

-- Create a table to track agent releases
CREATE TABLE IF NOT EXISTS public.agent_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('windows', 'macos', 'linux')),
  filename text NOT NULL,
  file_size bigint,
  storage_path text NOT NULL,
  release_notes text,
  is_latest boolean DEFAULT false,
  uploaded_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Index for quick "latest" lookups
CREATE INDEX idx_agent_releases_latest ON public.agent_releases (platform, is_latest) WHERE is_latest = true;

-- RLS
ALTER TABLE public.agent_releases ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view releases (to download)
CREATE POLICY "Authenticated users can view releases"
  ON public.agent_releases FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "Admins can manage releases"
  ON public.agent_releases FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

-- Function to ensure only one "latest" per platform
CREATE OR REPLACE FUNCTION set_latest_release()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_latest = true THEN
    UPDATE public.agent_releases
    SET is_latest = false
    WHERE platform = NEW.platform
      AND id != NEW.id
      AND is_latest = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_set_latest_release
  AFTER INSERT OR UPDATE ON public.agent_releases
  FOR EACH ROW
  WHEN (NEW.is_latest = true)
  EXECUTE FUNCTION set_latest_release();
