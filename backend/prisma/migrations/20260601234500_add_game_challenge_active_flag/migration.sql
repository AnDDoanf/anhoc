ALTER TABLE "game_challenges"
ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "game_challenges_created_by_is_active_idx"
ON "game_challenges"("created_by", "is_active");
