
-- 1. Extensies
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Testronde Tabel
CREATE TABLE IF NOT EXISTS test_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Leerlingen (Nu gekoppeld aan een testronde)
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  test_round_id UUID REFERENCES test_rounds(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Spellingsregels (Blijven globaal per gebruiker)
CREATE TABLE IF NOT EXISTS rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Woorden (Nu gekoppeld aan een testronde)
CREATE TABLE IF NOT EXISTS words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  test_round_id UUID REFERENCES test_rounds(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  rule_ids JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Assessments
CREATE TABLE IF NOT EXISTS assessments (
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  word_id UUID REFERENCES words(id) ON DELETE CASCADE NOT NULL,
  test_round_id UUID REFERENCES test_rounds(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rule_results JSONB NOT NULL,
  is_attempted BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (student_id, word_id, test_round_id)
);

-- Migratie script voor bestaande tabellen (indien ze al bestonden)
DO $$ 
BEGIN 
  -- Students
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='test_round_id') THEN
    ALTER TABLE students ADD COLUMN test_round_id UUID REFERENCES test_rounds(id) ON DELETE CASCADE;
  END IF;
  -- Words
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='words' AND column_name='test_round_id') THEN
    ALTER TABLE words ADD COLUMN test_round_id UUID REFERENCES test_rounds(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 7. RLS & Policies
ALTER TABLE test_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE words ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Individuele toegang test_rounds" ON test_rounds;
DROP POLICY IF EXISTS "Individuele toegang students" ON students;
DROP POLICY IF EXISTS "Individuele toegang rules" ON rules;
DROP POLICY IF EXISTS "Individuele toegang words" ON words;
DROP POLICY IF EXISTS "Individuele toegang assessments" ON assessments;

CREATE POLICY "Individuele toegang test_rounds" ON test_rounds FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Individuele toegang students" ON students FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Individuele toegang rules" ON rules FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Individuele toegang words" ON words FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Individuele toegang assessments" ON assessments FOR ALL USING (auth.uid() = user_id);
