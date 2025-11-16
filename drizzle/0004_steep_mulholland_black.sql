ALTER TABLE "events" ADD COLUMN "location_id" uuid;--> statement-breakpoint
ALTER TABLE "voucher_redemptions" ADD COLUMN "location_id" uuid;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" DROP COLUMN "location";--> statement-breakpoint
ALTER TABLE "voucher_redemptions" DROP COLUMN "location";