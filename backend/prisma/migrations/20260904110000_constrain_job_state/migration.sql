CREATE TYPE "JobType" AS ENUM ('SYNC_ACCOUNT');
CREATE TYPE "JobState" AS ENUM ('QUEUED', 'PROCESSING', 'RETRY_PENDING', 'COMPLETED', 'FAILED');
CREATE TYPE "JobLogLevel" AS ENUM ('INFO', 'ERROR');

UPDATE "jobs" SET "state" = 'QUEUED' WHERE "state" = 'CREATED';
ALTER TABLE "jobs" ALTER COLUMN "type" TYPE "JobType" USING "type"::"JobType";
ALTER TABLE "jobs" ALTER COLUMN "state" DROP DEFAULT;
ALTER TABLE "jobs" ALTER COLUMN "state" TYPE "JobState" USING "state"::"JobState";
ALTER TABLE "jobs" ALTER COLUMN "state" SET DEFAULT 'QUEUED';
ALTER TABLE "job_logs" ALTER COLUMN "level" DROP DEFAULT;
ALTER TABLE "job_logs" ALTER COLUMN "level" TYPE "JobLogLevel" USING "level"::"JobLogLevel";
ALTER TABLE "job_logs" ALTER COLUMN "level" SET DEFAULT 'INFO';
CREATE INDEX "job_logs_job_id_timestamp_idx" ON "job_logs"("job_id", "timestamp");
