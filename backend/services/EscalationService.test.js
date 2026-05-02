import { describe, it, expect, vi, beforeEach } from 'vitest';
import pool from '../db.js';
import { findMatchesForNeed } from './matchingService.js';
import EscalationService from './EscalationService.js';
import ProjectConversionService from './ProjectConversionService.js';
import { sendNotification } from './NotificationService.js';

vi.mock('../db.js', () => ({
  default: {
    query: vi.fn(),
  },
}));

vi.mock('./matchingService.js', () => ({
  findMatchesForNeed: vi.fn(),
}));

vi.mock('./NotificationService.js', () => ({
  sendNotification: vi.fn(),
}));

vi.mock('./ProjectConversionService.js', () => ({
  default: {
    convertNeedToProject: vi.fn(),
  },
}));

// Mock pools query for the test where it is expected to be called with certain arguments
const mockPoolQuery = pool.query;

describe('EscalationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkAndEscalateNeeds', () => {
    it('should fetch stale open needs and escalate them', async () => {
      const mockNeeds = [
        { id: 1, name: 'Need 1', status: 'open', urgency: 'low' },
        { id: 2, name: 'Need 2', status: 'open', urgency: 'high' },
      ];
      pool.query.mockResolvedValueOnce({ rows: mockNeeds });

      findMatchesForNeed.mockResolvedValue({ users: [], resources: [] });

      await EscalationService.checkAndEscalateNeeds();

      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("status = 'open'"));
      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("UPDATE needs SET status = $1 WHERE id = $2"), ['escalating', 1]);
      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("UPDATE needs SET status = $1 WHERE id = $2"), ['escalating', 2]);
    });

    it('should trigger auto-conversion for high-urgency needs', async () => {
      const mockNeeds = [
        { id: 2, name: 'Urgent Need', status: 'open', urgency: 'high' },
      ];
      pool.query.mockResolvedValueOnce({ rows: mockNeeds });
      findMatchesForNeed.mockResolvedValue({ users: [], resources: [] });

      await EscalationService.checkAndEscalateNeeds();

      expect(ProjectConversionService.convertNeedToProject).toHaveBeenCalledWith(2);
    });
  });

  describe('escalateNeed', () => {
    it('should notify matched users and expand radius', async () => {
      const need = { id: 1, name: 'Test Need', requestor_user_id: 100, urgency: 'medium' };
      findMatchesForNeed.mockResolvedValue({
        users: [{ id: 101 }, { id: 100 }], // 100 is requestor
        resources: []
      });

      await EscalationService.escalateNeed(need);

      expect(findMatchesForNeed).toHaveBeenCalledWith(1, expect.anything(), 150);
      expect(sendNotification).toHaveBeenCalledWith(101, expect.objectContaining({
        type: 'need_escalation'
      }));
      expect(sendNotification).not.toHaveBeenCalledWith(100, expect.any(Object));
    });
  });
});
