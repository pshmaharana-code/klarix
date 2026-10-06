-- Phase 6: evidence-backed pattern discovery.
ALTER TYPE "JobType" ADD VALUE IF NOT EXISTS 'DISCOVER_PATTERNS';

-- CreateTable
CREATE TABLE "patterns" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "claim" TEXT NOT NULL,
    "confidence" DECIMAL(5,2),
    "impact" JSONB,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "analysis_version" TEXT NOT NULL DEFAULT '1.0',
    "recommended_action" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "superseded_at" TIMESTAMP(3),

    CONSTRAINT "patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pattern_evidence" (
    "id" TEXT NOT NULL,
    "pattern_id" TEXT NOT NULL,
    "content_id" TEXT,
    "metric_snapshot_id" TEXT,
    "contribution" DOUBLE PRECISION,
    "summary" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pattern_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "patterns_brand_id_status_idx" ON "patterns"("brand_id", "status");

-- CreateIndex
CREATE INDEX "pattern_evidence_pattern_id_created_at_idx" ON "pattern_evidence"("pattern_id", "created_at");

-- CreateIndex
CREATE INDEX "pattern_evidence_content_id_idx" ON "pattern_evidence"("content_id");

-- AddForeignKey
ALTER TABLE "patterns" ADD CONSTRAINT "patterns_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pattern_evidence" ADD CONSTRAINT "pattern_evidence_pattern_id_fkey" FOREIGN KEY ("pattern_id") REFERENCES "patterns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pattern_evidence" ADD CONSTRAINT "pattern_evidence_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "contents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pattern_evidence" ADD CONSTRAINT "pattern_evidence_metric_snapshot_id_fkey" FOREIGN KEY ("metric_snapshot_id") REFERENCES "content_metric_snapshots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
