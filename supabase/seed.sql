-- Seed data for HRMS development

-- 1. Create organization
INSERT INTO organizations (id, name, slug, timezone) VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Acme Corp', 'acme-corp', 'Asia/Kolkata');

-- 2. Create locations
INSERT INTO locations (id, organization_id, name, address, latitude, longitude, geofence_radius_meters, allowed_wifi_ssids, timezone) VALUES
  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'HQ Office', '123 Business Park, Mumbai', 19.0760, 72.8777, 200, '{"AcmeOffice-5G","AcmeOffice-2G"}', 'Asia/Kolkata'),
  ('b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Branch Office', '456 Tech Hub, Bangalore', 12.9716, 77.5946, 300, '{"AcmeBLR-5G"}', 'Asia/Kolkata');

-- 3. Create departments
INSERT INTO departments (id, organization_id, name, description) VALUES
  ('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Engineering', 'Software Engineering'),
  ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Human Resources', 'HR & People Ops'),
  ('c3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Finance', 'Finance & Accounting');

-- 4. Create HR policies
INSERT INTO hr_policies (id, organization_id, name, work_mode, location_enforced, office_wifi_enforced, wfh_fallback_on_outside_office, block_outside_office_checkin, idle_threshold_minutes, count_absent_as_lop, count_non_compliant_as_lop, weekend_days) VALUES
  ('d1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Hybrid Policy', 'HYBRID', true, false, true, false, 30, true, false, '{0,6}'),
  ('d2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Office Only Policy', 'OFFICE_ONLY', true, true, false, false, 30, true, false, '{0,6}'),
  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'WFH Policy', 'WFH_ALLOWED', false, false, true, false, 30, true, false, '{0,6}');

-- 5. Create holiday calendar
INSERT INTO holiday_calendars (id, organization_id, name, year, location_id) VALUES
  ('e1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'India 2026', 2026, NULL);

INSERT INTO holidays (calendar_id, name, date, is_optional) VALUES
  ('e1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Republic Day', '2026-01-26', false),
  ('e1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Holi', '2026-03-17', false),
  ('e1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Good Friday', '2026-04-03', false),
  ('e1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Independence Day', '2026-08-15', false),
  ('e1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Gandhi Jayanti', '2026-10-02', false),
  ('e1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Diwali', '2026-10-20', false),
  ('e1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Christmas', '2026-12-25', false);

-- 6. Create leave types
INSERT INTO leave_types (id, organization_id, name, code, is_paid, max_days_per_year, accrual_frequency, carry_forward_limit, max_balance, pro_rate_on_join) VALUES
  ('f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Annual Leave', 'AL', true, 18, 'MONTHLY', 5, 30, true),
  ('f2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Sick Leave', 'SL', true, 12, 'MONTHLY', 0, 12, false),
  ('f3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Casual Leave', 'CL', true, 6, 'YEARLY', 0, 6, true),
  ('f4eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Loss of Pay', 'LOP', false, 365, 'YEARLY', 0, 365, false);

-- 7. Create leave policies
INSERT INTO leave_policies (organization_id, name, leave_type_id, approval_flow, allow_negative_balance, min_notice_days) VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Annual Leave Policy', 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'MANAGER_THEN_HR', false, 3),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Sick Leave Policy', 'f2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'MANAGER_ONLY', false, 0),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Casual Leave Policy', 'f3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'MANAGER_ONLY', false, 1),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'LOP Policy', 'f4eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'HR_ONLY', true, 0);

-- NOTE: User profiles are created automatically via the handle_new_user() trigger
-- when you create users via Supabase Auth. Use the Supabase dashboard or Auth API
-- to create test users with metadata:
--   { "organization_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", "full_name": "...", "role": "ADMIN" }
