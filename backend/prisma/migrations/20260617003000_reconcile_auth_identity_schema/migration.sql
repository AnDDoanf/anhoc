ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "first_name" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "last_name" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "login_id" VARCHAR(80);

CREATE INDEX IF NOT EXISTS "users_login_id_idx" ON "users"("login_id");

CREATE TABLE IF NOT EXISTS "user_securities" (
  "user_id" UUID NOT NULL,
  "email_verification_token" VARCHAR(255),
  "email_verification_sent_at" TIMESTAMPTZ,
  "email_verified_at" TIMESTAMPTZ,
  "first_login_at" TIMESTAMPTZ,
  "inactive_cleanup_at" TIMESTAMPTZ,
  "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
  "lockout_until" TIMESTAMPTZ,
  "password_reset_token" VARCHAR(255),
  "password_reset_sent_at" TIMESTAMPTZ,
  CONSTRAINT "user_securities_pkey" PRIMARY KEY ("user_id"),
  CONSTRAINT "user_securities_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_securities_email_verification_token_key"
  ON "user_securities"("email_verification_token");
CREATE UNIQUE INDEX IF NOT EXISTS "user_securities_password_reset_token_key"
  ON "user_securities"("password_reset_token");
CREATE INDEX IF NOT EXISTS "user_securities_account_status_inactive_cleanup_idx"
  ON "user_securities"("inactive_cleanup_at");

CREATE TABLE IF NOT EXISTS "user_learning_profiles" (
  "user_id" UUID NOT NULL,
  "preferred_subject_id" INTEGER,
  CONSTRAINT "user_learning_profiles_pkey" PRIMARY KEY ("user_id"),
  CONSTRAINT "user_learning_profiles_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_learning_profiles_preferred_subject_id_fkey"
    FOREIGN KEY ("preferred_subject_id") REFERENCES "subjects"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "refresh_tokens" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "token" TEXT NOT NULL,
  "user_id" UUID NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revoked_at" TIMESTAMPTZ,
  CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "refresh_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "refresh_tokens_token_key" ON "refresh_tokens"("token");
CREATE INDEX IF NOT EXISTS "refresh_tokens_token_idx" ON "refresh_tokens"("token");
CREATE INDEX IF NOT EXISTS "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'email_verification_token'
  ) THEN
    INSERT INTO "user_securities" (
      "user_id",
      "email_verification_token",
      "email_verification_sent_at",
      "email_verified_at",
      "first_login_at",
      "inactive_cleanup_at"
    )
    SELECT
      "id",
      "email_verification_token",
      "email_verification_sent_at",
      "email_verified_at",
      "first_login_at",
      "inactive_cleanup_at"
    FROM "users"
    ON CONFLICT ("user_id") DO UPDATE
    SET
      "email_verification_token" = COALESCE(EXCLUDED."email_verification_token", "user_securities"."email_verification_token"),
      "email_verification_sent_at" = COALESCE(EXCLUDED."email_verification_sent_at", "user_securities"."email_verification_sent_at"),
      "email_verified_at" = COALESCE(EXCLUDED."email_verified_at", "user_securities"."email_verified_at"),
      "first_login_at" = COALESCE(EXCLUDED."first_login_at", "user_securities"."first_login_at"),
      "inactive_cleanup_at" = COALESCE(EXCLUDED."inactive_cleanup_at", "user_securities"."inactive_cleanup_at");
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'preferred_subject_id'
  ) THEN
    INSERT INTO "user_learning_profiles" ("user_id", "preferred_subject_id")
    SELECT "id", "preferred_subject_id"
    FROM "users"
    ON CONFLICT ("user_id") DO UPDATE
    SET "preferred_subject_id" = COALESCE(
      EXCLUDED."preferred_subject_id",
      "user_learning_profiles"."preferred_subject_id"
    );
  END IF;
END $$;

INSERT INTO "user_securities" ("user_id")
SELECT "id"
FROM "users"
ON CONFLICT ("user_id") DO NOTHING;

INSERT INTO "user_learning_profiles" ("user_id")
SELECT "id"
FROM "users"
ON CONFLICT ("user_id") DO NOTHING;
