import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CandidateDocument } from '../entities/candidate-document.entity';
import { CandidateSummary } from '../entities/candidate-summary.entity';
import { GeminiSummarizationProvider } from '../llm/gemini-summarization.provider';
import {
  SUMMARIZATION_PROVIDER,
  SummarizationProvider,
} from '../llm/summarization-provider.interface';

@Injectable()
export class SummaryProcessorService {
  constructor(
    @InjectRepository(CandidateSummary)
    private readonly summaryRepository: Repository<CandidateSummary>,
    @InjectRepository(CandidateDocument)
    private readonly documentRepository: Repository<CandidateDocument>,
    @Inject(SUMMARIZATION_PROVIDER)
    private readonly summarizationProvider: SummarizationProvider,
  ) {}

  async process(summaryId: string): Promise<void> {
    const summary = await this.summaryRepository.findOne({
      where: { id: summaryId },
    });

    if (!summary) {
      return;
    }

    try {
      const documents = await this.documentRepository.find({
        where: {
          candidateId: summary.candidateId,
          workspaceId: summary.workspaceId,
        },
      });

      const documentTexts = documents.map((doc) => doc.rawText);

      const result = await this.summarizationProvider.generateCandidateSummary({
        candidateId: summary.candidateId,
        documents: documentTexts,
      });

      summary.score = result.score;
      summary.strengths = result.strengths;
      summary.concerns = result.concerns;
      summary.summary = result.summary;
      summary.recommendedDecision = result.recommendedDecision;
      summary.status = 'completed';

      if (this.isGeminiProvider()) {
        const gemini = this.summarizationProvider as GeminiSummarizationProvider;
        summary.provider = gemini.getProviderName();
        summary.promptVersion = gemini.getPromptVersion();
      } else {
        summary.provider = 'fake';
        summary.promptVersion = 'v1.0';
      }

      await this.summaryRepository.save(summary);
    } catch (error) {
      summary.status = 'failed';
      summary.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.summaryRepository.save(summary);
    }
  }

  private isGeminiProvider(): boolean {
    return 'getProviderName' in this.summarizationProvider;
  }
}
