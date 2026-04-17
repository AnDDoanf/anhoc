CREATE TABLE IF NOT EXISTS "question_template_reports" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "template_id" UUID NOT NULL,
  "snapshot_id" UUID,
  "attempt_id" UUID,
  "lesson_id" UUID,
  "reporter_id" UUID,
  "reason" TEXT NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'open',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "question_template_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "question_template_reports_template_id_idx" ON "question_template_reports"("template_id");
CREATE INDEX IF NOT EXISTS "question_template_reports_snapshot_id_idx" ON "question_template_reports"("snapshot_id");
CREATE INDEX IF NOT EXISTS "question_template_reports_reporter_id_idx" ON "question_template_reports"("reporter_id");
CREATE INDEX IF NOT EXISTS "question_template_reports_status_idx" ON "question_template_reports"("status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'question_template_reports_template_id_fkey'
  ) THEN
    ALTER TABLE "question_template_reports"
      ADD CONSTRAINT "question_template_reports_template_id_fkey"
      FOREIGN KEY ("template_id") REFERENCES "question_templates"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'question_template_reports_snapshot_id_fkey'
  ) THEN
    ALTER TABLE "question_template_reports"
      ADD CONSTRAINT "question_template_reports_snapshot_id_fkey"
      FOREIGN KEY ("snapshot_id") REFERENCES "question_snapshots"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'question_template_reports_attempt_id_fkey'
  ) THEN
    ALTER TABLE "question_template_reports"
      ADD CONSTRAINT "question_template_reports_attempt_id_fkey"
      FOREIGN KEY ("attempt_id") REFERENCES "test_attempts"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'question_template_reports_lesson_id_fkey'
  ) THEN
    ALTER TABLE "question_template_reports"
      ADD CONSTRAINT "question_template_reports_lesson_id_fkey"
      FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'question_template_reports_reporter_id_fkey'
  ) THEN
    ALTER TABLE "question_template_reports"
      ADD CONSTRAINT "question_template_reports_reporter_id_fkey"
      FOREIGN KEY ("reporter_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
