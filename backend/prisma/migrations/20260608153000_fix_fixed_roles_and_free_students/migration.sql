INSERT INTO "roles" ("name")
VALUES
  ('free_student'),
  ('sub_student'),
  ('teacher'),
  ('supervisor'),
  ('admin')
ON CONFLICT ("name") DO NOTHING;

UPDATE "users" AS "u"
SET "role_id" = "free_role"."id"
FROM "roles" AS "legacy_role"
CROSS JOIN "roles" AS "free_role"
WHERE "u"."role_id" = "legacy_role"."id"
  AND "legacy_role"."name" = 'student'
  AND "free_role"."name" = 'free_student';

DELETE FROM "role_subject_permissions"
WHERE "role_id" IN (
  SELECT "id"
  FROM "roles"
  WHERE "name" = 'student'
);

DELETE FROM "role_permissions"
WHERE "role_id" IN (
  SELECT "id"
  FROM "roles"
  WHERE "name" = 'student'
);

DELETE FROM "roles"
WHERE "name" = 'student'
  AND NOT EXISTS (
    SELECT 1
    FROM "users"
    WHERE "users"."role_id" = "roles"."id"
  );
