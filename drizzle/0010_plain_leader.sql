CREATE TABLE "marketing_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"title" text,
	"subtitle" text,
	"cta_text" text,
	"cta_link" text,
	"image_url" text,
	"visible" boolean DEFAULT true,
	"starts_at" timestamp,
	"ends_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DROP TABLE "email_events" CASCADE;