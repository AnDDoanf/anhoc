ALTER TABLE "subjects"
  ADD COLUMN IF NOT EXISTS "is_classified" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "user_subject_access_requests" (
  "id" SERIAL PRIMARY KEY,
  "user_id" UUID NOT NULL,
  "subject_id" INTEGER NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  "requested_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "reviewed_at" TIMESTAMPTZ,
  "reviewed_by" UUID,
  CONSTRAINT "user_subject_access_requests_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_subject_access_requests_subject_id_fkey"
    FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_subject_access_requests_reviewed_by_fkey"
    FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_subject_access_requests_user_id_subject_id_key"
  ON "user_subject_access_requests"("user_id", "subject_id");

CREATE INDEX IF NOT EXISTS "user_subject_access_requests_status_requested_at_idx"
  ON "user_subject_access_requests"("status", "requested_at");
