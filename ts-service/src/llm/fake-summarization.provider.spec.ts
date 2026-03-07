import { FakeSummarizationProvider } from './fake-summarization.provider';

describe('FakeSummarizationProvider', () => {
  let provider: FakeSummarizationProvider;

  beforeEach(() => {
    provider = new FakeSummarizationProvider();
  });

  describe('generateCandidateSummary', () => {
    it('returns score 72 with documents and proper structure', async () => {
      const result = await provider.generateCandidateSummary({
        candidateId: 'candidate-1',
        documents: ['Resume content here'],
      });

      expect(result.score).toBe(72);
      expect(result.strengths).toContain('Communicates clearly');
      expect(result.strengths).toContain('Relevant project exposure');
      expect(result.concerns).toContain('Limited context provided');
      expect(result.summary).toContain('candidate-1');
      expect(result.summary).toContain('1 document(s)');
      expect(result.recommendedDecision).toBe('hold');
    });

    it('returns score 40 with no documents', async () => {
      const result = await provider.generateCandidateSummary({
        candidateId: 'candidate-2',
        documents: [],
      });

      expect(result.score).toBe(40);
      expect(result.summary).toContain('0 document(s)');
      expect(result.recommendedDecision).toBe('reject');
    });

    it('returns recommendation hold vs reject based on docs', async () => {
      const withDocs = await provider.generateCandidateSummary({
        candidateId: 'c-1',
        documents: ['Doc 1'],
      });
      const withoutDocs = await provider.generateCandidateSummary({
        candidateId: 'c-2',
        documents: [],
      });

      expect(withDocs.recommendedDecision).toBe('hold');
      expect(withoutDocs.recommendedDecision).toBe('reject');
    });

    it('changes concerns based on document count', async () => {
      const singleDoc = await provider.generateCandidateSummary({
        candidateId: 'c-1',
        documents: ['Doc 1'],
      });
      const multipleDocs = await provider.generateCandidateSummary({
        candidateId: 'c-2',
        documents: ['Doc 1', 'Doc 2'],
      });

      expect(singleDoc.concerns).toContain('Limited context provided');
      expect(multipleDocs.concerns).toContain('Needs deeper system design examples');
    });
  });
});
