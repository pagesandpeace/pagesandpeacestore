CREATE TABLE "idempotency_keys" (
	"key" text PRIMARY KEY NOT NULL,
	"scope" text DEFAULT 'loyalty_optin' NOT NULL,
	"response" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "verification" RENAME TO "verifications";--> statement-breakpoint
ALTER TABLE "verifications" DROP CONSTRAINT "verification_value_unique";--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "price" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "total" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "price" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "inventory_count" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "is_subscription" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "loyaltyprogram" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "loyaltypoints" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_value_unique" UNIQUE("value");