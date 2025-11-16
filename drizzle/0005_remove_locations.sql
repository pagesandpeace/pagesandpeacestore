-- 1) Drop FK constraints on events.location_id safely
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT tc.constraint_name INTO constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'events'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'location_id'
    LIMIT 1;

    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE events DROP CONSTRAINT %I;', constraint_name);
    END IF;
END$$;

-- 2) Drop location_id column if exists
ALTER TABLE events DROP COLUMN IF EXISTS location_id;


-- 3) Drop FK constraints on voucher_redemptions.location_id safely
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT tc.constraint_name INTO constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'voucher_redemptions'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'location_id'
    LIMIT 1;

    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE voucher_redemptions DROP CONSTRAINT %I;', constraint_name);
    END IF;
END$$;

-- 4) Drop column if exists
ALTER TABLE voucher_redemptions DROP COLUMN IF EXISTS location_id;


-- 5) Drop locations table last
DROP TABLE IF EXISTS locations;
