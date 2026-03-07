import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { CandidateDocument } from '../entities/candidate-document.entity';
import { CandidateSummary } from '../entities/candidate-summary.entity';
import { FakeSummarizationProvider } from '../llm/fake-summarization.provider';
import { SUMMARIZATION_PROVIDER } from '../llm/summarization-provider.interface';
import { SummaryProcessorService } from './summary-processor.service';

describe('SummaryProcessorService', () => {
  let service: SummaryProcessorService;

  const summaryRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const documentRepository = {
    find: jest.fn(),
  };

  const fakeSummarizationProvider = new FakeSummarizationProvider();

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SummaryProcessorService,
        {
          provide: getRepositoryToken(CandidateSummary),
          useValue: summaryRepository,
        },
        {
          provide: getRepositoryToken(CandidateDocument),
          useValue: documentRepository,
        },
        {
          provide: SUMMARIZATION_PROVIDER,
          useValue: fakeSummarizationProvider,
        },
      ],
    }).compile();

    service = module.get<SummaryProcessorService>(SummaryProcessorService);
  });

  describe('process', () => {
    it('successfully processes summary with documents', async () => {
      const mockSummary = {
        id: 'summary-1',
        candidateId: 'candidate-1',
        workspaceId: 'workspace-1',
        status: 'pending' as const,
      };

      summaryRepository.findOne.mockResolvedValue(mockSummary);
      documentRepository.find.mockResolvedValue([
        { id: 'doc-1', rawText: 'Resume content here' },
        { id: 'doc-2', rawText: 'Cover letter content' },
      ]);
      summaryRepository.save.mockImplementation(async (value: unknown) => value);

      await service.process('summary-1');

      expect(summaryRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          score: expect.any(Number),
          strengths: expect.any(Array),
          concerns: expect.any(Array),
          summary: expect.any(String),
          recommendedDecision: expect.any(String),
          provider: 'fake',
          promptVersion: 'v1.0',
        }),
      );
    });

    it('sets status to failed on error', async () => {
      const mockSummary = {
        id: 'summary-1',
        candidateId: 'candidate-1',
        workspaceId: 'workspace-1',
        status: 'pending' as const,
      };

      summaryRepository.findOne.mockResolvedValue(mockSummary);
      documentRepository.find.mockRejectedValue(new Error('Database error'));
      summaryRepository.save.mockImplementation(async (value: unknown) => value);

      await service.process('summary-1');

      expect(summaryRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          errorMessage: 'Database error',
        }),
      );
    });

    it('does nothing if summary not found', async () => {
      summaryRepository.findOne.mockResolvedValue(null);

      await service.process('nonexistent-summary');

      expect(documentRepository.find).not.toHaveBeenCalled();
      expect(summaryRepository.save).not.toHaveBeenCalled();
    });

    it('processes summary with no documents', async () => {
      const mockSummary = {
        id: 'summary-1',
        candidateId: 'candidate-1',
        workspaceId: 'workspace-1',
        status: 'pending' as const,
      };

      summaryRepository.findOne.mockResolvedValue(mockSummary);
      documentRepository.find.mockResolvedValue([]);
      summaryRepository.save.mockImplementation(async (value: unknown) => value);

      await service.process('summary-1');

      expect(summaryRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          score: 40,
          recommendedDecision: 'reject',
        }),
      );
    });
  });
});
