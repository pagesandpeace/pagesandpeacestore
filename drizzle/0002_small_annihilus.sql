ALTER TABLE "event_bookings" ADD COLUMN "stripe_checkout_session_id" text;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "chapter" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "published" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" DROP COLUMN "city";--> statement-breakpoint
ALTER TABLE "stores" DROP COLUMN "postcode";