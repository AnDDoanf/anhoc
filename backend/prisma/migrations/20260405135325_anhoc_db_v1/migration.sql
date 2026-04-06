-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'admin');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title_vi" VARCHAR(255) NOT NULL,
    "content_markdown" TEXT NOT NULL,
    "grade_level" INTEGER DEFAULT 6,
    "order_index" INTEGER,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lesson_id" UUID,
    "template_type" VARCHAR(50) NOT NULL,
    "body_template_vi" TEXT NOT NULL,
    "logic_config" JSONB NOT NULL DEFAULT '{}',
    "answer_formula" TEXT,
    "explanation_template_vi" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title_vi" VARCHAR(255) NOT NULL,
    "time_limit_seconds" INTEGER,
    "passing_score" DECIMAL(5,2) DEFAULT 50.0,
    "is_active" BOOLEAN DEFAULT true,

    CONSTRAINT "tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_template_map" (
    "test_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "weight" INTEGER DEFAULT 1,
    "position" INTEGER,

    CONSTRAINT "test_template_map_pkey" PRIMARY KEY ("test_id","template_id")
);

-- CreateTable
CREATE TABLE "test_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "test_id" UUID,
    "total_score" DECIMAL(5,2),
    "is_completed" BOOLEAN DEFAULT false,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "test_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "attempt_id" UUID,
    "template_id" UUID,
    "generated_variables" JSONB NOT NULL,
    "student_answer" TEXT,
    "is_correct" BOOLEAN DEFAULT false,
    "points_earned" INTEGER DEFAULT 0,
    "responded_at" TIMESTAMPTZ,

    CONSTRAINT "question_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_stats" (
    "user_id" UUID NOT NULL,
    "lessons_completed" INTEGER DEFAULT 0,
    "total_xp" INTEGER DEFAULT 0,
    "average_score" DECIMAL(5,2) DEFAULT 0,
    "last_active" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_stats_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_templates" ADD CONSTRAINT "question_templates_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_template_map" ADD CONSTRAINT "test_template_map_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_template_map" ADD CONSTRAINT "test_template_map_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "question_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_attempts" ADD CONSTRAINT "test_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_attempts" ADD CONSTRAINT "test_attempts_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "tests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_snapshots" ADD CONSTRAINT "question_snapshots_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "test_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_snapshots" ADD CONSTRAINT "question_snapshots_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "question_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_stats" ADD CONSTRAINT "student_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
