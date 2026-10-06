-- CreateTable
CREATE TABLE "content_derived_metrics" (
    "id" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "calculation_version" TEXT NOT NULL DEFAULT '1.0',
    "like_rate" DOUBLE PRECISION,
    "comment_rate" DOUBLE PRECISION,
    "save_rate" DOUBLE PRECISION,
    "share_rate" DOUBLE PRECISION,
    "interaction_rate" DOUBLE PRECISION,
    "view_to_reach_ratio" DOUBLE PRECISION,
    "percentile_comparison" JSONB,
    "baseline_comparison" JSONB,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_derived_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_derived_metrics_content_id_idx" ON "content_derived_metrics"("content_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_derived_metrics_content_id_calculation_version_key" ON "content_derived_metrics"("content_id", "calculation_version");

-- AddForeignKey
ALTER TABLE "content_derived_metrics" ADD CONSTRAINT "content_derived_metrics_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
