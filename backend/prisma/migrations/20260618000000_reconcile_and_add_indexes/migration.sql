-- DropForeignKey
ALTER TABLE IF EXISTS "test_attempts" DROP CONSTRAINT IF EXISTS "test_attempts_test_id_fkey";
ALTER TABLE IF EXISTS "test_template_map" DROP CONSTRAINT IF EXISTS "test_template_map_template_id_fkey";
ALTER TABLE IF EXISTS "test_template_map" DROP CONSTRAINT IF EXISTS "test_template_map_test_id_fkey";
ALTER TABLE IF EXISTS "users" DROP CONSTRAINT IF EXISTS "users_preferred_subject_id_fkey";

-- DropIndex
DROP INDEX IF EXISTS "question_templates_created_by_idx";
DROP INDEX IF EXISTS "user_securities_account_status_inactive_cleanup_idx";
DROP INDEX IF EXISTS "users_email_verification_token_key";
DROP INDEX IF EXISTS "users_login_id_idx";

-- AlterTable
ALTER TABLE IF EXISTS "lessons" 
  DROP COLUMN IF EXISTS "content_markdown",
  DROP COLUMN IF EXISTS "grade_level",
  ADD COLUMN IF NOT EXISTS "content_markdown_en" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "content_markdown_vi" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "grade_id" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "is_premium" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "subject_id" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "title_en" VARCHAR(255) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE IF EXISTS "question_snapshots" ADD COLUMN IF NOT EXISTS "right_answers" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE IF EXISTS "question_templates" 
  DROP COLUMN IF EXISTS "answer_formula",
  ADD COLUMN IF NOT EXISTS "accepted_formulas" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "body_template_en" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "explanation_template_en" TEXT,
  ADD COLUMN IF NOT EXISTS "is_premium" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE IF EXISTS "student_stats" 
  ADD COLUMN IF NOT EXISTS "coin_transactions" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "coins" INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS "equipped_items" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "inventory" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "last_life_restored_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "level" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "level_points" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lives" INTEGER NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS "upgrades" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE IF EXISTS "test_attempts" 
  DROP COLUMN IF EXISTS "test_id",
  ADD COLUMN IF NOT EXISTS "is_practice" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "lesson_id" UUID;

-- AlterTable
ALTER TABLE IF EXISTS "users" 
  DROP COLUMN IF EXISTS "email_verification_sent_at",
  DROP COLUMN IF EXISTS "email_verification_token",
  DROP COLUMN IF EXISTS "email_verified_at",
  DROP COLUMN IF EXISTS "first_login_at",
  DROP COLUMN IF EXISTS "inactive_cleanup_at",
  DROP COLUMN IF EXISTS "preferred_subject_id",
  ADD COLUMN IF NOT EXISTS "avatar_url" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "slots_purchased" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE IF EXISTS "test_template_map";
DROP TABLE IF EXISTS "tests";

-- CreateTable
CREATE TABLE IF NOT EXISTS "learning_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ,
    "duration_sec" INTEGER,

    CONSTRAINT "learning_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "user_lesson_mastery" (
    "user_id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "mastery_score" DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    "total_study_time" INTEGER NOT NULL DEFAULT 0,
    "total_test_time" INTEGER NOT NULL DEFAULT 0,
    "completion_status" TEXT NOT NULL DEFAULT 'not_started',
    "last_activity_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_lesson_mastery_pkey" PRIMARY KEY ("user_id","lesson_id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "xp_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" VARCHAR(100) NOT NULL,
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "activity_evidence" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "attempt_id" UUID,
    "snapshot_id" UUID,
    "image_url" TEXT NOT NULL,
    "caption" VARCHAR(255),
    "uploaded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "metadata" JSONB DEFAULT '{}',
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "plans" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "vi_name" VARCHAR(100) NOT NULL DEFAULT '',
    "en_name" VARCHAR(100) NOT NULL DEFAULT '',
    "description" VARCHAR(255),
    "price_monthly" DECIMAL(10,2) NOT NULL,
    "price_annually" DECIMAL(10,2) NOT NULL,
    "max_students" INTEGER,
    "max_teachers" INTEGER,
    "max_lessons" INTEGER,
    "max_templates" INTEGER,
    "max_subjects" INTEGER,
    "max_grades" INTEGER,
    "price_per_student_monthly" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "price_per_student_annually" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "price_per_teacher_monthly" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "price_per_teacher_annually" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "price_per_lesson_monthly" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "price_per_lesson_annually" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "price_per_grade_monthly" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "price_per_grade_annually" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "price_per_template_monthly" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "price_per_template_annually" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "effect_from" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effect_to" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "subscription_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "billing_cycle" VARCHAR(20) NOT NULL,
    "start_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" TIMESTAMPTZ,
    "auto_renew" BOOLEAN NOT NULL DEFAULT true,
    "slots_purchased" INTEGER NOT NULL DEFAULT 0,
    "max_students" INTEGER,
    "max_teachers" INTEGER,
    "max_lessons" INTEGER,
    "max_templates" INTEGER,
    "max_grades" INTEGER,
    "max_subjects" INTEGER,
    "effect_from" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effect_to" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "subscription_plan_id" UUID,
    "amount" DECIMAL(10,2) NOT NULL,
    "billing_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(20) NOT NULL DEFAULT 'paid',
    "description" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "learning_sessions_user_id_lesson_id_idx" ON "learning_sessions"("user_id", "lesson_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_lesson_mastery_user_id_last_activity_at_idx" ON "user_lesson_mastery"("user_id", "last_activity_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "xp_logs_user_id_occurred_at_idx" ON "xp_logs"("user_id", "occurred_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "activity_evidence_user_id_idx" ON "activity_evidence"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "audit_logs_user_id_occurred_at_idx" ON "audit_logs"("user_id", "occurred_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "plans_name_effect_from_effect_to_idx" ON "plans"("name", "effect_from", "effect_to");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "subscription_plans_user_id_status_effect_from_effect_to_idx" ON "subscription_plans"("user_id", "status", "effect_from", "effect_to");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "invoices_user_id_billing_date_idx" ON "invoices"("user_id", "billing_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "game_attempts_user_id_idx" ON "game_attempts"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "game_attempts_challenge_id_completed_at_idx" ON "game_attempts"("challenge_id", "completed_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "lessons_grade_id_subject_id_idx" ON "lessons"("grade_id", "subject_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "lessons_created_by_idx" ON "lessons"("created_by");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "question_snapshots_attempt_id_idx" ON "question_snapshots"("attempt_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "question_snapshots_template_id_idx" ON "question_snapshots"("template_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "question_templates_lesson_id_idx" ON "question_templates"("lesson_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "test_attempts_user_id_idx" ON "test_attempts"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "test_attempts_lesson_id_idx" ON "test_attempts"("lesson_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "test_attempts_user_id_started_at_idx" ON "test_attempts"("user_id", "started_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "test_attempts_user_id_is_practice_idx" ON "test_attempts"("user_id", "is_practice");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lessons_grade_id_fkey') THEN
    ALTER TABLE "lessons" ADD CONSTRAINT "lessons_grade_id_fkey" FOREIGN KEY ("grade_id") REFERENCES "grades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lessons_subject_id_fkey') THEN
    ALTER TABLE "lessons" ADD CONSTRAINT "lessons_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'test_attempts_lesson_id_fkey') THEN
    ALTER TABLE "test_attempts" ADD CONSTRAINT "test_attempts_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'learning_sessions_user_id_fkey') THEN
    ALTER TABLE "learning_sessions" ADD CONSTRAINT "learning_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'learning_sessions_lesson_id_fkey') THEN
    ALTER TABLE "learning_sessions" ADD CONSTRAINT "learning_sessions_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_lesson_mastery_user_id_fkey') THEN
    ALTER TABLE "user_lesson_mastery" ADD CONSTRAINT "user_lesson_mastery_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_lesson_mastery_lesson_id_fkey') THEN
    ALTER TABLE "user_lesson_mastery" ADD CONSTRAINT "user_lesson_mastery_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'xp_logs_user_id_fkey') THEN
    ALTER TABLE "xp_logs" ADD CONSTRAINT "xp_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'activity_evidence_user_id_fkey') THEN
    ALTER TABLE "activity_evidence" ADD CONSTRAINT "activity_evidence_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'activity_evidence_attempt_id_fkey') THEN
    ALTER TABLE "activity_evidence" ADD CONSTRAINT "activity_evidence_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "test_attempts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'activity_evidence_snapshot_id_fkey') THEN
    ALTER TABLE "activity_evidence" ADD CONSTRAINT "activity_evidence_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "question_snapshots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_user_id_fkey') THEN
    ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscription_plans_user_id_fkey') THEN
    ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscription_plans_plan_id_fkey') THEN
    ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_user_id_fkey') THEN
    ALTER TABLE "invoices" ADD CONSTRAINT "invoices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_subscription_plan_id_fkey') THEN
    ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscription_plan_id_fkey" FOREIGN KEY ("subscription_plan_id") REFERENCES "subscription_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
