import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import babelParser from "@babel/eslint-parser";

export default [
  {
    ignores: ["node_modules/**", ".expo/**", "dist/**", "src/database/models/**"]
  },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          presets: ["babel-preset-expo"],
          plugins: [
            ["@babel/plugin-proposal-decorators", { legacy: true }],
            ["@babel/plugin-transform-class-properties", { loose: true }]
          ]
        },
        ecmaFeatures: { jsx: true }
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        FormData: "readonly",
        fetch: "readonly"
      }
    },
    plugins: {
      react,
      "react-hooks": reactHooks
    },
    settings: {
      react: { version: "detect" }
    },
    rules: {
      "react/jsx-uses-react": "off",
      "react/jsx-uses-vars": "error",
      "react/react-in-jsx-scope": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^React$" }]
    }
  }
];
