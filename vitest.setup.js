import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
    clear: vi.fn(() => { store = {}; }),
    removeItem: vi.fn((key) => { delete store[key]; }),
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });

// Mock Tone.js
const synthMock = {
  toDestination: vi.fn().mockReturnThis(),
  triggerAttackRelease: vi.fn(),
  oscillator: { type: 'sine' },
  envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.1 },
  connect: vi.fn().mockReturnThis(),
};

vi.mock('tone', () => {
  const toneObj = {
    MembraneSynth: vi.fn().mockImplementation(function() { return synthMock; }),
    PolySynth: vi.fn().mockImplementation(function() { return synthMock; }),
    Synth: vi.fn().mockImplementation(function() { return synthMock; }),
    Destination: {},
    Transport: {
      start: vi.fn(),
      stop: vi.fn(),
    },
    getContext: vi.fn().mockReturnValue({}),
    start: vi.fn().mockResolvedValue(),
  };
  return {
    ...toneObj,
    default: toneObj
  };
});

// Polyfill for jest to vi
global.jest = {
  mock: vi.mock,
  fn: vi.fn,
  requireActual: vi.importActual,
};
