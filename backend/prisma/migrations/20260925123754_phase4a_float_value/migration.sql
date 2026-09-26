-- AlterEnum
ALTER TYPE "JobType" ADD VALUE 'FETCH_ACCOUNT_METRICS';

-- AlterTable
ALTER TABLE "social_account_metric_snapshots" ALTER COLUMN "value" SET DATA TYPE DOUBLE PRECISION;
