CREATE TABLE IF NOT EXISTS "grades" (
  "id" SERIAL PRIMARY KEY,
  "slug" VARCHAR(50) NOT NULL,
  "title_en" VARCHAR(100) NOT NULL,
  "title_vi" VARCHAR(100) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "grades_slug_key" ON "grades"("slug");

ALTER TABLE "grades" ADD COLUMN IF NOT EXISTS "subject_id" INTEGER;

UPDATE "grades"
SET "subject_id" = (SELECT "id" FROM "subjects" ORDER BY "id" LIMIT 1)
WHERE "subject_id" IS NULL
  AND EXISTS (SELECT 1 FROM "subjects");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'grades_subject_id_fkey'
  ) THEN
    ALTER TABLE "grades"
      ADD CONSTRAINT "grades_subject_id_fkey"
      FOREIGN KEY ("subject_id") REFERENCES "subjects"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
