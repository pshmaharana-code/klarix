-- CreateTable
CREATE TABLE "social_account_metric_snapshots" (
    "id" TEXT NOT NULL,
    "social_account_id" TEXT NOT NULL,
    "metric_name" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "breakdown_definition" TEXT NOT NULL DEFAULT 'none',
    "value" INTEGER,
    "breakdowns" JSONB,
    "raw_payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_account_metric_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "social_account_metric_snapshots_social_account_id_metric_na_idx" ON "social_account_metric_snapshots"("social_account_id", "metric_name", "end_time");

-- CreateIndex
CREATE UNIQUE INDEX "social_account_metric_snapshots_social_account_id_metric_na_key" ON "social_account_metric_snapshots"("social_account_id", "metric_name", "period", "end_time", "breakdown_definition");

-- AddForeignKey
ALTER TABLE "social_account_metric_snapshots" ADD CONSTRAINT "social_account_metric_snapshots_social_account_id_fkey" FOREIGN KEY ("social_account_id") REFERENCES "social_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
