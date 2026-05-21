import { describe, it, expect } from 'vitest';
import MarketplaceEngine from './MarketplaceEngine.js';

describe('MarketplaceEngine', () => {
  const mockEntries = [
    { id: 1, name: 'Medical Help', category: 'medical', urgency: 'high', created_at: new Date() },
    { id: 2, name: 'Old Tools', category: 'tools', urgency: 'low', created_at: new Date() }
  ];

  it('should calculate correct base scores', () => {
    const score1 = MarketplaceEngine.calculateBaseScore(mockEntries[0]);
    const score2 = MarketplaceEngine.calculateBaseScore(mockEntries[1]);

    expect(score1).toBeGreaterThan(score2);
  });

  it('should boost essential items in crisis mode', () => {
    const crisis = { enabled: true };
    const score1 = MarketplaceEngine.calculateBaseScore(mockEntries[0]);
    const score2 = MarketplaceEngine.calculateBaseScore(mockEntries[1]);

    const crisisScore1 = MarketplaceEngine.applyCrisisScoring(mockEntries[0], score1, crisis);
    const crisisScore2 = MarketplaceEngine.applyCrisisScoring(mockEntries[1], score2, crisis);

    // In crisis mode, medical should have a much higher score boost
    expect(crisisScore1).toBeGreaterThan(crisisScore2 + 500);
  });
});
