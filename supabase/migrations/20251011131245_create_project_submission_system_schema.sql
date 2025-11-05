/*
  # Project Submission Reporting System - Database Schema

  ## Overview
  This migration creates the complete database schema for a multi-role project submission system
  with General Admins, Level Coordinators, HODs, Supervisors, and Students.

  ## 1. New Tables

  ### `users`
  Core user table with role-based access
  - `id` (uuid, primary key) - Unique user identifier
  - `email` (text, unique) - User email for login
  - `password_hash` (text) - Hashed password
  - `full_name` (text) - User's full name
  - `role` (text) - User role: general_admin, level_coordinator, hod, supervisor, student
  - `department` (text) - Department name (for HOD, supervisors, students)
  - `level` (text) - Academic level (for level coordinators, students)
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `student_supervisor_assignments`
  Links students to their supervisors
  - `id` (uuid, primary key)
  - `student_id` (uuid, foreign key) - References users table
  - `supervisor_id` (uuid, foreign key) - References users table
  - `level_coordinator_id` (uuid, foreign key) - Level coordinator who made assignment
  - `assigned_at` (timestamptz) - Assignment timestamp
  - `is_active` (boolean) - Whether assignment is currently active

  ### `reports`
  Project progress reports submitted by students
  - `id` (uuid, primary key)
  - `student_id` (uuid, foreign key) - Student who submitted
  - `supervisor_id` (uuid, foreign key) - Assigned supervisor
  - `report_stage` (text) - Stage: progress_1, progress_2, progress_3, final
  - `title` (text) - Report title
  - `file_url` (text) - Path to uploaded file
  - `file_name` (text) - Original file name
  - `file_size` (integer) - File size in bytes
  - `status` (text) - Status: pending, feedback_given, approved, rejected
  - `version` (integer) - Version number for reuploads
  - `submitted_at` (timestamptz) - Submission timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `feedback`
  Feedback and comments from supervisors on reports
  - `id` (uuid, primary key)
  - `report_id` (uuid, foreign key) - Report being reviewed
  - `supervisor_id` (uuid, foreign key) - Supervisor providing feedback
  - `comment` (text) - Feedback text
  - `action_taken` (text) - Action: commented, approved, rejected, request_reupload
  - `annotated_file_url` (text) - Optional annotated/corrected file
  - `created_at` (timestamptz) - Feedback timestamp

  ### `hod_feedback`
  Optional high-level feedback from HODs
  - `id` (uuid, primary key)
  - `report_id` (uuid, foreign key) - Report being reviewed
  - `hod_id` (uuid, foreign key) - HOD providing feedback
  - `comment` (text) - Feedback text
  - `created_at` (timestamptz) - Feedback timestamp

  ### `activity_logs`
  Audit trail of all system activities
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key) - User who performed action
  - `action` (text) - Description of action
  - `entity_type` (text) - Type of entity affected
  - `entity_id` (uuid) - ID of affected entity
  - `details` (jsonb) - Additional details
  - `created_at` (timestamptz) - Action timestamp

  ## 2. Security
  - Enable RLS on all tables
  - Create restrictive policies based on user roles
  - Ensure students can only access their own data
  - Ensure supervisors can only access their assigned students
  - Ensure level coordinators can access their level's data
  - Ensure HODs can access their department's data
  - Ensure general admins have full access

  ## 3. Indexes
  - Add indexes for frequently queried columns
  - Optimize for role-based queries
  - Speed up assignment lookups
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('general_admin', 'level_coordinator', 'hod', 'supervisor', 'student')),
  department text,
  level text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create student_supervisor_assignments table
CREATE TABLE IF NOT EXISTS student_supervisor_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  supervisor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level_coordinator_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  supervisor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_stage text NOT NULL CHECK (report_stage IN ('progress_1', 'progress_2', 'progress_3', 'final')),
  title text NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size integer DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'feedback_given', 'approved', 'rejected')),
  version integer DEFAULT 1,
  submitted_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  supervisor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment text NOT NULL,
  action_taken text NOT NULL CHECK (action_taken IN ('commented', 'approved', 'rejected', 'request_reupload')),
  annotated_file_url text,
  created_at timestamptz DEFAULT now()
);

-- Create hod_feedback table
CREATE TABLE IF NOT EXISTS hod_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  hod_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);
CREATE INDEX IF NOT EXISTS idx_users_level ON users(level);
CREATE INDEX IF NOT EXISTS idx_assignments_student ON student_supervisor_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_supervisor ON student_supervisor_assignments(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_assignments_active ON student_supervisor_assignments(is_active);
CREATE INDEX IF NOT EXISTS idx_reports_student ON reports(student_id);
CREATE INDEX IF NOT EXISTS idx_reports_supervisor ON reports(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_feedback_report ON feedback(report_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_supervisor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE hod_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "General admins can view all users"
  ON users FOR SELECT
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'general_admin');

CREATE POLICY "Level coordinators can view users in their level"
  ON users FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'level_coordinator'
    AND level = (SELECT level FROM users WHERE id = auth.uid())
  );

CREATE POLICY "HODs can view users in their department"
  ON users FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'hod'
    AND department = (SELECT department FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Supervisors can view assigned students"
  ON users FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'supervisor'
    AND id IN (
      SELECT student_id FROM student_supervisor_assignments
      WHERE supervisor_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "General admins can insert users"
  ON users FOR INSERT
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'general_admin');

CREATE POLICY "General admins can update users"
  ON users FOR UPDATE
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'general_admin')
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'general_admin');

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- RLS Policies for student_supervisor_assignments
CREATE POLICY "Level coordinators can view assignments in their level"
  ON student_supervisor_assignments FOR SELECT
  USING (
    (SELECT level FROM users WHERE id = auth.uid()) = 
    (SELECT level FROM users WHERE id = student_id)
  );

CREATE POLICY "Supervisors can view their assignments"
  ON student_supervisor_assignments FOR SELECT
  USING (supervisor_id = auth.uid());

CREATE POLICY "Students can view their assignments"
  ON student_supervisor_assignments FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "HODs can view assignments in their department"
  ON student_supervisor_assignments FOR SELECT
  USING (
    (SELECT department FROM users WHERE id = auth.uid()) = 
    (SELECT department FROM users WHERE id = student_id)
  );

CREATE POLICY "Level coordinators can create assignments"
  ON student_supervisor_assignments FOR INSERT
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'level_coordinator'
    AND level_coordinator_id = auth.uid()
  );

CREATE POLICY "Level coordinators can update assignments"
  ON student_supervisor_assignments FOR UPDATE
  USING (level_coordinator_id = auth.uid())
  WITH CHECK (level_coordinator_id = auth.uid());

-- RLS Policies for reports
CREATE POLICY "Students can view own reports"
  ON reports FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Supervisors can view assigned student reports"
  ON reports FOR SELECT
  USING (supervisor_id = auth.uid());

CREATE POLICY "Level coordinators can view reports in their level"
  ON reports FOR SELECT
  USING (
    (SELECT level FROM users WHERE id = auth.uid()) = 
    (SELECT level FROM users WHERE id = student_id)
  );

CREATE POLICY "HODs can view reports in their department"
  ON reports FOR SELECT
  USING (
    (SELECT department FROM users WHERE id = auth.uid()) = 
    (SELECT department FROM users WHERE id = student_id)
  );

CREATE POLICY "Students can insert own reports"
  ON reports FOR INSERT
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update own reports"
  ON reports FOR UPDATE
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Supervisors can update assigned student reports"
  ON reports FOR UPDATE
  USING (supervisor_id = auth.uid())
  WITH CHECK (supervisor_id = auth.uid());

-- RLS Policies for feedback
CREATE POLICY "Students can view feedback on their reports"
  ON feedback FOR SELECT
  USING (
    report_id IN (
      SELECT id FROM reports WHERE student_id = auth.uid()
    )
  );

CREATE POLICY "Supervisors can view feedback on their assigned reports"
  ON feedback FOR SELECT
  USING (
    report_id IN (
      SELECT id FROM reports WHERE supervisor_id = auth.uid()
    )
  );

CREATE POLICY "Level coordinators can view feedback in their level"
  ON feedback FOR SELECT
  USING (
    report_id IN (
      SELECT r.id FROM reports r
      JOIN users u ON r.student_id = u.id
      WHERE u.level = (SELECT level FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "HODs can view feedback in their department"
  ON feedback FOR SELECT
  USING (
    report_id IN (
      SELECT r.id FROM reports r
      JOIN users u ON r.student_id = u.id
      WHERE u.department = (SELECT department FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Supervisors can insert feedback"
  ON feedback FOR INSERT
  WITH CHECK (supervisor_id = auth.uid());

-- RLS Policies for hod_feedback
CREATE POLICY "Students can view HOD feedback on their reports"
  ON hod_feedback FOR SELECT
  USING (
    report_id IN (
      SELECT id FROM reports WHERE student_id = auth.uid()
    )
  );

CREATE POLICY "HODs can view own feedback"
  ON hod_feedback FOR SELECT
  USING (hod_id = auth.uid());

CREATE POLICY "Level coordinators can view HOD feedback in their level"
  ON hod_feedback FOR SELECT
  USING (
    report_id IN (
      SELECT r.id FROM reports r
      JOIN users u ON r.student_id = u.id
      WHERE u.level = (SELECT level FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "HODs can insert feedback"
  ON hod_feedback FOR INSERT
  WITH CHECK (hod_id = auth.uid());

-- RLS Policies for activity_logs
CREATE POLICY "Users can view own activity logs"
  ON activity_logs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "General admins can view all activity logs"
  ON activity_logs FOR SELECT
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'general_admin');

CREATE POLICY "All authenticated users can insert activity logs"
  ON activity_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());