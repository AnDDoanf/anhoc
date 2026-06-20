-- CreateTable achievements
CREATE TABLE IF NOT EXISTS "achievements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(50) NOT NULL,
    "title_en" TEXT NOT NULL,
    "title_vi" TEXT NOT NULL,
    "description_en" TEXT NOT NULL DEFAULT '',
    "description_vi" TEXT NOT NULL DEFAULT '',
    "category" VARCHAR(50) NOT NULL DEFAULT 'general',
    "xp_reward" INTEGER NOT NULL DEFAULT 0,
    "icon" VARCHAR(50),

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "achievements_slug_key" ON "achievements"("slug");

-- CreateTable user_achievements
CREATE TABLE IF NOT EXISTS "user_achievements" (
    "user_id" UUID NOT NULL,
    "achievement_id" UUID NOT NULL,
    "earned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("user_id","achievement_id"),
    CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
