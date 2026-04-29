CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'partial', 'cancelled');--> statement-breakpoint
ALTER TABLE "products" DROP CONSTRAINT "products_code_unique";--> statement-breakpoint
ALTER TABLE "stock_exits" ADD COLUMN "payment_status" "payment_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "stock_exits" ADD COLUMN "paid_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "products_code_unique_idx" ON "products" USING btree ("code") WHERE "products"."code" IS NOT NULL;