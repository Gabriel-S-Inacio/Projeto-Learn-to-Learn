DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('STUDENT', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE lesson_slot_status AS ENUM ('AVAILABLE', 'BOOKED', 'BLOCKED', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id serial PRIMARY KEY,
  name varchar(120) NOT NULL,
  email varchar(320) NOT NULL,
  phone varchar(32),
  password_hash text NOT NULL,
  role user_role NOT NULL DEFAULT 'STUDENT',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_student_phone_required CHECK (role <> 'STUDENT' OR phone IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (lower(email));

CREATE TABLE IF NOT EXISTS auth_sessions (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash char(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_expires_at_idx ON auth_sessions(expires_at);

CREATE TABLE IF NOT EXISTS lesson_slots (
  id serial PRIMARY KEY,
  starts_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  status lesson_slot_status NOT NULL DEFAULT 'AVAILABLE',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lesson_slots_duration_check CHECK (duration_minutes BETWEEN 30 AND 60)
);

CREATE UNIQUE INDEX IF NOT EXISTS lesson_slots_starts_at_unique ON lesson_slots(starts_at);
CREATE INDEX IF NOT EXISTS lesson_slots_status_starts_at_idx ON lesson_slots(status, starts_at);

CREATE TABLE IF NOT EXISTS lesson_bookings (
  id serial PRIMARY KEY,
  slot_id integer NOT NULL REFERENCES lesson_slots(id) ON DELETE RESTRICT,
  student_id integer NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lesson_bookings_slot_unique UNIQUE(slot_id)
);

CREATE INDEX IF NOT EXISTS lesson_bookings_student_id_idx ON lesson_bookings(student_id);

CREATE TABLE IF NOT EXISTS schema_migrations (
  name text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

