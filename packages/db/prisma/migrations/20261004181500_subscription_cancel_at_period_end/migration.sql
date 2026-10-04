-- Persist Stripe cancel_at_period_end so a scheduled cancel is not lost locally.
ALTER TABLE "subscription" ADD COLUMN "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false;
