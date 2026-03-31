-- Add direct FK relationships from attendance_days, leave_requests, and payslips
-- to profiles(user_id) so PostgREST can resolve joins.
-- profiles.user_id is UNIQUE NOT NULL, so it qualifies as a FK target.

-- attendance_days.user_id → profiles.user_id
ALTER TABLE attendance_days
  ADD CONSTRAINT fk_attendance_days_profile
  FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

-- leave_requests.user_id → profiles.user_id (the applicant)
ALTER TABLE leave_requests
  ADD CONSTRAINT fk_leave_requests_profile
  FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

-- payslips.user_id → profiles.user_id
ALTER TABLE payslips
  ADD CONSTRAINT fk_payslips_profile
  FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

-- attendance_events.user_id → profiles.user_id (optional, for future use)
ALTER TABLE attendance_events
  ADD CONSTRAINT fk_attendance_events_profile
  FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

-- leave_balances.user_id → profiles.user_id (optional, for future use)
ALTER TABLE leave_balances
  ADD CONSTRAINT fk_leave_balances_profile
  FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
