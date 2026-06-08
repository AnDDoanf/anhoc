UPDATE "users" AS "u"
SET "role_id" = "free_role"."id"
FROM "roles" AS "current_role"
CROSS JOIN "roles" AS "free_role"
WHERE "u"."role_id" = "current_role"."id"
  AND "current_role"."name" NOT IN ('free_student', 'sub_student', 'teacher', 'supervisor', 'admin')
  AND "free_role"."name" = 'free_student';

DELETE FROM "role_subject_permissions"
WHERE "role_id" IN (
  SELECT "id"
  FROM "roles"
  WHERE "name" NOT IN ('free_student', 'sub_student', 'teacher', 'supervisor', 'admin')
);

DELETE FROM "role_permissions"
WHERE "role_id" IN (
  SELECT "id"
  FROM "roles"
  WHERE "name" NOT IN ('free_student', 'sub_student', 'teacher', 'supervisor', 'admin')
);

DELETE FROM "roles"
WHERE "name" NOT IN ('free_student', 'sub_student', 'teacher', 'supervisor', 'admin')
  AND NOT EXISTS (
    SELECT 1
    FROM "users"
    WHERE "users"."role_id" = "roles"."id"
  );
