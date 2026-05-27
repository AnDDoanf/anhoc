CREATE TABLE IF NOT EXISTS "themes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "slug" VARCHAR(50) NOT NULL,
  "title_en" TEXT NOT NULL,
  "title_vi" TEXT NOT NULL,
  "description_en" TEXT NOT NULL DEFAULT '',
  "description_vi" TEXT NOT NULL DEFAULT '',
  "preview_color" VARCHAR(20),
  "light_variables" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "dark_variables" JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT "themes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "themes_slug_key" ON "themes"("slug");

ALTER TABLE "achievements"
  ADD COLUMN IF NOT EXISTS "theme_id" UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'achievements_theme_id_fkey'
  ) THEN
    ALTER TABLE "achievements"
      ADD CONSTRAINT "achievements_theme_id_fkey"
      FOREIGN KEY ("theme_id") REFERENCES "themes"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
