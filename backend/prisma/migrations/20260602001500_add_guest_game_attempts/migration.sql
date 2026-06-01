ALTER TABLE "game_attempts"
ALTER COLUMN "user_id" DROP NOT NULL;

ALTER TABLE "game_attempts"
ADD COLUMN "guest_name" VARCHAR(100),
ADD COLUMN "guest_token" VARCHAR(100);

CREATE UNIQUE INDEX "game_attempts_challenge_id_guest_token_key"
ON "game_attempts"("challenge_id", "guest_token");
