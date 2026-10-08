DO $$ BEGIN
  CREATE TYPE lesson_type AS ENUM ('TRIAL', 'REGULAR');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE lesson_slots
  ADD COLUMN IF NOT EXISTS type lesson_type NOT NULL DEFAULT 'TRIAL';

