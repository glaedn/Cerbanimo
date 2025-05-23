import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LevelNotification from './LevelNotification';

// Helper function to generate textual progress for assertions
const generateProgressText = (progress, totalChars = 10) => {
    if (progress === undefined || progress === null) progress = 0;
    const numEquals = Math.round((progress / 100) * totalChars);
    const numDashes = totalChars - numEquals;
    return '='.repeat(numEquals) + '-'.repeat(numDashes);
};

describe('LevelNotification Component', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        // jest.runOnlyPendingTimers(); // Using runAllTimers can be safer if there are nested timers
        jest.runAllTimers(); // Ensure all timers are cleared and run
        jest.useRealTimers();
    });

    // Test 1: Renders without crashing
    test('Test 1: Renders without crashing with minimal valid props', () => {
        expect(() => {
            render(<LevelNotification previousXP={0} newXP={0} previousLevel={1} newLevel={1} />);
            // The component might return null initially due to isVisible=false logic,
            // this test primarily checks that the render function itself doesn't throw with valid (though minimal) props.
        }).not.toThrow();
    });

    // Test 2: Displays initial XP and level correctly
    test('Test 2: Displays initial XP and level correctly when made visible', () => {
        render(<LevelNotification previousXP={10} newXP={30} previousLevel={2} newLevel={2} />);
        
        act(() => {
            jest.advanceTimersByTime(100); // For the 50ms internal timeout + buffer to set isVisible and update progress
        });

        expect(screen.getByText('Lvl 2')).toBeInTheDocument(); // previousLevel on left
        expect(screen.getAllByText('Lvl 2').length).toBeGreaterThanOrEqual(1); // newLevel on right (could be multiple elements with "Lvl 2")
        expect(screen.getByText(generateProgressText(30))).toBeInTheDocument(); // Textual progress for newXP
        expect(screen.getByText(/XP: 10 -> 30/i)).toBeInTheDocument(); // XP text
    });

    // Test 3: "Level Up!" message appears only on level up
    test('Test 3: "Level Up!" message appears only on level up', () => {
        const { rerender } = render(
            <LevelNotification previousXP={0} newXP={50} previousLevel={1} newLevel={1} /> // No level up
        );

        act(() => {
            jest.advanceTimersByTime(100); // Process initial visibility and updates
        });
        // Query for "Level Up!" text; it should not be there.
        expect(screen.queryByText(/Level Up!/i)).not.toBeInTheDocument();
        // Ensure previous level is displayed
        expect(screen.getByText('Lvl 1')).toBeInTheDocument();


        // Rerender with props that indicate a level up
        rerender(
            <LevelNotification previousXP={50} newXP={20} previousLevel={1} newLevel={2} /> // Level up
        );
        
        act(() => {
            jest.advanceTimersByTime(100); // Process re-render, visibility, and updates
        });
        // "Level Up!" message should now be present
        expect(screen.getByText(/Level Up!/i)).toBeInTheDocument();
        // The new level ("2") should be prominently displayed in the level up message (typically as h3)
        expect(screen.getByText((content, element) => element.tagName.toLowerCase() === 'h3' && content === '2')).toBeInTheDocument();
        // The XP bar should also show the new level as its target
        expect(screen.getByText('Lvl 2')).toBeInTheDocument();
    });
    
    // Test 4: Notification is initially hidden if key props are undefined
    test('Test 4: Notification is initially hidden if key props (newXP, newLevel) are undefined', () => {
        // Render with newXP and newLevel as undefined.
        // The component's main useEffect depends on newXP and newLevel being defined to set isVisible = true.
        const { container } = render(
            <LevelNotification previousXP={0} newXP={undefined} previousLevel={1} newLevel={undefined} />
        );
        // The component returns null if !isVisible, so its container should be empty.
        expect(container.firstChild).toBeNull();
    });

    // Test 5: Notification becomes visible when props indicate an update
    test('Test 5: Notification becomes visible when props are updated to indicate an event', async () => {
        // Start with props that would keep it hidden (e.g., undefined newXP/newLevel)
        const { rerender, container } = render(
            <LevelNotification previousXP={0} newXP={undefined} previousLevel={1} newLevel={undefined} />
        );
        expect(container.firstChild).toBeNull(); // Verify initially hidden

        // Rerender with updated props that should trigger visibility
        rerender(
            <LevelNotification previousXP={0} newXP={30} previousLevel={1} newLevel={1} />
        );
        
        act(() => {
            jest.advanceTimersByTime(100); // Allow useEffect to run, set isVisible, and trigger internal updates
        });

        // Now the component should be visible.
        // We can check for a specific element that's always present when visible.
        expect(container.firstChild).not.toBeNull();
        expect(screen.getByText('Lvl 1')).toBeInTheDocument(); // Example check
        expect(screen.getByText(generateProgressText(30))).toBeInTheDocument();
        expect(screen.getByText(/XP: 0 -> 30/i)).toBeInTheDocument();
    });
});
