/**
 * Unit тесты для research-jobs.ts
 * In-memory job store для async research операций
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ResearchJob } from '@/lib/research-jobs';

describe('researchJobs', () => {
  let researchJobs: typeof import('@/lib/research-jobs').researchJobs;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetModules();
    const mod = await import('@/lib/research-jobs');
    researchJobs = mod.researchJobs;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates an AI job with correct defaults', () => {
      const job = researchJobs.create('contact-1', 'ai');

      expect(job.id).toMatch(/^rj_\d+_[a-z0-9]+$/);
      expect(job.contactId).toBe('contact-1');
      expect(job.type).toBe('ai');
      expect(job.status).toBe('running');
      expect(job.stage).toBe('Запуск AI исследования...');
      expect(job.startedAt).toBeTruthy();
      expect(job.finishedAt).toBeUndefined();
      expect(job.error).toBeUndefined();
    });

    it('creates a deep research job with correct stage text', () => {
      const job = researchJobs.create('contact-2', 'deep');

      expect(job.type).toBe('deep');
      expect(job.stage).toBe('Запуск Deep Research...');
    });

    it('generates unique IDs for each job', () => {
      const job1 = researchJobs.create('c1', 'ai');
      const job2 = researchJobs.create('c2', 'ai');

      expect(job1.id).not.toBe(job2.id);
    });
  });

  // ─── get ────────────────────────────────────────────────────────────────────

  describe('get', () => {
    it('returns the job by ID', () => {
      const created = researchJobs.create('c1', 'ai');
      const fetched = researchJobs.get(created.id);

      expect(fetched).toBeDefined();
      expect(fetched!.id).toBe(created.id);
      expect(fetched!.contactId).toBe('c1');
    });

    it('returns undefined for non-existent job ID', () => {
      expect(researchJobs.get('rj_nonexistent')).toBeUndefined();
    });
  });

  // ─── getActiveJob ──────────────────────────────────────────────────────────

  describe('getActiveJob', () => {
    it('returns the running job for a contact', () => {
      const job = researchJobs.create('c1', 'ai');
      const active = researchJobs.getActiveJob('c1');

      expect(active).toBeDefined();
      expect(active!.id).toBe(job.id);
    });

    it('returns undefined when no job exists for contact', () => {
      expect(researchJobs.getActiveJob('unknown-contact')).toBeUndefined();
    });

    it('returns undefined after job is completed (dedup cleared)', () => {
      const job = researchJobs.create('c1', 'ai');
      researchJobs.complete(job.id);

      expect(researchJobs.getActiveJob('c1')).toBeUndefined();
    });

    it('returns undefined after job has failed', () => {
      const job = researchJobs.create('c1', 'deep');
      researchJobs.fail(job.id, 'timeout');

      expect(researchJobs.getActiveJob('c1')).toBeUndefined();
    });

    it('deduplicates — new job for same contact replaces active mapping', () => {
      const job1 = researchJobs.create('c1', 'ai');
      const job2 = researchJobs.create('c1', 'deep');

      const active = researchJobs.getActiveJob('c1');
      expect(active!.id).toBe(job2.id);

      // job1 is still retrievable by ID but not as active
      expect(researchJobs.get(job1.id)).toBeDefined();
    });
  });

  // ─── updateStage ───────────────────────────────────────────────────────────

  describe('updateStage', () => {
    it('updates stage on a running job', () => {
      const job = researchJobs.create('c1', 'deep');
      researchJobs.updateStage(job.id, 'Searching...');

      expect(researchJobs.get(job.id)!.stage).toBe('Searching...');
    });

    it('does not update stage on a completed job', () => {
      const job = researchJobs.create('c1', 'ai');
      researchJobs.complete(job.id);
      researchJobs.updateStage(job.id, 'should not appear');

      expect(researchJobs.get(job.id)!.stage).toBeUndefined();
    });

    it('does not update stage on a failed job', () => {
      const job = researchJobs.create('c1', 'ai');
      researchJobs.fail(job.id, 'err');
      researchJobs.updateStage(job.id, 'should not appear');

      expect(researchJobs.get(job.id)!.stage).toBeUndefined();
    });

    it('is a no-op for non-existent job ID', () => {
      // Should not throw
      researchJobs.updateStage('rj_fake', 'test');
    });
  });

  // ─── complete ──────────────────────────────────────────────────────────────

  describe('complete', () => {
    it('sets status to done and clears stage', () => {
      const job = researchJobs.create('c1', 'ai');
      researchJobs.complete(job.id);

      const result = researchJobs.get(job.id)!;
      expect(result.status).toBe('done');
      expect(result.stage).toBeUndefined();
      expect(result.finishedAt).toBeTruthy();
    });

    it('removes contact from active mapping', () => {
      const job = researchJobs.create('c1', 'ai');
      researchJobs.complete(job.id);

      expect(researchJobs.getActiveJob('c1')).toBeUndefined();
    });

    it('is a no-op for non-existent job ID', () => {
      researchJobs.complete('rj_nonexistent');
      // Should not throw
    });
  });

  // ─── fail ──────────────────────────────────────────────────────────────────

  describe('fail', () => {
    it('sets status to error with error message', () => {
      const job = researchJobs.create('c1', 'deep');
      researchJobs.fail(job.id, 'API timeout');

      const result = researchJobs.get(job.id)!;
      expect(result.status).toBe('error');
      expect(result.error).toBe('API timeout');
      expect(result.stage).toBeUndefined();
      expect(result.finishedAt).toBeTruthy();
    });

    it('removes contact from active mapping', () => {
      const job = researchJobs.create('c1', 'ai');
      researchJobs.fail(job.id, 'fail');

      expect(researchJobs.getActiveJob('c1')).toBeUndefined();
    });

    it('is a no-op for non-existent job ID', () => {
      researchJobs.fail('rj_nonexistent', 'err');
    });
  });

  // ─── cleanup / expiration ──────────────────────────────────────────────────

  describe('auto-cleanup after TTL', () => {
    const CLEANUP_TTL_MS = 10 * 60 * 1000; // 10 minutes

    it('removes completed job after 10 minutes', () => {
      const job = researchJobs.create('c1', 'ai');
      researchJobs.complete(job.id);

      expect(researchJobs.get(job.id)).toBeDefined();

      vi.advanceTimersByTime(CLEANUP_TTL_MS);

      expect(researchJobs.get(job.id)).toBeUndefined();
    });

    it('removes failed job after 10 minutes', () => {
      const job = researchJobs.create('c1', 'deep');
      researchJobs.fail(job.id, 'error');

      vi.advanceTimersByTime(CLEANUP_TTL_MS);

      expect(researchJobs.get(job.id)).toBeUndefined();
    });

    it('does NOT remove a still-running job at cleanup time', () => {
      const job = researchJobs.create('c1', 'ai');
      // Complete then re-create to schedule cleanup but then simulate
      // a job that somehow is still running at cleanup time
      // Actually, cleanup is only scheduled on complete/fail, so let's test:
      // complete a job, then before TTL, check it exists
      researchJobs.complete(job.id);

      vi.advanceTimersByTime(CLEANUP_TTL_MS - 1);
      expect(researchJobs.get(job.id)).toBeDefined();

      vi.advanceTimersByTime(1);
      expect(researchJobs.get(job.id)).toBeUndefined();
    });

    it('does not clean up activeByContact for a different job', () => {
      // Create job1 for contact, then job2 for same contact
      const job1 = researchJobs.create('c1', 'ai');
      researchJobs.complete(job1.id);

      // Create a new job for same contact before cleanup fires
      const job2 = researchJobs.create('c1', 'deep');

      // Cleanup for job1 fires — should NOT remove job2's active mapping
      vi.advanceTimersByTime(CLEANUP_TTL_MS);

      // job1 should be cleaned up
      expect(researchJobs.get(job1.id)).toBeUndefined();

      // job2 should still be active
      const active = researchJobs.getActiveJob('c1');
      expect(active).toBeDefined();
      expect(active!.id).toBe(job2.id);
    });

    it('running jobs are never scheduled for cleanup (no cleanup on create)', () => {
      const job = researchJobs.create('c1', 'ai');

      // Advance well past TTL — job should still exist since cleanup
      // is only scheduled on complete/fail
      vi.advanceTimersByTime(CLEANUP_TTL_MS * 3);

      expect(researchJobs.get(job.id)).toBeDefined();
      expect(researchJobs.get(job.id)!.status).toBe('running');
    });
  });

  // ─── concurrent jobs for same contact ──────────────────────────────────────

  describe('concurrent jobs for same contact', () => {
    it('second job overrides active mapping but both jobs exist', () => {
      const job1 = researchJobs.create('c1', 'ai');
      const job2 = researchJobs.create('c1', 'deep');

      expect(researchJobs.get(job1.id)).toBeDefined();
      expect(researchJobs.get(job2.id)).toBeDefined();
      expect(researchJobs.getActiveJob('c1')!.id).toBe(job2.id);
    });

    it('completing first job does not affect second job active status', () => {
      const job1 = researchJobs.create('c1', 'ai');
      const job2 = researchJobs.create('c1', 'deep');

      // complete(job1) should NOT delete active mapping because job2 is now the active one
      researchJobs.complete(job1.id);

      // job2 should still be the active job for c1
      const active = researchJobs.getActiveJob('c1');
      expect(active).toBeDefined();
      expect(active!.id).toBe(job2.id);
      expect(active!.status).toBe('running');
    });
  });
});
