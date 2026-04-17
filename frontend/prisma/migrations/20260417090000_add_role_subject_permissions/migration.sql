CREATE TABLE IF NOT EXISTS "subjects" (
  "id" SERIAL PRIMARY KEY,
  "slug" VARCHAR(50) NOT NULL,
  "title_en" VARCHAR(100) NOT NULL,
  "title_vi" VARCHAR(100) NOT NULL,
  "color" VARCHAR(20)
);

CREATE UNIQUE INDEX IF NOT EXISTS "subjects_slug_key" ON "subjects"("slug");

CREATE TABLE IF NOT EXISTS "role_subject_permissions" (
  "id" SERIAL PRIMARY KEY,
  "role_id" INTEGER NOT NULL,
  "subject_id" INTEGER NOT NULL,
  CONSTRAINT "role_subject_permissions_role_id_fkey"
    FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "role_subject_permissions_subject_id_fkey"
    FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "role_subject_permissions_role_id_subject_id_key"
  ON "role_subject_permissions"("role_id", "subject_id");

INSERT INTO "role_subject_permissions" ("role_id", "subject_id")
SELECT r."id", s."id"
FROM "roles" r
CROSS JOIN "subjects" s
ON CONFLICT ("role_id", "subject_id") DO NOTHING;
