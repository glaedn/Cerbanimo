import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StoryNode from '../src/components/StoryNode';
import ChronicleTimeline from '../src/components/ChronicleTimeline';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';

// Mock Auth0
vi.mock('@auth0/auth0-react', () => ({
  useAuth0: () => ({
    isAuthenticated: true,
    user: { sub: 'auth0|123', name: 'Test User' },
    getAccessTokenSilently: vi.fn().mockResolvedValue('token'),
  }),
}));

describe('Narrative Identity System Components', () => {
  const mockStory = {
    id: 1,
    task_name: 'Fix the Water Filter',
    project_name: 'Clean Water Initiative',
    reflection: 'It was hard but rewarding.',
    story_type: 'operational',
    impact_label: 'Water access restored',
    collaborators: [{ name: 'Alice', role: 'Engineer' }],
    downstream_effects: ['Reduced illness'],
    mentorship_links: [{ name: 'Bob', type: 'mentor', skill: 'Plumbing' }]
  };

  it('renders StoryNode with specialized F6 data', () => {
    render(
      <StoryNode {...mockStory} />
    );

    expect(screen.getByText('Fix the Water Filter')).toBeDefined();
    expect(screen.getByText('OPERATIONAL')).toBeDefined();
    expect(screen.getByText('Alice')).toBeDefined();
    expect(screen.getByText('↳ Reduced illness')).toBeDefined();
    expect(screen.getByText('Guided by Bob in Plumbing')).toBeDefined();
  });

  it('renders ChronicleTimeline with layered arcs', () => {
    const stories = [
      { ...mockStory, mission_arc: 'Spring 2027 Relief' },
      { id: 2, task_name: 'Distribute Food', mission_arc: 'Spring 2027 Relief', story_type: 'operational' },
      { id: 3, task_name: 'Mentor Youth', mission_arc: 'Educational Growth', story_type: 'mentorship' }
    ];

    render(
      <BrowserRouter>
        <ChronicleTimeline stories={stories} />
      </BrowserRouter>
    );

    expect(screen.getByText('SPRING 2027 RELIEF')).toBeDefined();
    expect(screen.getByText('EDUCATIONAL GROWTH')).toBeDefined();
    expect(screen.getByText('2 NODES')).toBeDefined();
    expect(screen.getByText('1 NODES')).toBeDefined();
  });
});
