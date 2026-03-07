import { Test, TestingModule } from '@nestjs/testing';

import { SampleController } from './sample.controller';
import { SampleService } from './sample.service';

describe('SampleController', () => {
  let controller: SampleController;

  const mockSampleService = {
    createCandidate: jest.fn(),
    listCandidates: jest.fn(),
  };

  const mockUser = { userId: 'user-1', workspaceId: 'workspace-1' };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SampleController],
      providers: [
        {
          provide: SampleService,
          useValue: mockSampleService,
        },
      ],
    }).compile();

    controller = module.get<SampleController>(SampleController);
  });

  describe('createCandidate', () => {
    it('delegates to service and returns created candidate', async () => {
      const dto = { fullName: 'John Doe', email: 'john@example.com' };
      const mockCandidate = {
        id: 'candidate-1',
        workspaceId: 'workspace-1',
        fullName: 'John Doe',
        email: 'john@example.com',
      };
      mockSampleService.createCandidate.mockResolvedValue(mockCandidate);

      const result = await controller.createCandidate(mockUser, dto);

      expect(mockSampleService.createCandidate).toHaveBeenCalledWith(mockUser, dto);
      expect(result).toEqual(mockCandidate);
    });

    it('handles candidate creation without email', async () => {
      const dto = { fullName: 'Jane Doe' };
      const mockCandidate = {
        id: 'candidate-2',
        workspaceId: 'workspace-1',
        fullName: 'Jane Doe',
        email: null,
      };
      mockSampleService.createCandidate.mockResolvedValue(mockCandidate);

      const result = await controller.createCandidate(mockUser, dto);

      expect(mockSampleService.createCandidate).toHaveBeenCalledWith(mockUser, dto);
      expect(result).toEqual(mockCandidate);
    });
  });

  describe('listCandidates', () => {
    it('delegates to service and returns candidates', async () => {
      const mockCandidates = [
        { id: 'candidate-1', fullName: 'John Doe' },
        { id: 'candidate-2', fullName: 'Jane Doe' },
      ];
      mockSampleService.listCandidates.mockResolvedValue(mockCandidates);

      const result = await controller.listCandidates(mockUser);

      expect(mockSampleService.listCandidates).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockCandidates);
    });

    it('returns empty array when no candidates', async () => {
      mockSampleService.listCandidates.mockResolvedValue([]);

      const result = await controller.listCandidates(mockUser);

      expect(result).toEqual([]);
    });
  });
});
