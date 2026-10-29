/*
  Warnings:

  - A unique constraint covering the columns `[content_id,version]` on the table `content_analyses` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[google_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phone_number]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "JobType" ADD VALUE 'UPDATE_MEMORY';
ALTER TYPE "JobType" ADD VALUE 'GENERATE_STRATEGY';
ALTER TYPE "JobType" ADD VALUE 'GENERATE_CONTENT_IDEAS';
ALTER TYPE "JobType" ADD VALUE 'GENERATE_SCRIPT';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "google_id" TEXT,
ADD COLUMN     "phone_number" TEXT,
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "password" DROP NOT NULL;

-- CreateTable
CREATE TABLE "brand_memory_entries" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "confidence" DECIMAL(5,2),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "provenance" JSONB,
    "evidence" JSONB,
    "source_version" TEXT,
    "valid_from" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "valid_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_memory_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategies" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "objective" TEXT,
    "target_audience" TEXT,
    "positioning" TEXT,
    "pillars" JSONB,
    "recommended_formats" JSONB,
    "do_list" JSONB,
    "stop_list" JSONB,
    "experiments" JSONB,
    "success_metrics" JSONB,
    "source_snapshot" JSONB,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "strategies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_ideas" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "strategy_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "hook" TEXT NOT NULL,
    "pillar" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "source_refs" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_ideas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scripts" (
    "id" TEXT NOT NULL,
    "content_idea_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "hook" TEXT NOT NULL,
    "opening" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "transitions" JSONB,
    "cta" TEXT NOT NULL,
    "visual_direction" TEXT NOT NULL,
    "estimated_duration_seconds" INTEGER,
    "voice_check" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scripts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_tokens" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "brand_memory_entries_brand_id_domain_status_idx" ON "brand_memory_entries"("brand_id", "domain", "status");

-- CreateIndex
CREATE UNIQUE INDEX "strategies_brand_id_version_key" ON "strategies"("brand_id", "version");

-- CreateIndex
CREATE INDEX "content_ideas_brand_id_status_idx" ON "content_ideas"("brand_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "scripts_content_idea_id_version_key" ON "scripts"("content_idea_id", "version");

-- CreateIndex
CREATE INDEX "otp_tokens_phone_idx" ON "otp_tokens"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "content_analyses_content_id_version_key" ON "content_analyses"("content_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_number_key" ON "users"("phone_number");

-- AddForeignKey
ALTER TABLE "brand_memory_entries" ADD CONSTRAINT "brand_memory_entries_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategies" ADD CONSTRAINT "strategies_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_ideas" ADD CONSTRAINT "content_ideas_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scripts" ADD CONSTRAINT "scripts_content_idea_id_fkey" FOREIGN KEY ("content_idea_id") REFERENCES "content_ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
