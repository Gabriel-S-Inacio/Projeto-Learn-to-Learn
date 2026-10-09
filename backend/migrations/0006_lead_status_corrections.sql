CREATE TABLE IF NOT EXISTS lead_status_changes (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lead_id integer NOT NULL REFERENCES leads(id) ON DELETE RESTRICT,
  previous_status lead_status NOT NULL,
  new_status lead_status NOT NULL,
  changed_by integer NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reason text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lead_status_changes_distinct_status_check CHECK (previous_status <> new_status),
  CONSTRAINT lead_status_changes_reason_check CHECK (length(trim(reason)) >= 5)
);

CREATE INDEX IF NOT EXISTS lead_status_changes_lead_id_idx
  ON lead_status_changes(lead_id);

CREATE INDEX IF NOT EXISTS lead_status_changes_changed_by_idx
  ON lead_status_changes(changed_by);

CREATE INDEX IF NOT EXISTS lead_status_changes_changed_at_idx
  ON lead_status_changes(changed_at);
