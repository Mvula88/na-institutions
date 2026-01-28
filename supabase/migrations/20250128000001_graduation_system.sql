-- Graduation System Tables
-- Creates tables for tracking graduation requirements, student eligibility, and ceremonies

-- Graduation Requirements Table
CREATE TABLE IF NOT EXISTS graduation_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  requirement_type VARCHAR(50) NOT NULL DEFAULT 'credits',
  description TEXT NOT NULL,
  min_value DECIMAL(10, 2),
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_graduation_requirements_institution ON graduation_requirements(institution_id);
CREATE INDEX IF NOT EXISTS idx_graduation_requirements_program ON graduation_requirements(program_id);

-- Student Graduation Status Table
CREATE TABLE IF NOT EXISTS student_graduation_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  total_requirements INTEGER NOT NULL DEFAULT 0,
  requirements_met INTEGER NOT NULL DEFAULT 0,
  is_eligible BOOLEAN NOT NULL DEFAULT false,
  graduation_ceremony_id UUID,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, program_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_student_graduation_status_institution ON student_graduation_status(institution_id);
CREATE INDEX IF NOT EXISTS idx_student_graduation_status_student ON student_graduation_status(student_id);
CREATE INDEX IF NOT EXISTS idx_student_graduation_status_program ON student_graduation_status(program_id);
CREATE INDEX IF NOT EXISTS idx_student_graduation_status_eligible ON student_graduation_status(is_eligible);

-- Graduation Ceremonies Table
CREATE TABLE IF NOT EXISTS graduation_ceremonies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  ceremony_date DATE NOT NULL,
  venue TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'planned',
  max_graduates INTEGER,
  registration_deadline DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_graduation_ceremonies_institution ON graduation_ceremonies(institution_id);
CREATE INDEX IF NOT EXISTS idx_graduation_ceremonies_date ON graduation_ceremonies(ceremony_date);
CREATE INDEX IF NOT EXISTS idx_graduation_ceremonies_status ON graduation_ceremonies(status);

-- Add foreign key for graduation_ceremony_id after graduation_ceremonies table is created
ALTER TABLE student_graduation_status
  ADD CONSTRAINT fk_graduation_ceremony
  FOREIGN KEY (graduation_ceremony_id)
  REFERENCES graduation_ceremonies(id)
  ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE graduation_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_graduation_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE graduation_ceremonies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for graduation_requirements
CREATE POLICY "Users can view graduation requirements for their institution"
  ON graduation_requirements FOR SELECT
  USING (
    institution_id IN (
      SELECT institution_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage graduation requirements"
  ON graduation_requirements FOR ALL
  USING (
    institution_id IN (
      SELECT institution_id FROM users WHERE id = auth.uid() AND role IN ('institution_admin', 'super_admin')
    )
  );

-- RLS Policies for student_graduation_status
CREATE POLICY "Users can view student graduation status for their institution"
  ON student_graduation_status FOR SELECT
  USING (
    institution_id IN (
      SELECT institution_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage student graduation status"
  ON student_graduation_status FOR ALL
  USING (
    institution_id IN (
      SELECT institution_id FROM users WHERE id = auth.uid() AND role IN ('institution_admin', 'super_admin')
    )
  );

-- RLS Policies for graduation_ceremonies
CREATE POLICY "Users can view graduation ceremonies for their institution"
  ON graduation_ceremonies FOR SELECT
  USING (
    institution_id IN (
      SELECT institution_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage graduation ceremonies"
  ON graduation_ceremonies FOR ALL
  USING (
    institution_id IN (
      SELECT institution_id FROM users WHERE id = auth.uid() AND role IN ('institution_admin', 'super_admin')
    )
  );

-- Add updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_graduation_requirements_updated_at ON graduation_requirements;
CREATE TRIGGER update_graduation_requirements_updated_at
  BEFORE UPDATE ON graduation_requirements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_student_graduation_status_updated_at ON student_graduation_status;
CREATE TRIGGER update_student_graduation_status_updated_at
  BEFORE UPDATE ON student_graduation_status
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_graduation_ceremonies_updated_at ON graduation_ceremonies;
CREATE TRIGGER update_graduation_ceremonies_updated_at
  BEFORE UPDATE ON graduation_ceremonies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
