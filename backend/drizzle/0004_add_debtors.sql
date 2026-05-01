CREATE TABLE "debtors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone" varchar(20),
	"notes" text,
	"status" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stock_exits" ADD COLUMN "debtor_id" uuid;
--> statement-breakpoint
ALTER TABLE "stock_exits" ADD CONSTRAINT "stock_exits_debtor_id_debtors_id_fk" FOREIGN KEY ("debtor_id") REFERENCES "public"."debtors"("id") ON DELETE set null ON UPDATE no action;
