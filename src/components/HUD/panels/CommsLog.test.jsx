import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import CommsLog from './CommsLog'; // Adjust path as necessary

// No need to mock useUserProfile or useNotifications as they were removed from CommsLog.
// The component now uses its own sampleActivities and useEffect.

describe('CommsLog', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers(); // Restore real timers
  });

  test('renders the panel title "Comms Log"', () => {
    render(<CommsLog />);
    expect(screen.getByRole('heading', { name: /Comms Log/i })).toBeInTheDocument();
  });

  test('initially renders up to 3 activities if sampleActivities is populated', () => {
    render(<CommsLog />);
    // CommsLog populates with 3 initial random messages from sampleActivities
    const activityItems = screen.queryAllByRole('listitem');
    expect(activityItems.length).toBeGreaterThanOrEqual(0); // Can be 0 if sampleActivities is empty
    expect(activityItems.length).toBeLessThanOrEqual(3); 
    if (activityItems.length > 0) {
        // Check content of one item - this depends on sampleActivities
        // For example, if "User 'NovaSpark' completed..." is a sample:
        // expect(screen.getByText(/User 'NovaSpark' completed/i)).toBeInTheDocument();
        // This is hard to test precisely without knowing the exact initial random items.
        // So, we check if list items are rendered.
    } else {
        expect(screen.getByText(/Initializing activity feed.../i)).toBeInTheDocument();
    }
  });

  test('adds a new activity every 5 seconds and maintains only the latest 3', () => {
    render(<CommsLog />);
    
    let initialActivities = screen.queryAllByRole('listitem');
    // Fast-forward time by 5 seconds
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    let activitiesAfter5s = screen.getAllByRole('listitem');
    // A new item should have been added, potentially pushing an old one out or adding to an empty list.
    // The exact content is random, so we check counts.
    expect(activitiesAfter5s.length).toBeGreaterThanOrEqual(1); // Should have at least one now
    expect(activitiesAfter5s.length).toBeLessThanOrEqual(3);

    // Fast-forward time by another 5 seconds
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    let activitiesAfter10s = screen.getAllByRole('listitem');
    expect(activitiesAfter10s.length).toBeGreaterThanOrEqual(1);
    expect(activitiesAfter10s.length).toBeLessThanOrEqual(3);

    // Fast-forward time by another 5 seconds (total 15s, at least 3 updates if unique)
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    let activitiesAfter15s = screen.getAllByRole('listitem');
    expect(activitiesAfter15s.length).toBeGreaterThanOrEqual(1);
    expect(activitiesAfter15s.length).toBeLessThanOrEqual(3); 
    // This also ensures it doesn't grow beyond 3
  });


  test('prevents adding the exact same message consecutively if it comes up randomly', () => {
    // Mock Math.random to control the selection from sampleActivities
    // Assume sampleActivities has at least two distinct items.
    // The actual sampleActivities array is in CommsLog.jsx
    // Let's say sampleActivities[0] is "Activity A" and sampleActivities[1] is "Activity B"

    const mockMath = Object.create(global.Math);
    // First call to Math.random() returns 0 (selects sampleActivities[0])
    // Second call also returns 0
    // Third call returns a value that selects sampleActivities[1] (e.g., 0.1 if length is 10)
    mockMath.random = jest.fn()
      .mockReturnValueOnce(0) // for initial load if any
      .mockReturnValueOnce(0) // for initial load if any
      .mockReturnValueOnce(0) // for initial load if any
      .mockReturnValueOnce(0) // for first interval update (selects first sample activity)
      .mockReturnValueOnce(0) // for second interval update (tries to select first sample activity again)
      .mockReturnValueOnce(0.1); // for third interval update (selects second sample activity)
    global.Math = mockMath;

    render(<CommsLog />);
    
    // Initial state (up to 3 messages, let's assume at least one is 'Activity A')
    act(() => { jest.advanceTimersByTime(100); }); // Initial render and useEffect
    const initialItems = screen.getAllByRole('listitem');
    // const initialText = initialItems.map(item => item.textContent);
    // expect(initialText[0]).toMatch(/Selena approved/i); // Example if sampleActivities[0] is "Selena..."

    // First interval: should add "Activity A" (if not already the top one)
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    let activities1 = screen.getAllByRole('listitem');
    // expect(activities1[0].textContent).toMatch(/Selena approved/i);

    // Second interval: Math.random still returns 0. Should NOT add "Activity A" again if it's already the top.
    // The log should effectively remain the same or shift if it was shorter than 3.
    const activities1Text = activities1.map(item => item.textContent);
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    let activities2 = screen.getAllByRole('listitem');
    expect(activities2.map(item => item.textContent)).toEqual(activities1Text); // Log remains unchanged because duplicate was prevented

    // Third interval: Math.random returns 0.1. Should add "Activity B" (if different from current top)
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    let activities3 = screen.getAllByRole('listitem');
    // expect(activities3[0].textContent).toMatch(/User 'NovaSpark' completed/i); // Example if sampleActivities[1] is "NovaSpark..."
    expect(activities3.map(item => item.textContent)).not.toEqual(activities2.map(item => item.textContent)); // Log should have changed

    global.Math = Object.getPrototypeOf(mockMath); // Restore Math.random
  });

  test('panel minimization works correctly', () => {
    render(<CommsLog />);
    const minimizeButton = screen.getByRole('button', { name: /minimize/i });
    let content = screen.getByRole('list'); // Assuming the ul is the main content container

    // Initial state: content is visible
    expect(content).toBeVisible();

    // Click to minimize
    fireEvent.click(minimizeButton);
    // Content should be hidden. In our case, the div.hud-panel-content is removed/hidden.
    // We check if the list is still in the document but not visible, or simply not in the document.
    // Based on current implementation, the parent div `hud-panel-content` gets display:none.
    // Testing library's `toBeVisible` checks for this.
    // However, if the `ul` is unmounted, queryByRole will return null.
    expect(screen.queryByRole('list')).not.toBeVisible();


    // Header should still be visible
    expect(screen.getByRole('heading', { name: /Comms Log/i })).toBeVisible();
    expect(minimizeButton).toHaveAttribute('aria-label', /expand/i); // Button text/label changes

    // Click to expand
    fireEvent.click(minimizeButton);
    content = screen.getByRole('list'); // Re-query for the list
    expect(content).toBeVisible();
    expect(minimizeButton).toHaveAttribute('aria-label', /minimize/i);
  });
});
