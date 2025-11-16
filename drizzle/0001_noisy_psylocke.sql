ALTER TABLE "events"
ADD COLUMN "store_id" uuid;

UPDATE "events"
SET "store_id" = '941ead81-20f8-45aa-aaf4-b06cacde724c' -- replace with a real store id from your DB
WHERE "store_id" IS NULL;

ALTER TABLE "events"
ALTER COLUMN "store_id" SET NOT NULL;
