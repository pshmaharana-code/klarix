-- AlterTable
ALTER TABLE "content_metric_snapshots" ADD COLUMN     "ig_reels_avg_watch_time" INTEGER,
ADD COLUMN     "ig_reels_video_view_total_time" INTEGER,
ADD COLUMN     "reels_skip_rate" DOUBLE PRECISION,
ADD COLUMN     "total_interactions" INTEGER;
