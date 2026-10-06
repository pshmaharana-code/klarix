ALTER TABLE "content_derived_metrics" ADD COLUMN "source_snapshot_id" TEXT;
ALTER TABLE "content_derived_metrics" ADD CONSTRAINT "content_derived_metrics_source_snapshot_id_fkey" FOREIGN KEY ("source_snapshot_id") REFERENCES "content_metric_snapshots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
