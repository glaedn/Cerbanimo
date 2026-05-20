import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ExperienceShell from './components/ExperienceShell/ExperienceShell';
import React from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Mock hooks
vi.mock('./hooks/useIsMobile', () => ({
  useIsMobile: vi.fn().mockReturnValue(false)
}));

vi.mock('./hooks/useUserRoleProfile', () => ({
  useUserRoleProfile: vi.fn().mockReturnValue({
    isNewUser: false,
    isGovernanceActive: true,
    loading: false
  })
}));

// Mock components
vi.mock('./pages/SiteNav', () => ({
  default: () => <div data-testid="site-nav">SiteNav</div>
}));

vi.mock('./components/MobileBottomNav', () => ({
  default: () => <div data-testid="mobile-nav">MobileNav</div>
}));

vi.mock('./components/ExperienceShell/ContextPanel', () => ({
  default: () => <div data-testid="context-panel">ContextPanel</div>
}));

describe('ExperienceSpine Architecture', () => {
  it('renders the ExperienceShell with desktop navigation', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ExperienceShell>
            <div data-testid="child-content">Content</div>
          </ExperienceShell>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByTestId('site-nav')).toBeDefined();
    expect(screen.getByTestId('context-panel')).toBeDefined();
    expect(screen.getByTestId('child-content')).toBeDefined();
  });
});
