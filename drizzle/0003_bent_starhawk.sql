CREATE TYPE "public"."voucher_status" AS ENUM('active', 'redeemed', 'void');--> statement-breakpoint
CREATE TABLE "voucher_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"voucher_id" uuid NOT NULL,
	"redeemed_amount_pence" integer NOT NULL,
	"note" text,
	"staff_user_id" varchar(64),
	"location" varchar(120) DEFAULT 'store',
	"redeemed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vouchers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(32) NOT NULL,
	"amount_initial_pence" integer NOT NULL,
	"amount_remaining_pence" integer NOT NULL,
	"currency" varchar(10) DEFAULT 'gbp' NOT NULL,
	"status" "voucher_status" DEFAULT 'active' NOT NULL,
	"buyer_email" varchar(255) NOT NULL,
	"recipient_email" varchar(255),
	"personal_message" text,
	"stripe_payment_intent_id" varchar(255),
	"stripe_checkout_session_id" varchar(255),
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vouchers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_voucher_id_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."vouchers"("id") ON DELETE cascade ON UPDATE no action;