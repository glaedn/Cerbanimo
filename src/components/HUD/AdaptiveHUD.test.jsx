import React from 'react';
import { render, screen } from '@testing-library/react';
import AdaptiveHUD from './AdaptiveHUD';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router } from 'react-router-dom';
import { vi, describe, test, expect } from 'vitest';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    <Router>
      {children}
    </Router>
  </QueryClientProvider>
);

// Mock components
vi.mock('./EventRiver', () => ({ default: () => <div data-testid="event-river">EventRiver</div> }));
vi.mock('./MissionControlInterface', () => ({ default: () => <div data-testid="mission-control">MissionControl</div> }));
vi.mock('./CrisisOpsConsole', () => ({ default: () => <div data-testid="crisis-ops">CrisisOps</div> }));
vi.mock('./CoordinationPulseHUD', () => ({ default: () => <div data-testid="pulse-hud">PulseHUD</div> }));
vi.mock('./PresenceIndicators', () => ({ default: () => <div data-testid="presence">Presence</div> }));
vi.mock('./OverlayManager', () => ({ default: () => <div data-testid="overlay-manager">OverlayManager</div> }));
vi.mock('./panels/StatusBar', () => ({ default: () => <div data-testid="status-bar">StatusBar</div> }));
vi.mock('./panels/SignalFeed', () => ({ default: () => <div data-testid="signal-feed">SignalFeed</div> }));
vi.mock('./panels/EntityInspector', () => ({ default: () => <div data-testid="entity-inspector">EntityInspector</div> }));

vi.mock('../../hooks/useWindowSize', () => ({
  useWindowSize: () => ({
    width: 1920,
    height: 1080,
  }),
}));

// Mock the store
import { useAppStore } from '../../store/useAppStore';
vi.mock('../../store/useAppStore');

describe('AdaptiveHUD', () => {
  test('renders in normal mode by default', () => {
    useAppStore.mockReturnValue({
      activeContext: 'normal',
      realtimeEvents: [],
      selectedEntity: null,
      isCrisisMode: false,
      hudMode: 'normal',
      activePanels: ['signals', 'river', 'pulse'],
      collapsedPanels: [],
      setActiveContext: vi.fn(),
      setCrisisMode: vi.fn(),
      setHudMode: vi.fn(),
      togglePanelCollapse: vi.fn(),
    });

    render(<AdaptiveHUD />, { wrapper });

    expect(screen.getByTestId('event-river')).toBeInTheDocument();
    expect(screen.getByTestId('signal-feed')).toBeInTheDocument();
    expect(screen.getAllByTestId('pulse-hud').length).toBeGreaterThan(0);
  });

  test('renders mission control in mission mode', () => {
    useAppStore.mockReturnValue({
      activeContext: 'mission',
      realtimeEvents: [],
      selectedEntity: { type: 'project', id: 1 },
      isCrisisMode: false,
      hudMode: 'operational',
      activePanels: ['mission'],
      collapsedPanels: [],
      setActiveContext: vi.fn(),
      setCrisisMode: vi.fn(),
      setHudMode: vi.fn(),
      togglePanelCollapse: vi.fn(),
    });

    render(<AdaptiveHUD />, { wrapper });

    expect(screen.getByTestId('mission-control')).toBeInTheDocument();
  });

  test('renders crisis console in crisis mode', () => {
    useAppStore.mockReturnValue({
      activeContext: 'crisis',
      realtimeEvents: [],
      selectedEntity: null,
      isCrisisMode: true,
      hudMode: 'operational',
      activePanels: ['crisis'],
      collapsedPanels: [],
      setActiveContext: vi.fn(),
      setCrisisMode: vi.fn(),
      setHudMode: vi.fn(),
      togglePanelCollapse: vi.fn(),
    });

    render(<AdaptiveHUD />, { wrapper });

    expect(screen.getByTestId('crisis-ops')).toBeInTheDocument();
  });
});
