ALTER TABLE "event_bookings" ADD COLUMN "stripe_refund_id" text;--> statement-breakpoint
ALTER TABLE "event_bookings" ADD COLUMN "refund_processed_at" timestamp;