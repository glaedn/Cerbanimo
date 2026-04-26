import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validatePendingInterests } from './interestValidationService.js';
import pool from '../db.js';

// Mock the pool and Gemini AI
vi.mock('../db.js', () => ({
  default: {
    query: vi.fn(),
  },
}));

vi.mock('@google/generative-ai', () => {
  const generateContent = vi.fn().mockResolvedValue({
    response: {
      text: () => JSON.stringify([{ id: 1, classification: 'active', reason: 'Valid hobby' }]),
    },
  });
  const getGenerativeModel = vi.fn().mockReturnValue({ generateContent });

  // Use a proper class mock for the constructor
  class MockGoogleGenerativeAI {
    constructor() {
      this.getGenerativeModel = getGenerativeModel;
    }
  }

  return {
    GoogleGenerativeAI: MockGoogleGenerativeAI,
  };
});

describe('interestValidationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should validate pending interests in batches and update their status', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, name: 'Knitting' }],
    });

    await validatePendingInterests();

    expect(pool.query).toHaveBeenCalledWith(
      "SELECT id, name FROM interests WHERE status = 'pending'"
    );
    expect(pool.query).toHaveBeenCalledWith(
      "UPDATE interests SET status = $1, updated_at = NOW() WHERE id = $2",
      ['active', 1]
    );
  });

  it('should handle multiple interests in a batch', async () => {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI();
    const model = genAI.getGenerativeModel();
    model.generateContent.mockResolvedValueOnce({
      response: {
        text: () => JSON.stringify([
          { id: 1, classification: 'active', reason: 'Valid hobby' },
          { id: 2, classification: 'blacklisted', reason: 'Junk data' }
        ]),
      },
    });

    pool.query.mockResolvedValueOnce({
      rows: [
        { id: 1, name: 'Knitting' },
        { id: 2, name: 'asdfgh' }
      ],
    });

    await validatePendingInterests();

    expect(pool.query).toHaveBeenCalledWith(
      "UPDATE interests SET status = $1, updated_at = NOW() WHERE id = $2",
      ['active', 1]
    );
    expect(pool.query).toHaveBeenCalledWith(
      "UPDATE interests SET status = $1, updated_at = NOW() WHERE id = $2",
      ['blacklisted', 2]
    );
  });

  it('should wait 30 seconds between batches', async () => {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI();
    const model = genAI.getGenerativeModel();

    // Mock 2 batches
    model.generateContent
      .mockResolvedValueOnce({
        response: {
          text: () => JSON.stringify([{ id: 1, classification: 'active', reason: 'Ok' }]),
        },
      })
      .mockResolvedValueOnce({
        response: {
          text: () => JSON.stringify([{ id: 21, classification: 'active', reason: 'Ok' }]),
        },
      });

    // Create 21 interests to trigger 2 batches (BATCH_SIZE = 20)
    const interests = [];
    for (let i = 1; i <= 21; i++) {
      interests.push({ id: i, name: `Interest ${i}` });
    }

    pool.query.mockResolvedValueOnce({
      rows: interests,
    });

    const validationPromise = validatePendingInterests();

    // Fast-forward time to bypass the 30s wait
    await vi.runAllTimersAsync();
    await validationPromise;

    expect(model.generateContent).toHaveBeenCalledTimes(2);
    // Verify first batch update
    expect(pool.query).toHaveBeenCalledWith(
      "UPDATE interests SET status = $1, updated_at = NOW() WHERE id = $2",
      ['active', 1]
    );
    // Verify second batch update
    expect(pool.query).toHaveBeenCalledWith(
      "UPDATE interests SET status = $1, updated_at = NOW() WHERE id = $2",
      ['active', 21]
    );
  });
});
