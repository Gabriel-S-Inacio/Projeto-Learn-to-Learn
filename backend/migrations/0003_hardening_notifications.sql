DO $$ BEGIN
  CREATE TYPE notification_delivery_status AS ENUM ('SENT', 'FAILED', 'SKIPPED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE lesson_bookings
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_by integer REFERENCES users(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

ALTER TABLE lesson_bookings
  DROP CONSTRAINT IF EXISTS lesson_bookings_cancellation_complete_check;

ALTER TABLE lesson_bookings
  ADD CONSTRAINT lesson_bookings_cancellation_complete_check CHECK (
    (cancelled_at IS NULL AND cancelled_by IS NULL AND cancellation_reason IS NULL)
    OR
    (cancelled_at IS NOT NULL AND cancelled_by IS NOT NULL AND cancellation_reason IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS lesson_bookings_cancelled_at_idx
  ON lesson_bookings(cancelled_at)
  WHERE cancelled_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id bigserial PRIMARY KEY,
  booking_id integer REFERENCES lesson_bookings(id) ON DELETE SET NULL,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  channel varchar(20) NOT NULL CHECK (channel IN ('EMAIL', 'WHATSAPP')),
  event varchar(64) NOT NULL CHECK (event IN ('BOOKING_CONFIRMATION', 'ADMIN_CANCELLATION')),
  status notification_delivery_status NOT NULL,
  provider varchar(64) NOT NULL,
  failure_code varchar(64),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notification_deliveries_failure_check CHECK (
    (status = 'FAILED' AND failure_code IS NOT NULL)
    OR status <> 'FAILED'
  )
);

CREATE INDEX IF NOT EXISTS notification_deliveries_booking_id_idx ON notification_deliveries(booking_id);
CREATE INDEX IF NOT EXISTS notification_deliveries_user_id_idx ON notification_deliveries(user_id);
CREATE INDEX IF NOT EXISTS notification_deliveries_created_at_idx ON notification_deliveries(created_at);

