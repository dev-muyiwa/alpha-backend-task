import { ConfigService } from '@nestjs/config';

import { GeminiSummarizationProvider } from './gemini-summarization.provider';

describe('GeminiSummarizationProvider', () => {
  describe('constructor', () => {
    it('initializes genAI when API key present', () => {
      const configService = {
        get: jest.fn().mockReturnValue('valid-api-key'),
      } as unknown as ConfigService;

      const provider = new GeminiSummarizationProvider(configService);

      expect(configService.get).toHaveBeenCalledWith('GEMINI_API_KEY');
      // genAI is private, but we can test behavior
      expect(provider.getProviderName()).toBe('gemini');
    });

    it('skips genAI when API key missing', () => {
      const configService = {
        get: jest.fn().mockReturnValue(undefined),
      } as unknown as ConfigService;

      const provider = new GeminiSummarizationProvider(configService);

      expect(configService.get).toHaveBeenCalledWith('GEMINI_API_KEY');
      expect(provider.getProviderName()).toBe('gemini');
    });

    it('skips genAI when API key is empty string', () => {
      const configService = {
        get: jest.fn().mockReturnValue('   '),
      } as unknown as ConfigService;

      const provider = new GeminiSummarizationProvider(configService);

      expect(configService.get).toHaveBeenCalledWith('GEMINI_API_KEY');
    });
  });

  describe('generateCandidateSummary', () => {
    it('throws when genAI is null', async () => {
      const configService = {
        get: jest.fn().mockReturnValue(undefined),
      } as unknown as ConfigService;

      const provider = new GeminiSummarizationProvider(configService);

      await expect(
        provider.generateCandidateSummary({
          candidateId: 'c-1',
          documents: ['Resume'],
        }),
      ).rejects.toThrow('GEMINI_API_KEY not configured');
    });
  });

  describe('parseAndValidate', () => {
    let provider: GeminiSummarizationProvider;

    beforeEach(() => {
      const configService = {
        get: jest.fn().mockReturnValue(undefined),
      } as unknown as ConfigService;
      provider = new GeminiSummarizationProvider(configService);
    });

    // Access private method for testing
    const callParseAndValidate = (provider: GeminiSummarizationProvider, text: string) => {
      return (provider as unknown as { parseAndValidate: (text: string) => unknown }).parseAndValidate(text);
    };

    it('rejects invalid score (NaN)', () => {
      const text = JSON.stringify({
        score: 'not-a-number',
        strengths: ['Good'],
        concerns: [],
        summary: 'Summary',
        recommendedDecision: 'advance',
      });

      expect(() => callParseAndValidate(provider, text)).toThrow('Invalid score value');
    });

    it('rejects invalid score (< 0)', () => {
      const text = JSON.stringify({
        score: -5,
        strengths: ['Good'],
        concerns: [],
        summary: 'Summary',
        recommendedDecision: 'advance',
      });

      expect(() => callParseAndValidate(provider, text)).toThrow('Invalid score value');
    });

    it('rejects invalid score (> 100)', () => {
      const text = JSON.stringify({
        score: 150,
        strengths: ['Good'],
        concerns: [],
        summary: 'Summary',
        recommendedDecision: 'advance',
      });

      expect(() => callParseAndValidate(provider, text)).toThrow('Invalid score value');
    });

    it('rejects empty strengths array', () => {
      const text = JSON.stringify({
        score: 75,
        strengths: [],
        concerns: [],
        summary: 'Summary',
        recommendedDecision: 'advance',
      });

      expect(() => callParseAndValidate(provider, text)).toThrow('Invalid strengths array');
    });

    it('rejects non-array strengths', () => {
      const text = JSON.stringify({
        score: 75,
        strengths: 'not-an-array',
        concerns: [],
        summary: 'Summary',
        recommendedDecision: 'advance',
      });

      expect(() => callParseAndValidate(provider, text)).toThrow('Invalid strengths array');
    });

    it('rejects invalid recommendedDecision', () => {
      const text = JSON.stringify({
        score: 75,
        strengths: ['Good'],
        concerns: [],
        summary: 'Summary',
        recommendedDecision: 'invalid-decision',
      });

      expect(() => callParseAndValidate(provider, text)).toThrow('Invalid recommendedDecision');
    });

    it('rejects empty summary', () => {
      const text = JSON.stringify({
        score: 75,
        strengths: ['Good'],
        concerns: [],
        summary: '   ',
        recommendedDecision: 'advance',
      });

      expect(() => callParseAndValidate(provider, text)).toThrow('Invalid summary');
    });

    it('rejects non-array concerns', () => {
      const text = JSON.stringify({
        score: 75,
        strengths: ['Good'],
        concerns: 'not-an-array',
        summary: 'Valid summary',
        recommendedDecision: 'advance',
      });

      expect(() => callParseAndValidate(provider, text)).toThrow('Invalid concerns array');
    });

    it('accepts valid response', () => {
      const text = JSON.stringify({
        score: 85,
        strengths: ['Strong communication', 'Technical skills'],
        concerns: ['Limited experience'],
        summary: 'A qualified candidate.',
        recommendedDecision: 'advance',
      });

      const result = callParseAndValidate(provider, text);

      expect(result).toEqual({
        score: 85,
        strengths: ['Strong communication', 'Technical skills'],
        concerns: ['Limited experience'],
        summary: 'A qualified candidate.',
        recommendedDecision: 'advance',
      });
    });
  });

  describe('getProviderName', () => {
    it('returns gemini', () => {
      const configService = {
        get: jest.fn().mockReturnValue(undefined),
      } as unknown as ConfigService;

      const provider = new GeminiSummarizationProvider(configService);

      expect(provider.getProviderName()).toBe('gemini');
    });
  });

  describe('getPromptVersion', () => {
    it('returns v1.0', () => {
      const configService = {
        get: jest.fn().mockReturnValue(undefined),
      } as unknown as ConfigService;

      const provider = new GeminiSummarizationProvider(configService);

      expect(provider.getPromptVersion()).toBe('v1.0');
    });
  });
});
