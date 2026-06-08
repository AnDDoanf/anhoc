-- CreateTable
CREATE TABLE "learn_units" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(120) NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "supervisor_id" UUID,
    "max_subjects" INTEGER,
    "max_grades" INTEGER,
    "max_lessons" INTEGER,
    "max_templates" INTEGER,
    "max_teachers" INTEGER,
    "max_students" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learn_units_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "question_templates" ADD COLUMN "created_by" UUID;
ALTER TABLE "users" ADD COLUMN "learn_unit_id" UUID;

-- Backfill question template ownership from lesson ownership when available
UPDATE "question_templates" AS qt
SET "created_by" = l."created_by"
FROM "lessons" AS l
WHERE qt."lesson_id" = l."id"
  AND qt."created_by" IS NULL;

-- Backfill learn units from existing supervisors
WITH supervisors AS (
    SELECT
        u."id" AS "supervisor_id",
        u."username",
        u."created_at",
        u."max_subjects",
        u."max_grades",
        u."max_lessons",
        u."max_templates",
        u."max_teachers",
        u."max_students",
        ROW_NUMBER() OVER (ORDER BY u."created_at", u."id") AS "seq"
    FROM "users" u
    INNER JOIN "roles" r ON r."id" = u."role_id"
    WHERE r."name" = 'supervisor'
),
inserted_units AS (
    INSERT INTO "learn_units" (
        "name",
        "code",
        "supervisor_id",
        "max_subjects",
        "max_grades",
        "max_lessons",
        "max_templates",
        "max_teachers",
        "max_students",
        "created_at"
    )
    SELECT
        CASE
            WHEN NULLIF(BTRIM(s."username"), '') IS NOT NULL
                THEN INITCAP(REPLACE(s."username", '_', ' ')) || ' Learn Unit'
            ELSE 'Learn Unit ' || s."seq"
        END,
        'LU-' || RPAD(SUBSTRING(UPPER(REGEXP_REPLACE(COALESCE(s."username", 'UNIT'), '[^A-Za-z0-9]', '', 'g')) FROM 1 FOR 6), 6, 'X') || '-' || LPAD(s."seq"::TEXT, 3, '0'),
        s."supervisor_id",
        s."max_subjects",
        s."max_grades",
        s."max_lessons",
        s."max_templates",
        s."max_teachers",
        s."max_students",
        s."created_at"
    FROM supervisors s
    RETURNING "id", "supervisor_id"
)
UPDATE "users" AS u
SET "learn_unit_id" = iu."id"
FROM inserted_units iu
WHERE u."id" = iu."supervisor_id"
   OR u."supervisor_id" = iu."supervisor_id";

-- Drop legacy user-scoped organization columns
ALTER TABLE "users"
    DROP COLUMN "supervisor_id",
    DROP COLUMN "max_subjects",
    DROP COLUMN "max_grades",
    DROP COLUMN "max_lessons",
    DROP COLUMN "max_templates",
    DROP COLUMN "max_teachers",
    DROP COLUMN "max_students";

-- CreateIndex
CREATE UNIQUE INDEX "learn_units_code_key" ON "learn_units"("code");
CREATE UNIQUE INDEX "learn_units_supervisor_id_key" ON "learn_units"("supervisor_id");
CREATE INDEX "users_learn_unit_id_idx" ON "users"("learn_unit_id");
CREATE INDEX "question_templates_created_by_idx" ON "question_templates"("created_by");

-- AddForeignKey
ALTER TABLE "users"
    ADD CONSTRAINT "users_learn_unit_id_fkey"
    FOREIGN KEY ("learn_unit_id") REFERENCES "learn_units"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "learn_units"
    ADD CONSTRAINT "learn_units_supervisor_id_fkey"
    FOREIGN KEY ("supervisor_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "grades"
    ADD CONSTRAINT "grades_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "subjects"
    ADD CONSTRAINT "subjects_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "question_templates"
    ADD CONSTRAINT "question_templates_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
