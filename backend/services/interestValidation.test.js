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
      text: () => JSON.stringify({ classification: 'active', reason: 'Valid hobby' }),
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
  });

  it('should validate pending interests and update their status', async () => {
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

  it('should blacklist invalid interests', async () => {
    // Re-mock to return blacklisted
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI();
    const model = genAI.getGenerativeModel();
    model.generateContent.mockResolvedValueOnce({
      response: {
        text: () => JSON.stringify({ classification: 'blacklisted', reason: 'Junk data' }),
      },
    });

    pool.query.mockResolvedValueOnce({
      rows: [{ id: 2, name: 'asdfgh' }],
    });

    await validatePendingInterests();

    expect(pool.query).toHaveBeenCalledWith(
      "UPDATE interests SET status = $1, updated_at = NOW() WHERE id = $2",
      ['blacklisted', 2]
    );
  });
});
