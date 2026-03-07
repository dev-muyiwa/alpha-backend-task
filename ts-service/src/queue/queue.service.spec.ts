import { QueueService } from './queue.service';

describe('QueueService', () => {
  let service: QueueService;

  beforeEach(() => {
    service = new QueueService();
  });

  describe('enqueue', () => {
    it('creates job with UUID, name, payload, and timestamp', () => {
      const payload = { candidateId: 'c-1', summaryId: 's-1' };

      const job = service.enqueue('generate-summary', payload);

      expect(job.id).toBeDefined();
      expect(job.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(job.name).toBe('generate-summary');
      expect(job.payload).toEqual(payload);
      expect(job.enqueuedAt).toBeDefined();
      expect(new Date(job.enqueuedAt).getTime()).not.toBeNaN();
    });

    it('persists multiple jobs', () => {
      service.enqueue('job-1', { data: 1 });
      service.enqueue('job-2', { data: 2 });
      service.enqueue('job-3', { data: 3 });

      const jobs = service.getQueuedJobs();

      expect(jobs).toHaveLength(3);
      expect(jobs[0].name).toBe('job-1');
      expect(jobs[1].name).toBe('job-2');
      expect(jobs[2].name).toBe('job-3');
    });
  });

  describe('getQueuedJobs', () => {
    it('returns all jobs in order', () => {
      const job1 = service.enqueue('first', { order: 1 });
      const job2 = service.enqueue('second', { order: 2 });

      const jobs = service.getQueuedJobs();

      expect(jobs).toHaveLength(2);
      expect(jobs[0].id).toBe(job1.id);
      expect(jobs[1].id).toBe(job2.id);
    });

    it('returns empty array when no jobs', () => {
      const jobs = service.getQueuedJobs();

      expect(jobs).toEqual([]);
    });
  });
});
