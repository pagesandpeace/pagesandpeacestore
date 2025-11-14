ALTER TABLE event_bookings
ALTER COLUMN id TYPE uuid
USING id::uuid;
