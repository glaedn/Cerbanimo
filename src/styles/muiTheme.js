import { createTheme } from '@mui/material/styles';
import theme from './theme'; // Import our custom theme

const muiTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: theme.colors.primary,
    },
    secondary: {
      main: theme.colors.secondary,
    },
    error: {
      main: theme.colors.error,
    },
    warning: {
      main: theme.colors.warning,
    },
    info: {
      main: theme.colors.info,
    },
    success: {
      main: theme.colors.success,
    },
    accentPurple: {
      main: theme.colors.accentPurple,
    },
    accentGreen: {
      main: theme.colors.accentGreen,
    },
    accentBlue: {
      main: theme.colors.accentBlue,
    },
    accentOrange: {
      main: theme.colors.accentOrange,
    },
    background: {
      default: theme.colors.backgroundDefault,
      paper: theme.colors.backgroundPaper,
    },
    text: {
      primary: theme.colors.textPrimary,
      secondary: theme.colors.textSecondary,
    },
  },
  typography: {
    fontFamily: theme.typography.fontFamilyBase,
    h1: {
      fontFamily: theme.typography.fontFamilyAccent,
      fontSize: theme.typography.fontSizeLg, // Example, adjust as needed
      fontWeight: theme.typography.fontWeightBold,
    },
    // Add other typography variants as needed (h2-h6, body1, body2, etc.)
    // For example:
    // h2: { fontFamily: theme.typography.fontFamilyAccent, fontSize: '2rem', fontWeight: theme.typography.fontWeightBold },
    // body1: { fontSize: theme.typography.fontSizeMd, fontWeight: theme.typography.fontWeightRegular },
    h5: {
      fontFamily: theme.typography.fontFamilyAccent,
      fontSize: '1.15rem',
      fontWeight: theme.typography.fontWeightBold,
    },
    h6: {
      fontFamily: theme.typography.fontFamilyAccent,
      fontSize: theme.typography.fontSizeMd,
      fontWeight: theme.typography.fontWeightBold,
    },
    body2: {
      fontFamily: theme.typography.fontFamilyBase,
      fontSize: theme.typography.fontSizeSm,
      fontWeight: theme.typography.fontWeightRegular,
    },
    button: {
      fontFamily: theme.typography.fontFamilyBase,
      textTransform: 'none', // Keeps button text as written, no default uppercase
      // fontWeight: theme.typography.fontWeightMedium, // Example
    },
  },
  shape: {
    borderRadius: parseInt(theme.borders.borderRadiusMd, 10), // MUI uses a number
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: theme.borders.borderRadiusSm,
          padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
          // Example: Adding a border
          // border: `1px solid ${theme.colors.primary}`,
          // '&:hover': {
          //   backgroundColor: theme.colors.primary,
          //   color: theme.colors.backgroundPaper, // Example: changing text color on hover
          // },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: theme.borders.borderRadiusSm,
          backgroundColor: theme.colors.secondary,
          color: theme.colors.textPrimary,
          '&:hover': {
            backgroundColor: theme.colors.accentPurple, // Darken or change color on hover
          },
        },
        deleteIcon: {
          color: theme.colors.textSecondary,
          '&:hover': {
            color: theme.colors.textPrimary,
          },
        },
      },
    },
    MuiTextField: { // Used by Autocomplete
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: theme.colors.border,
            },
            '&:hover fieldset': {
              borderColor: theme.colors.primary,
            },
            '&.Mui-focused fieldset': {
              borderColor: theme.colors.primary,
            },
            color: theme.colors.textPrimary,
            backgroundColor: theme.colors.backgroundPaper, // Ensure input background matches paper
          },
          '& .MuiInputLabel-root': { // Label styles
            color: theme.colors.textSecondary,
          },
          '& .MuiInputLabel-root.Mui-focused': { // Label styles when focused
            color: theme.colors.primary,
          },
        },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        paper: { // Styles for the dropdown list box
          backgroundColor: theme.colors.backgroundPaper,
          color: theme.colors.textPrimary,
          border: `1px solid ${theme.colors.border}`,
        },
        option: {
          // Styling for selected option
          '&[aria-selected="true"]': {
            backgroundColor: `${theme.colors.primary}33`, // primary color with ~20% opacity
          },
          // Styling for focused selected option (e.g. keyboard navigation)
          '&[aria-selected="true"].Mui-focused': {
            backgroundColor: `${theme.colors.primary}33`, // Ensure consistency
          },
          // Hover style for options
          // '&:hover': {
          //   backgroundColor: `${theme.colors.primary}1A`, // primary color with ~10% opacity
          // },
        },
      },
    },
    // Add other component overrides as the project evolves
    // e.g., MuiAppBar, MuiCard, MuiPaper, MuiDrawer, MuiDialog etc.
  },
});

export default muiTheme;
