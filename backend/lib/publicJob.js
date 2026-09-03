const SAFE_ERROR_CODES = new Set([
  'QUEUE_UNAVAILABLE',
  'OAUTH_INVALID',
  'OAUTH_STATE_INVALID',
  'SOCIAL_ACCOUNT_OWNERSHIP_CONFLICT',
  'PROCESSING_FAILED'
]);

export function toPublicJob(job) {
  if (!job) return null;

  const errorCode = typeof job.error?.code === 'string' && SAFE_ERROR_CODES.has(job.error.code)
    ? job.error.code
    : job.state === 'FAILED' ? 'PROCESSING_FAILED' : null;

  return {
    id: job.id,
    type: job.type,
    state: job.state,
    progressPercent: job.progressPercent,
    progressStep: job.progressStep,
    progressMessage: job.progressMessage,
    result: job.result,
    error: errorCode ? { code: errorCode } : null,
    attempts: job.attempts,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt
  };
}
