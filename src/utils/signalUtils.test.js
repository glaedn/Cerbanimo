import { describe, test, expect } from 'vitest';
import { calculateSignalScore, categorizeSignal } from './signalUtils';

describe('signalUtils', () => {
  describe('calculateSignalScore', () => {
    test('calculates base urgency score', () => {
      const event = { urgency: 5, type: 'normal' };
      expect(calculateSignalScore(event)).toBe(20);
    });

    test('boosts score for crisis events', () => {
      const event = { urgency: 5, type: 'crisis.detected' };
      expect(calculateSignalScore(event)).toBe(50);
    });

    test('boosts score for blocked status', () => {
      const event = { urgency: 5, type: 'task', status: 'blocked' };
      expect(calculateSignalScore(event)).toBe(40);
    });

    test('applies proximity bonus', () => {
      const event = { urgency: 0, region: 'San Francisco' };
      const context = { userRegion: 'San Francisco' };
      expect(calculateSignalScore(event, context)).toBe(20);
    });

    test('applies mission relevance bonus', () => {
      const event = { urgency: 0, projectId: 'proj-123' };
      const context = { activeMissions: ['proj-123'] };
      expect(calculateSignalScore(event, context)).toBe(20);
    });

    test('caps score at 100', () => {
      const event = { urgency: 20, type: 'crisis.detected', status: 'blocked' };
      expect(calculateSignalScore(event)).toBe(100);
    });
  });

  describe('categorizeSignal', () => {
    test('categorizes high scores as critical', () => {
      expect(categorizeSignal(85)).toBe('critical');
    });

    test('categorizes medium scores as active', () => {
      expect(categorizeSignal(60)).toBe('active');
    });

    test('categorizes low scores as ambient', () => {
      expect(categorizeSignal(30)).toBe('ambient');
    });
  });
});
