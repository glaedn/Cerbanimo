import { createTheme } from '@mui/material/styles';
import magicalGirlTheme from './magicalGirlTheme';

const muiMagicalGirlTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: magicalGirlTheme.colors.primary,
    },
    secondary: {
      main: magicalGirlTheme.colors.secondary,
    },
    error: {
      main: magicalGirlTheme.colors.error,
    },
    warning: {
      main: magicalGirlTheme.colors.warning,
    },
    info: {
      main: magicalGirlTheme.colors.info,
    },
    success: {
      main: magicalGirlTheme.colors.success,
    },
    background: {
      default: magicalGirlTheme.colors.backgroundDefault,
      paper: magicalGirlTheme.colors.backgroundPaper,
    },
    text: {
      primary: magicalGirlTheme.colors.textPrimary,
      secondary: magicalGirlTheme.colors.textSecondary,
    },
  },
  typography: {
    fontFamily: magicalGirlTheme.typography.fontFamilyBase,
    h1: { fontFamily: magicalGirlTheme.typography.fontFamilyAccent, fontSize: '2.5rem', fontWeight: magicalGirlTheme.typography.fontWeightBold, textShadow: magicalGirlTheme.effects.textShadow },
    h2: { fontFamily: magicalGirlTheme.typography.fontFamilyAccent, fontSize: '2rem', fontWeight: magicalGirlTheme.typography.fontWeightBold, textShadow: magicalGirlTheme.effects.textShadow },
    h3: { fontFamily: magicalGirlTheme.typography.fontFamilyAccent, fontSize: '1.75rem', fontWeight: magicalGirlTheme.typography.fontWeightBold, textShadow: magicalGirlTheme.effects.textShadow },
    h4: { fontFamily: magicalGirlTheme.typography.fontFamilyAccent, fontSize: '1.5rem', fontWeight: magicalGirlTheme.typography.fontWeightMedium },
    h5: { fontFamily: magicalGirlTheme.typography.fontFamilyAccent, fontSize: '1.25rem', fontWeight: magicalGirlTheme.typography.fontWeightMedium },
    h6: { fontFamily: magicalGirlTheme.typography.fontFamilyAccent, fontSize: '1rem', fontWeight: magicalGirlTheme.typography.fontWeightMedium },
    body1: { fontFamily: magicalGirlTheme.typography.fontFamilyBase, fontSize: magicalGirlTheme.typography.fontSizeMd },
    body2: { fontFamily: magicalGirlTheme.typography.fontFamilyBase, fontSize: magicalGirlTheme.typography.fontSizeSm },
    button: {
      fontFamily: magicalGirlTheme.typography.fontFamilyAccent,
      textTransform: 'none',
      fontWeight: magicalGirlTheme.typography.fontWeightBold,
    },
  },
  shape: {
    borderRadius: parseInt(magicalGirlTheme.borders.borderRadiusMd, 10),
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: magicalGirlTheme.borders.borderRadiusLg,
          border: `2px solid ${magicalGirlTheme.colors.primary}`,
          background: `linear-gradient(45deg, ${magicalGirlTheme.colors.blushPink}, ${magicalGirlTheme.colors.lavender})`,
          color: magicalGirlTheme.colors.textPrimary,
          boxShadow: magicalGirlTheme.effects.glowSubtle(magicalGirlTheme.colors.primary),
          transition: `all ${magicalGirlTheme.transitions.short} ${magicalGirlTheme.transitions.easing}`,
          '&:hover': {
            boxShadow: magicalGirlTheme.effects.glowStrong(magicalGirlTheme.colors.brightCyan),
            transform: 'scale(1.05)',
          },
        },
      },
    },
    MuiPaper: { // For Cards, Modals, etc.
      styleOverrides: {
        root: {
          borderRadius: magicalGirlTheme.borders.borderRadiusLg,
          border: `1px solid ${magicalGirlTheme.colors.primary}`,
          boxShadow: magicalGirlTheme.effects.outerGlow,
          background: magicalGirlTheme.colors.backgroundPaper,
          backdropFilter: 'blur(10px)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: magicalGirlTheme.borders.borderRadiusLg,
          border: `1px solid ${magicalGirlTheme.colors.primary}`,
          boxShadow: magicalGirlTheme.effects.outerGlow,
          background: magicalGirlTheme.colors.backgroundPaper,
          backdropFilter: 'blur(10px)',
        },
      },
    },
    MuiModal: {
      styleOverrides: {
        root: {
            // The backdrop is a separate element
            '& .MuiBackdrop-root': {
                backgroundColor: 'rgba(0,0,0,0.2)',
                backdropFilter: 'blur(5px)',
            }
        }
      }
    },
    MuiLinearProgress: { // For progress bars
        styleOverrides: {
            root: {
                height: '10px',
                borderRadius: '5px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
            },
            bar: {
                borderRadius: '5px',
                background: `linear-gradient(90deg, ${magicalGirlTheme.colors.peach}, ${magicalGirlTheme.colors.blushPink}, ${magicalGirlTheme.colors.neonPurple})`,
            }
        }
    },
    MuiCheckbox: {
        // Placeholder for rune/crystal switch style
        // This will require more complex styling, possibly with custom icons
    },
    MuiSwitch: {
        // Placeholder for rune/crystal switch style
    }
  },
});

export default muiMagicalGirlTheme;
