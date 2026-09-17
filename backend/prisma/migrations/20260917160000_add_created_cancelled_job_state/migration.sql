-- Add CREATED as the initial durable job state (before QUEUED) and
-- CANCELLED as a terminal state, per §19.1 of the Klarix V2 Master
-- Engineering Specification.
--
-- CREATED: job is committed to PostgreSQL and the outbox but has not yet
--   been delivered to the BullMQ queue. The outbox dispatcher transitions
--   CREATED → QUEUED on successful Redis delivery.
-- CANCELLED: terminal state for safe cancellation of waiting jobs.
--
-- Requires PostgreSQL 14+ (ALTER TYPE ADD VALUE inside a transaction).
ALTER TYPE "JobState" ADD VALUE IF NOT EXISTS 'CREATED' BEFORE 'QUEUED';
ALTER TYPE "JobState" ADD VALUE IF NOT EXISTS 'CANCELLED';
