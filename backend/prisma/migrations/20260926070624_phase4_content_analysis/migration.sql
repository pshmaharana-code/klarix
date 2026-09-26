-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "JobType" ADD VALUE 'ANALYZE_CONTENT';
ALTER TYPE "JobType" ADD VALUE 'ANALYZE_BATCH';

-- CreateTable
CREATE TABLE "content_analyses" (
    "id" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "status" "AnalysisStatus" NOT NULL DEFAULT 'COMPLETED',
    "visual_findings" JSONB,
    "content_findings" JSONB,
    "perf_findings" JSONB,
    "confidence" DOUBLE PRECISION,
    "provider_meta" JSONB,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_analyses_content_id_version_idx" ON "content_analyses"("content_id", "version");

-- AddForeignKey
ALTER TABLE "content_analyses" ADD CONSTRAINT "content_analyses_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
