ALTER TABLE "earning_rules" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "idempotency_keys" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "earning_rules" CASCADE;--> statement-breakpoint
DROP TABLE "idempotency_keys" CASCADE;--> statement-breakpoint
ALTER TABLE "stock_movements" DROP CONSTRAINT "stock_movements_product_id_products_id_fk";
