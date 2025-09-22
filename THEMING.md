# Theming Engine Documentation

This document explains how to work with the theming system in Cerbanimo, including the "Magical Girl Mode" theme.

## Overview

The theming system is built on top of Material-UI's theming capabilities. It allows for dynamic theme switching and provides a centralized way to manage colors, typography, and other visual styles.

The core of the theming system is composed of the following parts:

-   **Theme Files:** Located in `src/styles/`, these files define the variables for each theme.
    -   `theme.js`: The default theme.
    -   `magicalGirlTheme.js`: The "Magical Girl Mode" theme.
-   **MUI Theme Files:** Also in `src/styles/`, these files adapt the theme variables for Material-UI.
    -   `muiTheme.js`: Adapts the default theme.
    -   `muiMagicalGirlTheme.js`: Adapts the "Magical Girl Mode" theme.
-   **Redux Store:** The theme state is managed by a Redux slice in `src/store/themeSlice.js`.
-   **Dynamic Theme Provider:** `src/components/DynamicThemeProvider.jsx` is a wrapper component that provides the currently selected theme to the entire application.

## Modifying Existing Themes

To modify an existing theme, simply edit the corresponding theme file in `src/styles/`. For example, to change the primary color of the "Magical Girl Mode" theme, you would edit the `primary` value in `src/styles/magicalGirlTheme.js`.

## Adding a New Theme

To add a new theme, follow these steps:

1.  **Create a new theme file:** Create a new file in `src/styles/` (e.g., `src/styles/myNewTheme.js`). Use `magicalGirlTheme.js` as a template.
2.  **Create a new MUI theme file:** Create a corresponding MUI theme file (e.g., `src/styles/muiMyNewTheme.js`). Use `muiMagicalGirlTheme.js` as a template.
3.  **Update the theme map:** In `src/components/DynamicThemeProvider.jsx`, add your new theme to the `themeMap` object.
4.  **Update the Redux slice:** In `src/store/themeSlice.js`, update the `toggleTheme` reducer to cycle through the available themes, or add a new action to select your theme directly.

## Using Theme Variables in Components

When creating new components, you should use the theme variables instead of hardcoding colors, fonts, etc.

### For MUI Components

MUI components will automatically use the theme variables for their styles. You can also use the `sx` prop for one-off styling:

```jsx
<Button sx={{ color: 'primary.main' }}>My Button</Button>
```

### For Custom Components (with Styled-Components)

For custom components, it is recommended to use styled-components (via `@mui/material/styles`). This allows you to access the theme object directly in your styles:

```jsx
import { styled } from '@mui/material/styles';

const MyStyledComponent = styled('div')(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  padding: theme.spacing(2),
}));
```

### For Custom Components (without Styled-Components)

If you are not using styled-components, you can use the `useTheme` hook from `@mui/material/styles` to access the theme object:

```jsx
import { useTheme } from '@mui/material/styles';

const MyComponent = () => {
  const theme = useTheme();
  return <div style={{ color: theme.palette.primary.main }}>Hello</div>;
};
```
