ALTER TABLE "event_bookings" ALTER COLUMN "name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "event_bookings" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "event_bookings" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "event_bookings" ADD CONSTRAINT "event_bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;