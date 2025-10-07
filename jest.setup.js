// jest.setup.js
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

Object.defineProperty(global, 'import.meta', {
  value: {
    env: {
      VITE_BACKEND_URL: 'http://localhost:4000',
    },
  },
  writable: true,
});
