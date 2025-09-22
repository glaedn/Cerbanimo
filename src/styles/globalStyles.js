import magicalGirlTheme from './magicalGirlTheme';

const globalStyles = {
  '@keyframes sparkle': {
    '0%, 100%': { opacity: 0 },
    '50%': { opacity: 1 },
  },
  '@keyframes gradientPan': {
    '0%': { backgroundPosition: '0% 50%' },
    '50%': { backgroundPosition: '100% 50%' },
    '100%': { backgroundPosition: '0% 50%' },
  },
  body: {
    background: magicalGirlTheme.colors.backgroundDefault,
    backgroundSize: '200% 200%',
    animation: `${magicalGirlTheme.animations.gradientPan} 10s ease infinite`,
    color: magicalGirlTheme.colors.textPrimary,
    fontFamily: magicalGirlTheme.typography.fontFamilyBase,
    transition: `all ${magicalGirlTheme.transitions.medium}`,
  },
  '::-webkit-scrollbar': {
    width: '12px',
  },
  '::-webkit-scrollbar-track': {
    background: magicalGirlTheme.colors.backgroundPaper,
  },
  '::-webkit-scrollbar-thumb': {
    backgroundColor: magicalGirlTheme.colors.primary,
    borderRadius: '20px',
    border: `3px solid ${magicalGirlTheme.colors.backgroundPaper}`,
  },
};

export default globalStyles;
