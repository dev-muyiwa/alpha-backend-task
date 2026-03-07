import { randomUUID } from 'crypto';

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AuthUser } from '../auth/auth.types';
import { CandidateDocument } from '../entities/candidate-document.entity';
import { CandidateSummary } from '../entities/candidate-summary.entity';
import { SampleCandidate } from '../entities/sample-candidate.entity';
import { QueueService } from '../queue/queue.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { SummaryProcessorService } from './summary-processor.service';

@Injectable()
export class CandidatesService {
  constructor(
    @InjectRepository(SampleCandidate)
    private readonly candidateRepository: Repository<SampleCandidate>,
    @InjectRepository(CandidateDocument)
    private readonly documentRepository: Repository<CandidateDocument>,
    @InjectRepository(CandidateSummary)
    private readonly summaryRepository: Repository<CandidateSummary>,
    private readonly queueService: QueueService,
    private readonly summaryProcessor: SummaryProcessorService,
  ) {}

  async uploadDocument(
    user: AuthUser,
    candidateId: string,
    dto: UploadDocumentDto,
  ): Promise<CandidateDocument> {
    await this.ensureCandidateAccess(user, candidateId);

    const document = this.documentRepository.create({
      id: randomUUID(),
      candidateId,
      workspaceId: user.workspaceId,
      documentType: dto.documentType,
      fileName: dto.fileName.trim(),
      storageKey: dto.storageKey.trim(),
      rawText: dto.rawText,
    });

    return this.documentRepository.save(document);
  }

  async listDocuments(
    user: AuthUser,
    candidateId: string,
  ): Promise<CandidateDocument[]> {
    await this.ensureCandidateAccess(user, candidateId);

    return this.documentRepository.find({
      where: {
        candidateId,
        workspaceId: user.workspaceId,
      },
      order: { uploadedAt: 'DESC' },
    });
  }

  async generateSummary(
    user: AuthUser,
    candidateId: string,
  ): Promise<CandidateSummary> {
    await this.ensureCandidateAccess(user, candidateId);

    const summary = this.summaryRepository.create({
      id: randomUUID(),
      candidateId,
      workspaceId: user.workspaceId,
      status: 'pending',
    });
    await this.summaryRepository.save(summary);

    this.queueService.enqueue('generate-candidate-summary', {
      summaryId: summary.id,
      candidateId,
      workspaceId: user.workspaceId,
    });

    void this.summaryProcessor.process(summary.id);

    return summary;
  }

  async listSummaries(
    user: AuthUser,
    candidateId: string,
  ): Promise<CandidateSummary[]> {
    await this.ensureCandidateAccess(user, candidateId);

    return this.summaryRepository.find({
      where: {
        candidateId,
        workspaceId: user.workspaceId,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async getSummary(
    user: AuthUser,
    candidateId: string,
    summaryId: string,
  ): Promise<CandidateSummary> {
    await this.ensureCandidateAccess(user, candidateId);

    const summary = await this.summaryRepository.findOne({
      where: {
        id: summaryId,
        candidateId,
        workspaceId: user.workspaceId,
      },
    });

    if (!summary) {
      throw new NotFoundException('Summary not found');
    }

    return summary;
  }

  private async ensureCandidateAccess(
    user: AuthUser,
    candidateId: string,
  ): Promise<SampleCandidate> {
    const candidate = await this.candidateRepository.findOne({
      where: {
        id: candidateId,
        workspaceId: user.workspaceId,
      },
    });

    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }

    return candidate;
  }
}
