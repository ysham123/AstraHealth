-- LoopGuard Database Schema for Supabase
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor)

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supabase_user_id VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'radiologist',
    site_id UUID,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mrn VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    sex VARCHAR(1),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Studies table
CREATE TABLE IF NOT EXISTS studies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    accession_number VARCHAR(50) UNIQUE NOT NULL,
    modality VARCHAR(10),
    body_region VARCHAR(50),
    study_date TIMESTAMPTZ,
    study_description VARCHAR(255),
    referring_physician VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id UUID UNIQUE NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
    radiologist_id UUID NOT NULL REFERENCES users(id),
    report_text TEXT,
    findings TEXT,
    impression TEXT,
    is_finalized BOOLEAN DEFAULT false NOT NULL,
    finalized_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Follow-ups table
CREATE TABLE IF NOT EXISTS followups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    recommended_modality VARCHAR(20) NOT NULL,
    body_region VARCHAR(50) NOT NULL,
    reason TEXT,
    interval_months INTEGER NOT NULL,
    due_date TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL,
    priority VARCHAR(20) DEFAULT 'routine' NOT NULL,
    assigned_to UUID REFERENCES users(id),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Critical findings table
CREATE TABLE IF NOT EXISTS critical_findings (
    id SERIAL PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
    finding TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL,
    communicated BOOLEAN DEFAULT false,
    communicated_at TIMESTAMPTZ,
    communicated_to VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- QA alerts table
CREATE TABLE IF NOT EXISTS qa_alerts (
    id SERIAL PRIMARY KEY,
    study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    dismissed BOOLEAN DEFAULT false,
    dismissed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tumor board cases table
CREATE TABLE IF NOT EXISTS tumor_board_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'preparing',
    scheduled_date TIMESTAMPTZ,
    stage_t VARCHAR(10),
    stage_n VARCHAR(10),
    stage_m VARCHAR(10),
    stage_overall VARCHAR(20),
    consensus TEXT,
    action_items JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tumor board measurements table
CREATE TABLE IF NOT EXISTS tumor_board_measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES tumor_board_cases(id) ON DELETE CASCADE,
    lesion_id VARCHAR(50) NOT NULL,
    location VARCHAR(100) NOT NULL,
    measurement_date DATE NOT NULL,
    long_axis INTEGER NOT NULL,
    short_axis INTEGER NOT NULL,
    measurement_type VARCHAR(20) DEFAULT 'target',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tumor board team table
CREATE TABLE IF NOT EXISTS tumor_board_team (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES tumor_board_cases(id) ON DELETE CASCADE,
    member_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    recommendation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    user_name VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Audit events table (HIPAA compliance)
CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    user_email VARCHAR(255),
    action VARCHAR(30) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    extra_data JSONB,
    success BOOLEAN DEFAULT true NOT NULL,
    error_message TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_studies_patient_id ON studies(patient_id);
CREATE INDEX IF NOT EXISTS idx_studies_study_date ON studies(study_date);
CREATE INDEX IF NOT EXISTS idx_reports_study_id ON reports(study_id);
CREATE INDEX IF NOT EXISTS idx_followups_status ON followups(status);
CREATE INDEX IF NOT EXISTS idx_followups_due_date ON followups(due_date);
CREATE INDEX IF NOT EXISTS idx_critical_findings_communicated ON critical_findings(communicated);
CREATE INDEX IF NOT EXISTS idx_qa_alerts_dismissed ON qa_alerts(dismissed);

-- Enable Row Level Security (RLS) - disable for now to allow seeding
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE critical_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tumor_board_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE tumor_board_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE tumor_board_team ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for service role (allows seeding and backend access)
CREATE POLICY "Service role has full access to users" ON users FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role has full access to patients" ON patients FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role has full access to studies" ON studies FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role has full access to reports" ON reports FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role has full access to followups" ON followups FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role has full access to critical_findings" ON critical_findings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role has full access to qa_alerts" ON qa_alerts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role has full access to tumor_board_cases" ON tumor_board_cases FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role has full access to tumor_board_measurements" ON tumor_board_measurements FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role has full access to tumor_board_team" ON tumor_board_team FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role has full access to chat_messages" ON chat_messages FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role has full access to audit_events" ON audit_events FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated users policies
CREATE POLICY "Authenticated users can read all data" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read patients" ON patients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read studies" ON studies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read reports" ON reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read followups" ON followups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read critical_findings" ON critical_findings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read qa_alerts" ON qa_alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read tumor_board_cases" ON tumor_board_cases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read tumor_board_measurements" ON tumor_board_measurements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read tumor_board_team" ON tumor_board_team FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read and write chat_messages" ON chat_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can read audit_events" ON audit_events FOR SELECT TO authenticated USING (true);

SELECT 'Schema created successfully!' as status;
