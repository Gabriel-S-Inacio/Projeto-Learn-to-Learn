DO $$ BEGIN
  CREATE TYPE lead_status AS ENUM ('NEW', 'INTERESTED', 'SCHEDULED', 'TRIAL_COMPLETED', 'CONVERTED', 'LOST');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE lead_source AS ENUM ('FORM', 'REGISTER', 'SCHEDULE', 'MANUAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS leads (
  id serial PRIMARY KEY,
  name varchar(120) NOT NULL,
  email varchar(320) NOT NULL,
  phone varchar(32) NOT NULL,
  source lead_source NOT NULL,
  utm_source varchar(200),
  utm_medium varchar(200),
  utm_campaign varchar(200),
  status lead_status NOT NULL DEFAULT 'NEW',
  converted_user_id integer REFERENCES users(id) ON DELETE SET NULL,
  scheduled_at timestamptz,
  trial_completed_at timestamptz,
  converted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS leads_email_unique ON leads (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS leads_converted_user_unique ON leads (converted_user_id) WHERE converted_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS leads_status_idx ON leads(status);
CREATE INDEX IF NOT EXISTS leads_source_idx ON leads(source);
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads(created_at);

CREATE TABLE IF NOT EXISTS analytics_events (
  id bigserial PRIMARY KEY,
  event_name varchar(64) NOT NULL,
  user_id integer REFERENCES users(id) ON DELETE SET NULL,
  lead_id integer REFERENCES leads(id) ON DELETE SET NULL,
  session_id varchar(128),
  path varchar(2048),
  utm_source varchar(200),
  utm_medium varchar(200),
  utm_campaign varchar(200),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT analytics_events_name_check CHECK (event_name IN (
    'page_view', 'cta_clicked', 'schedule_viewed', 'registration_started',
    'registration_completed', 'booking_started', 'booking_completed',
    'trial_completed', 'lead_converted'
  )),
  CONSTRAINT analytics_events_metadata_object CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS analytics_events_name_created_idx ON analytics_events(event_name, created_at);
CREATE INDEX IF NOT EXISTS analytics_events_created_at_idx ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS analytics_events_user_id_idx ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS analytics_events_lead_id_idx ON analytics_events(lead_id);
CREATE INDEX IF NOT EXISTS analytics_events_session_id_idx ON analytics_events(session_id);
