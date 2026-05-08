import { describe, it, expect, vi, beforeEach } from 'vitest';
import AIGatewayService from './AIGatewayService.js';

vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(function() {
      this.getGenerativeModel = vi.fn().mockImplementation(() => ({
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () => JSON.stringify({
              recommendationType: 'test_rec',
              targetId: 1,
              targetType: 'need',
              reasoning: { summary: 'test reasoning', evidence: [] },
              confidence: 0.9
            })
          }
        })
      }));
    })
  };
});

describe('AIGatewayService', () => {
  it('should synthesize a recommendation', async () => {
    const rec = await AIGatewayService.synthesizeRecommendation('NeedAgent', { id: 1 });
    expect(rec.recommendationType).toBe('test_rec');
    expect(rec.confidence).toBe(0.9);
  });
});
