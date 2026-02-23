-- Function to auto-create profile after user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, organization_id, full_name, email, employee_code, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'organization_id')::uuid, (SELECT id FROM public.organizations LIMIT 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'employee_code', 'EMP-' || substr(NEW.id::text, 1, 8)),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'EMPLOYEE')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to compute haversine distance (meters)
CREATE OR REPLACE FUNCTION haversine_distance(
  lat1 DOUBLE PRECISION,
  lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lon2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
DECLARE
  r DOUBLE PRECISION := 6371000;
  dlat DOUBLE PRECISION;
  dlon DOUBLE PRECISION;
  a DOUBLE PRECISION;
  c DOUBLE PRECISION;
BEGIN
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  a := sin(dlat / 2) ^ 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ^ 2;
  c := 2 * atan2(sqrt(a), sqrt(1 - a));
  RETURN r * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to send notification (helper used by edge functions)
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_org_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_metadata JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO notifications (user_id, organization_id, type, title, message, metadata)
  VALUES (p_user_id, p_org_id, p_type, p_title, p_message, p_metadata)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log(
  p_org_id UUID,
  p_actor_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_old_value JSONB DEFAULT NULL,
  p_new_value JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO audit_logs (organization_id, actor_id, action, resource_type, resource_id, old_value, new_value, ip_address)
  VALUES (p_org_id, p_actor_id, p_action, p_resource_type, p_resource_id, p_old_value, p_new_value, p_ip_address)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Storage bucket for payslips
INSERT INTO storage.buckets (id, name, public) VALUES ('payslips', 'payslips', false)
ON CONFLICT DO NOTHING;

-- Storage RLS for payslips bucket
CREATE POLICY "Employee can read own payslips"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'payslips'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Service role can upload payslips"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'payslips');
