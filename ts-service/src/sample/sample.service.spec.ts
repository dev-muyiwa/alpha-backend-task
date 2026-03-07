import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { SampleCandidate } from '../entities/sample-candidate.entity';
import { SampleWorkspace } from '../entities/sample-workspace.entity';
import { SampleService } from './sample.service';

describe('SampleService', () => {
  let service: SampleService;

  const workspaceRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const candidateRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SampleService,
        {
          provide: getRepositoryToken(SampleWorkspace),
          useValue: workspaceRepository,
        },
        {
          provide: getRepositoryToken(SampleCandidate),
          useValue: candidateRepository,
        },
      ],
    }).compile();

    service = module.get<SampleService>(SampleService);
  });

  describe('createCandidate', () => {
    it('creates candidate within current workspace', async () => {
      workspaceRepository.findOne.mockResolvedValue({ id: 'workspace-1' });
      candidateRepository.create.mockImplementation((value: unknown) => value);
      candidateRepository.save.mockImplementation(async (value: unknown) => value);

      const result = await service.createCandidate(
        { userId: 'user-1', workspaceId: 'workspace-1' },
        { fullName: 'Ada Lovelace', email: 'ada@example.com' },
      );

      expect(workspaceRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'workspace-1' },
      });
      expect(candidateRepository.create).toHaveBeenCalled();
      expect(result.fullName).toBe('Ada Lovelace');
      expect(result.workspaceId).toBe('workspace-1');
    });

    it('creates workspace if it does not exist', async () => {
      workspaceRepository.findOne.mockResolvedValue(null);
      workspaceRepository.create.mockImplementation((value: unknown) => value);
      workspaceRepository.save.mockImplementation(async (value: unknown) => value);
      candidateRepository.create.mockImplementation((value: unknown) => value);
      candidateRepository.save.mockImplementation(async (value: unknown) => value);

      const result = await service.createCandidate(
        { userId: 'user-1', workspaceId: 'workspace-new' },
        { fullName: 'Grace Hopper', email: 'grace@example.com' },
      );

      expect(workspaceRepository.create).toHaveBeenCalledWith({
        id: 'workspace-new',
        name: 'Workspace workspace-new',
      });
      expect(workspaceRepository.save).toHaveBeenCalled();
      expect(result.workspaceId).toBe('workspace-new');
    });

    it('handles whitespace trimming in fullName and email', async () => {
      workspaceRepository.findOne.mockResolvedValue({ id: 'workspace-1' });
      candidateRepository.create.mockImplementation((value: unknown) => value);
      candidateRepository.save.mockImplementation(async (value: unknown) => value);

      const result = await service.createCandidate(
        { userId: 'user-1', workspaceId: 'workspace-1' },
        { fullName: '  Alan Turing  ', email: '  alan@example.com  ' },
      );

      expect(result.fullName).toBe('Alan Turing');
      expect(result.email).toBe('alan@example.com');
    });

    it('handles null email gracefully', async () => {
      workspaceRepository.findOne.mockResolvedValue({ id: 'workspace-1' });
      candidateRepository.create.mockImplementation((value: unknown) => value);
      candidateRepository.save.mockImplementation(async (value: unknown) => value);

      const result = await service.createCandidate(
        { userId: 'user-1', workspaceId: 'workspace-1' },
        { fullName: 'Margaret Hamilton' },
      );

      expect(result.fullName).toBe('Margaret Hamilton');
      expect(result.email).toBeNull();
    });
  });

  describe('listCandidates', () => {
    it('returns candidates for workspace ordered by createdAt DESC', async () => {
      const mockCandidates = [
        { id: 'c-2', fullName: 'Second', workspaceId: 'workspace-1', createdAt: new Date('2024-01-02') },
        { id: 'c-1', fullName: 'First', workspaceId: 'workspace-1', createdAt: new Date('2024-01-01') },
      ];
      candidateRepository.find.mockResolvedValue(mockCandidates);

      const result = await service.listCandidates({ userId: 'user-1', workspaceId: 'workspace-1' });

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('c-2');
      expect(candidateRepository.find).toHaveBeenCalledWith({
        where: { workspaceId: 'workspace-1' },
        order: { createdAt: 'DESC' },
      });
    });

    it('returns empty array when no candidates', async () => {
      candidateRepository.find.mockResolvedValue([]);

      const result = await service.listCandidates({ userId: 'user-1', workspaceId: 'workspace-1' });

      expect(result).toEqual([]);
    });
  });
});
