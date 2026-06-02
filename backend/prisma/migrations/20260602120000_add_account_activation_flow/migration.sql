ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "account_status" VARCHAR(20) NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS "email_verification_token" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "email_verification_sent_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "email_verified_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "first_login_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "inactive_cleanup_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "preferred_subject_id" INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_preferred_subject_id_fkey'
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_preferred_subject_id_fkey"
      FOREIGN KEY ("preferred_subject_id") REFERENCES "subjects"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_verification_token_key" ON "users"("email_verification_token");
CREATE INDEX IF NOT EXISTS "users_account_status_inactive_cleanup_at_idx" ON "users"("account_status", "inactive_cleanup_at");

UPDATE "users"
SET
  "account_status" = 'active',
  "email_verified_at" = COALESCE("email_verified_at", NOW())
WHERE "email" IN ('admin@dev.com', 'teacher@dev.com', 'student@dev.com', 'student2@dev.com', 'student3@dev.com');
