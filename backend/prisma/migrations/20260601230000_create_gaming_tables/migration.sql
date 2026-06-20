-- CreateTable game_challenges
CREATE TABLE IF NOT EXISTS "game_challenges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(10) NOT NULL,
    "game_type" VARCHAR(50) NOT NULL,
    "grade_id" INTEGER,
    "lesson_id" UUID,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "config" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "game_challenges_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "game_challenges_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "game_challenges_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "game_challenges_grade_id_fkey" FOREIGN KEY ("grade_id") REFERENCES "grades"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "game_challenges_code_key" ON "game_challenges"("code");

-- CreateTable game_attempts
CREATE TABLE IF NOT EXISTS "game_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "challenge_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "time_spent" INTEGER NOT NULL,
    "completed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_attempts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "game_attempts_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "game_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "game_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
