import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { CandidatesController } from './candidates.controller';
import { CandidatesService } from './candidates.service';

describe('CandidatesController', () => {
  let controller: CandidatesController;

  const mockCandidatesService = {
    uploadDocument: jest.fn(),
    listDocuments: jest.fn(),
    generateSummary: jest.fn(),
    listSummaries: jest.fn(),
    getSummary: jest.fn(),
  };

  const mockUser = { userId: 'user-1', workspaceId: 'workspace-1' };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CandidatesController],
      providers: [
        {
          provide: CandidatesService,
          useValue: mockCandidatesService,
        },
      ],
    }).compile();

    controller = module.get<CandidatesController>(CandidatesController);
  });

  describe('uploadDocument', () => {
    it('delegates to service and returns document', async () => {
      const dto = {
        documentType: 'resume',
        fileName: 'resume.pdf',
        storageKey: 's3://bucket/resume.pdf',
        rawText: 'Resume content',
      };
      const mockDocument = { id: 'doc-1', ...dto };
      mockCandidatesService.uploadDocument.mockResolvedValue(mockDocument);

      const result = await controller.uploadDocument(mockUser, 'candidate-1', dto);

      expect(mockCandidatesService.uploadDocument).toHaveBeenCalledWith(mockUser, 'candidate-1', dto);
      expect(result).toEqual(mockDocument);
    });

    it('throws NotFoundException when candidate not found', async () => {
      mockCandidatesService.uploadDocument.mockRejectedValue(new NotFoundException('Candidate not found'));

      await expect(
        controller.uploadDocument(mockUser, 'candidate-unknown', {
          documentType: 'resume',
          fileName: 'resume.pdf',
          storageKey: 's3://bucket/resume.pdf',
          rawText: 'Content',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listDocuments', () => {
    it('delegates to service and returns documents', async () => {
      const mockDocuments = [
        { id: 'doc-1', documentType: 'resume' },
        { id: 'doc-2', documentType: 'cover_letter' },
      ];
      mockCandidatesService.listDocuments.mockResolvedValue(mockDocuments);

      const result = await controller.listDocuments(mockUser, 'candidate-1');

      expect(mockCandidatesService.listDocuments).toHaveBeenCalledWith(mockUser, 'candidate-1');
      expect(result).toEqual(mockDocuments);
    });

    it('throws NotFoundException when candidate not found', async () => {
      mockCandidatesService.listDocuments.mockRejectedValue(new NotFoundException('Candidate not found'));

      await expect(
        controller.listDocuments(mockUser, 'candidate-unknown'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('generateSummary', () => {
    it('delegates to service and returns pending summary', async () => {
      const mockSummary = { id: 'summary-1', status: 'pending' };
      mockCandidatesService.generateSummary.mockResolvedValue(mockSummary);

      const result = await controller.generateSummary(mockUser, 'candidate-1');

      expect(mockCandidatesService.generateSummary).toHaveBeenCalledWith(mockUser, 'candidate-1');
      expect(result).toEqual(mockSummary);
    });

    it('throws NotFoundException when candidate not found', async () => {
      mockCandidatesService.generateSummary.mockRejectedValue(new NotFoundException('Candidate not found'));

      await expect(
        controller.generateSummary(mockUser, 'candidate-unknown'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listSummaries', () => {
    it('delegates to service and returns summaries', async () => {
      const mockSummaries = [
        { id: 'summary-1', status: 'completed' },
        { id: 'summary-2', status: 'pending' },
      ];
      mockCandidatesService.listSummaries.mockResolvedValue(mockSummaries);

      const result = await controller.listSummaries(mockUser, 'candidate-1');

      expect(mockCandidatesService.listSummaries).toHaveBeenCalledWith(mockUser, 'candidate-1');
      expect(result).toEqual(mockSummaries);
    });

    it('throws NotFoundException when candidate not found', async () => {
      mockCandidatesService.listSummaries.mockRejectedValue(new NotFoundException('Candidate not found'));

      await expect(
        controller.listSummaries(mockUser, 'candidate-unknown'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSummary', () => {
    it('delegates to service and returns summary', async () => {
      const mockSummary = { id: 'summary-1', status: 'completed', score: 85 };
      mockCandidatesService.getSummary.mockResolvedValue(mockSummary);

      const result = await controller.getSummary(mockUser, 'candidate-1', 'summary-1');

      expect(mockCandidatesService.getSummary).toHaveBeenCalledWith(mockUser, 'candidate-1', 'summary-1');
      expect(result).toEqual(mockSummary);
    });

    it('throws NotFoundException when summary not found', async () => {
      mockCandidatesService.getSummary.mockRejectedValue(new NotFoundException('Summary not found'));

      await expect(
        controller.getSummary(mockUser, 'candidate-1', 'summary-unknown'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
