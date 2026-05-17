import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ExperienceShell from './components/ExperienceShell/ExperienceShell';

// Mock hooks
vi.mock('./hooks/useIsMobile', () => ({
  useIsMobile: vi.fn().mockReturnValue(false)
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
      <MemoryRouter>
        <ExperienceShell>
          <div data-testid="child-content">Content</div>
        </ExperienceShell>
      </MemoryRouter>
    );

    expect(screen.getByTestId('site-nav')).toBeDefined();
    expect(screen.getByTestId('context-panel')).toBeDefined();
    expect(screen.getByTestId('child-content')).toBeDefined();
  });
});
