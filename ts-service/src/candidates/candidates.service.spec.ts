import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { CandidateDocument } from '../entities/candidate-document.entity';
import { CandidateSummary } from '../entities/candidate-summary.entity';
import { SampleCandidate } from '../entities/sample-candidate.entity';
import { QueueService } from '../queue/queue.service';
import { CandidatesService } from './candidates.service';
import { SummaryProcessorService } from './summary-processor.service';

describe('CandidatesService', () => {
  let service: CandidatesService;

  const candidateRepository = {
    findOne: jest.fn(),
  };

  const documentRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  const summaryRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const queueService = {
    enqueue: jest.fn(),
  };

  const summaryProcessor = {
    process: jest.fn(),
  };

  const mockUser = { userId: 'user-1', workspaceId: 'workspace-1' };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidatesService,
        {
          provide: getRepositoryToken(SampleCandidate),
          useValue: candidateRepository,
        },
        {
          provide: getRepositoryToken(CandidateDocument),
          useValue: documentRepository,
        },
        {
          provide: getRepositoryToken(CandidateSummary),
          useValue: summaryRepository,
        },
        {
          provide: QueueService,
          useValue: queueService,
        },
        {
          provide: SummaryProcessorService,
          useValue: summaryProcessor,
        },
      ],
    }).compile();

    service = module.get<CandidatesService>(CandidatesService);
  });

  describe('uploadDocument', () => {
    it('uploads document for candidate in workspace', async () => {
      candidateRepository.findOne.mockResolvedValue({
        id: 'candidate-1',
        workspaceId: 'workspace-1',
      });
      documentRepository.create.mockImplementation((value: unknown) => value);
      documentRepository.save.mockImplementation(async (value: unknown) => value);

      const result = await service.uploadDocument(mockUser, 'candidate-1', {
        documentType: 'resume',
        fileName: 'resume.pdf',
        storageKey: 's3://bucket/resume.pdf',
        rawText: 'This is the resume content.',
      });

      expect(candidateRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'candidate-1', workspaceId: 'workspace-1' },
      });
      expect(documentRepository.create).toHaveBeenCalled();
      expect(result.documentType).toBe('resume');
      expect(result.rawText).toBe('This is the resume content.');
    });

    it('throws NotFoundException for candidate in different workspace', async () => {
      candidateRepository.findOne.mockResolvedValue(null);

      await expect(
        service.uploadDocument(mockUser, 'candidate-other', {
          documentType: 'resume',
          fileName: 'resume.pdf',
          storageKey: 's3://bucket/resume.pdf',
          rawText: 'Content',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('generateSummary', () => {
    it('creates pending summary and triggers processing', async () => {
      candidateRepository.findOne.mockResolvedValue({
        id: 'candidate-1',
        workspaceId: 'workspace-1',
      });
      summaryRepository.create.mockImplementation((value: Record<string, unknown>) => ({
        ...value,
        id: 'summary-1',
      }));
      summaryRepository.save.mockImplementation(async (value: unknown) => value);

      const result = await service.generateSummary(mockUser, 'candidate-1');

      expect(result.status).toBe('pending');
      expect(queueService.enqueue).toHaveBeenCalledWith(
        'generate-candidate-summary',
        expect.objectContaining({
          summaryId: 'summary-1',
          candidateId: 'candidate-1',
        }),
      );
      expect(summaryProcessor.process).toHaveBeenCalledWith('summary-1');
    });

    it('throws NotFoundException for candidate not in workspace', async () => {
      candidateRepository.findOne.mockResolvedValue(null);

      await expect(
        service.generateSummary(mockUser, 'candidate-other'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSummary', () => {
    it('returns summary for candidate in workspace', async () => {
      candidateRepository.findOne.mockResolvedValue({
        id: 'candidate-1',
        workspaceId: 'workspace-1',
      });
      summaryRepository.findOne.mockResolvedValue({
        id: 'summary-1',
        candidateId: 'candidate-1',
        workspaceId: 'workspace-1',
        status: 'completed',
      });

      const result = await service.getSummary(mockUser, 'candidate-1', 'summary-1');

      expect(result.id).toBe('summary-1');
      expect(result.status).toBe('completed');
    });

    it('throws NotFoundException for summary not found', async () => {
      candidateRepository.findOne.mockResolvedValue({
        id: 'candidate-1',
        workspaceId: 'workspace-1',
      });
      summaryRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getSummary(mockUser, 'candidate-1', 'summary-nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listDocuments', () => {
    it('lists documents for candidate in workspace', async () => {
      candidateRepository.findOne.mockResolvedValue({
        id: 'candidate-1',
        workspaceId: 'workspace-1',
      });
      documentRepository.find.mockResolvedValue([
        { id: 'doc-1', documentType: 'resume' },
        { id: 'doc-2', documentType: 'cover_letter' },
      ]);

      const result = await service.listDocuments(mockUser, 'candidate-1');

      expect(result).toHaveLength(2);
      expect(documentRepository.find).toHaveBeenCalledWith({
        where: { candidateId: 'candidate-1', workspaceId: 'workspace-1' },
        order: { uploadedAt: 'DESC' },
      });
    });
  });
});
