-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('REEL', 'IMAGE', 'CAROUSEL', 'VIDEO', 'OTHER');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('NOT_STARTED', 'QUEUED', 'PROCESSING', 'COMPLETED', 'PARTIAL', 'FAILED');

-- AlterEnum
ALTER TYPE "JobState" ADD VALUE 'PARTIAL';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "JobType" ADD VALUE 'IMPORT_CONTENT';
ALTER TYPE "JobType" ADD VALUE 'FETCH_METRICS';

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "max_attempts" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "parent_job_id" TEXT,
ADD COLUMN     "processed_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "queued_at" TIMESTAMP(3),
ADD COLUMN     "total_count" INTEGER;

-- CreateTable
CREATE TABLE "contents" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "social_account_id" TEXT NOT NULL,
    "external_content_id" TEXT NOT NULL,
    "type" "ContentType" NOT NULL,
    "caption" TEXT,
    "transcript" TEXT,
    "permalink" TEXT,
    "published_at" TIMESTAMP(3),
    "raw_payload" JSONB,
    "analysis_status" "AnalysisStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_media" (
    "id" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "media_type" TEXT NOT NULL,
    "object_key" TEXT,
    "source_url" TEXT,
    "sha256" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "duration_seconds" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_metric_snapshots" (
    "id" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "observed_at" TIMESTAMP(3) NOT NULL,
    "reach" INTEGER,
    "impressions" INTEGER,
    "plays" INTEGER,
    "likes" INTEGER,
    "comments" INTEGER,
    "saves" INTEGER,
    "shares" INTEGER,
    "raw_payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_metric_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contents_brand_id_published_at_idx" ON "contents"("brand_id", "published_at");

-- CreateIndex
CREATE INDEX "contents_brand_id_analysis_status_idx" ON "contents"("brand_id", "analysis_status");

-- CreateIndex
CREATE UNIQUE INDEX "contents_social_account_id_external_content_id_key" ON "contents"("social_account_id", "external_content_id");

-- CreateIndex
CREATE INDEX "content_media_content_id_idx" ON "content_media"("content_id");

-- CreateIndex
CREATE INDEX "content_metric_snapshots_content_id_observed_at_idx" ON "content_metric_snapshots"("content_id", "observed_at");

-- CreateIndex
CREATE UNIQUE INDEX "content_metric_snapshots_content_id_observed_at_key" ON "content_metric_snapshots"("content_id", "observed_at");

-- CreateIndex
CREATE INDEX "jobs_parent_job_id_idx" ON "jobs"("parent_job_id");

-- CreateIndex
CREATE INDEX "jobs_state_type_created_at_idx" ON "jobs"("state", "type", "created_at");

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_parent_job_id_fkey" FOREIGN KEY ("parent_job_id") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contents" ADD CONSTRAINT "contents_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contents" ADD CONSTRAINT "contents_social_account_id_fkey" FOREIGN KEY ("social_account_id") REFERENCES "social_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_media" ADD CONSTRAINT "content_media_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_metric_snapshots" ADD CONSTRAINT "content_metric_snapshots_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
