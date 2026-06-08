ALTER TABLE "users"
ADD COLUMN "max_subjects" INTEGER,
ADD COLUMN "max_grades" INTEGER,
ADD COLUMN "max_lessons" INTEGER;

UPDATE "users"
SET
  "max_subjects" = COALESCE("max_subjects", "max_subjects_grades_lessons"),
  "max_grades" = COALESCE("max_grades", "max_subjects_grades_lessons"),
  "max_lessons" = COALESCE("max_lessons", "max_subjects_grades_lessons")
WHERE "max_subjects_grades_lessons" IS NOT NULL;

ALTER TABLE "users"
DROP COLUMN "max_subjects_grades_lessons";
