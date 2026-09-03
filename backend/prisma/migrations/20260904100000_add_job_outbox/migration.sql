CREATE TABLE "job_outbox" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "delivered_at" TIMESTAMP(3),
    "claimed_at" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "job_outbox_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "job_outbox_job_id_key" ON "job_outbox"("job_id");
CREATE INDEX "job_outbox_delivered_at_claimed_at_idx" ON "job_outbox"("delivered_at", "claimed_at");
ALTER TABLE "job_outbox" ADD CONSTRAINT "job_outbox_job_id_fkey"
  FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
