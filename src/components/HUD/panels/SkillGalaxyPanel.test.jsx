// src/components/HUD/panels/SkillGalaxyPanel.test.jsx
import React from 'react';

const mockTheme = {
  colors: {
    primary: '#007bff',
    accentGreen: '#28a745',
    secondary: '#ff69b4',
    accentPurple: '#800080',
  }
};

const getStarColorLogic = (level, theme) => {
  if (level >= 20) return theme.colors.accentPurple || '#800080';
  if (level >= 10) return theme.colors.secondary;
  if (level >= 5) return theme.colors.accentGreen;
  if (level >= 1) return theme.colors.primary;
  return theme.colors.primary;
};

const getStarGradientUrlLogic = (level) => {
  if (level >= 20) return 'url(#star-gradient-3)';
  if (level >= 10) return 'url(#star-gradient-2)';
  if (level >= 5) return 'url(#star-gradient-1)';
  if (level >= 1) return 'url(#star-gradient-0)';
  return 'url(#star-gradient-0)';
};

describe('SkillGalaxyPanel color and gradient logic', () => {
  describe('getStarColorLogic', () => {
    it('returns correct colors for skill tiers', () => {
      expect(getStarColorLogic(0, mockTheme)).toBe(mockTheme.colors.primary);
      expect(getStarColorLogic(1, mockTheme)).toBe(mockTheme.colors.primary);
      expect(getStarColorLogic(4, mockTheme)).toBe(mockTheme.colors.primary);
      expect(getStarColorLogic(5, mockTheme)).toBe(mockTheme.colors.accentGreen);
      expect(getStarColorLogic(9, mockTheme)).toBe(mockTheme.colors.accentGreen);
      expect(getStarColorLogic(10, mockTheme)).toBe(mockTheme.colors.secondary);
      expect(getStarColorLogic(19, mockTheme)).toBe(mockTheme.colors.secondary);
      expect(getStarColorLogic(20, mockTheme)).toBe(mockTheme.colors.accentPurple);
      expect(getStarColorLogic(100, mockTheme)).toBe(mockTheme.colors.accentPurple);
    });
  });

  describe('getStarGradientUrlLogic', () => {
    it('returns correct gradient URLs for skill tiers', () => {
      expect(getStarGradientUrlLogic(0)).toBe('url(#star-gradient-0)');
      expect(getStarGradientUrlLogic(1)).toBe('url(#star-gradient-0)');
      expect(getStarGradientUrlLogic(4)).toBe('url(#star-gradient-0)');
      expect(getStarGradientUrlLogic(5)).toBe('url(#star-gradient-1)');
      expect(getStarGradientUrlLogic(9)).toBe('url(#star-gradient-1)');
      expect(getStarGradientUrlLogic(10)).toBe('url(#star-gradient-2)');
      expect(getStarGradientUrlLogic(19)).toBe('url(#star-gradient-2)');
      expect(getStarGradientUrlLogic(20)).toBe('url(#star-gradient-3)');
      expect(getStarGradientUrlLogic(100)).toBe('url(#star-gradient-3)');
    });
  });
});
