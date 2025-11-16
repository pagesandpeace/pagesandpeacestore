ALTER TABLE "locations" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "locations" CASCADE;--> statement-breakpoint
ALTER TABLE "events" DROP CONSTRAINT "events_location_id_locations_id_fk";
--> statement-breakpoint
ALTER TABLE "voucher_redemptions" DROP CONSTRAINT "voucher_redemptions_location_id_locations_id_fk";
--> statement-breakpoint
ALTER TABLE "event_bookings" ADD COLUMN "cancellation_requested" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "events" DROP COLUMN "category";--> statement-breakpoint
ALTER TABLE "events" DROP COLUMN "location_id";--> statement-breakpoint
ALTER TABLE "voucher_redemptions" DROP COLUMN "location_id";