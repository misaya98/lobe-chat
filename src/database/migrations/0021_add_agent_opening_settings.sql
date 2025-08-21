ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "opening_message" text;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "opening_questions" text[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "market_identifier" text;