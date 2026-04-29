ALTER TABLE "products" DROP CONSTRAINT "products_unit_id_units_id_fk";
--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "unit_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE set null ON UPDATE no action;