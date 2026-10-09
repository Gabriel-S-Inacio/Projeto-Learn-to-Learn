ALTER TABLE lesson_bookings
  ADD COLUMN IF NOT EXISTS type lesson_type;

UPDATE lesson_bookings b
SET type = s.type
FROM lesson_slots s
WHERE s.id = b.slot_id
  AND b.type IS NULL;

ALTER TABLE lesson_bookings
  ALTER COLUMN type SET NOT NULL;

ALTER TABLE lesson_slots
  ALTER COLUMN type DROP DEFAULT,
  ALTER COLUMN type DROP NOT NULL;

UPDATE lesson_slots
SET type = NULL;
