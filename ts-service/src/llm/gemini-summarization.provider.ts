import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  CandidateSummaryInput,
  CandidateSummaryResult,
  RecommendedDecision,
  SummarizationProvider,
} from './summarization-provider.interface';

const PROMPT_VERSION = 'v1.0';

const SYSTEM_PROMPT = `You are an expert recruiter assistant. Analyze the provided candidate documents and generate a structured assessment.

Your response must be valid JSON with the following structure:
{
  "score": <number between 0-100>,
  "strengths": [<array of string strengths>],
  "concerns": [<array of string concerns>],
  "summary": "<brief summary of the candidate>",
  "recommendedDecision": "<one of: advance, hold, reject>"
}

Guidelines:
- Score should reflect overall candidate quality (0-100)
- List 2-5 key strengths based on the documents
- List 1-3 concerns or areas for improvement
- Summary should be 2-3 sentences
- recommendedDecision should be:
  - "advance" for strong candidates (score >= 70)
  - "hold" for candidates needing more evaluation (score 50-69)
  - "reject" for candidates not meeting requirements (score < 50)`;

@Injectable()
export class GeminiSummarizationProvider implements SummarizationProvider {
  private readonly genAI: GoogleGenerativeAI | null = null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey?.trim()) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  async generateCandidateSummary(
    input: CandidateSummaryInput,
  ): Promise<CandidateSummaryResult> {
    if (!this.genAI) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    const prompt = this.buildPrompt(input);
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return this.parseAndValidate(text);
  }

  getProviderName(): string {
    return 'gemini';
  }

  getPromptVersion(): string {
    return PROMPT_VERSION;
  }

  private buildPrompt(input: CandidateSummaryInput): string {
    const documentsText = input.documents
      .map((doc, index) => `--- Document ${index + 1} ---\n${doc}`)
      .join('\n\n');

    return `${SYSTEM_PROMPT}

Candidate ID: ${input.candidateId}

Documents:
${documentsText}

Provide your assessment as JSON:`;
  }

  private parseAndValidate(text: string): CandidateSummaryResult {
    const parsed = JSON.parse(text);

    const score = Number(parsed.score);
    if (isNaN(score) || score < 0 || score > 100) {
      throw new Error('Invalid score value');
    }

    if (!Array.isArray(parsed.strengths) || parsed.strengths.length === 0) {
      throw new Error('Invalid strengths array');
    }

    if (!Array.isArray(parsed.concerns)) {
      throw new Error('Invalid concerns array');
    }

    if (typeof parsed.summary !== 'string' || !parsed.summary.trim()) {
      throw new Error('Invalid summary');
    }

    const validDecisions: RecommendedDecision[] = ['advance', 'hold', 'reject'];
    if (!validDecisions.includes(parsed.recommendedDecision)) {
      throw new Error('Invalid recommendedDecision');
    }

    return {
      score,
      strengths: parsed.strengths as string[],
      concerns: parsed.concerns as string[],
      summary: parsed.summary as string,
      recommendedDecision: parsed.recommendedDecision as RecommendedDecision,
    };
  }
}
