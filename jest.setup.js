// jest.setup.js
Object.defineProperty(global, 'import.meta', {
  value: {
    env: {
      VITE_BACKEND_URL: 'http://localhost:4000',
    },
  },
  writable: true,
});
