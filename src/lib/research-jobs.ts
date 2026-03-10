/**
 * In-memory job store for async research operations.
 * Prevents duplicate research on the same contact and allows polling for progress.
 */

export interface ResearchJob {
  id: string;
  contactId: string;
  type: 'ai' | 'deep';
  status: 'running' | 'done' | 'error';
  stage?: string;        // human-readable current stage
  error?: string;
  startedAt: string;
  finishedAt?: string;
}

const jobs = new Map<string, ResearchJob>();

// contactId -> jobId mapping for active jobs
const activeByContact = new Map<string, string>();

// Auto-cleanup: remove finished jobs after 10 minutes
const CLEANUP_TTL_MS = 10 * 60 * 1000;

function makeJobId() {
  return `rj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function scheduleCleanup(jobId: string) {
  setTimeout(() => {
    const job = jobs.get(jobId);
    if (job && job.status !== 'running') {
      jobs.delete(jobId);
      const activeJobId = activeByContact.get(job.contactId);
      if (activeJobId === jobId) {
        activeByContact.delete(job.contactId);
      }
    }
  }, CLEANUP_TTL_MS);
}

export const researchJobs = {
  create(contactId: string, type: 'ai' | 'deep'): ResearchJob {
    const job: ResearchJob = {
      id: makeJobId(),
      contactId,
      type,
      status: 'running',
      stage: type === 'deep' ? 'Запуск Deep Research...' : 'Запуск AI исследования...',
      startedAt: new Date().toISOString(),
    };
    jobs.set(job.id, job);
    activeByContact.set(contactId, job.id);
    return job;
  },

  get(jobId: string): ResearchJob | undefined {
    return jobs.get(jobId);
  },

  getActiveJob(contactId: string): ResearchJob | undefined {
    const jobId = activeByContact.get(contactId);
    if (!jobId) return undefined;
    const job = jobs.get(jobId);
    if (!job || job.status !== 'running') {
      activeByContact.delete(contactId);
      return undefined;
    }
    return job;
  },

  updateStage(jobId: string, stage: string) {
    const job = jobs.get(jobId);
    if (job && job.status === 'running') {
      job.stage = stage;
    }
  },

  complete(jobId: string) {
    const job = jobs.get(jobId);
    if (job) {
      job.status = 'done';
      job.stage = undefined;
      job.finishedAt = new Date().toISOString();
      activeByContact.delete(job.contactId);
      scheduleCleanup(jobId);
    }
  },

  fail(jobId: string, error: string) {
    const job = jobs.get(jobId);
    if (job) {
      job.status = 'error';
      job.error = error;
      job.stage = undefined;
      job.finishedAt = new Date().toISOString();
      activeByContact.delete(job.contactId);
      scheduleCleanup(jobId);
    }
  },
};
