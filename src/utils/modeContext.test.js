import { describe, it, expect } from 'vitest';
import { getModeFromPath, MODE_CONFIGS } from './modeContext';

describe('modeContext utilities', () => {
  describe('getModeFromPath', () => {
    it('identifies /orbit correctly', () => {
      expect(getModeFromPath('/orbit/skills')).toBe('orbit');
    });
    it('identifies /missions correctly', () => {
      expect(getModeFromPath('/missions/tasks')).toBe('missions');
    });
    it('identifies /commons correctly', () => {
      expect(getModeFromPath('/commons/marketplace')).toBe('commons');
    });
    it('identifies /signals correctly', () => {
      expect(getModeFromPath('/signals/impact')).toBe('signals');
    });
    it('returns null for unknown paths', () => {
      expect(getModeFromPath('/login')).toBeNull();
    });
  });

  describe('MODE_CONFIGS', () => {
    it('contains all four core modes', () => {
      expect(Object.keys(MODE_CONFIGS)).toEqual(['orbit', 'missions', 'commons', 'signals']);
    });
  });
});
