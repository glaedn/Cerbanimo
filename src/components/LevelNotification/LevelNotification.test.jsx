import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import LevelNotification from './LevelNotification';

// This helper must match the one in the component for the test to be valid.
const generateProgressText = (progress, totalChars = 10) => {
    if (progress === undefined || progress === null) progress = 0;
    const numEquals = Math.round((progress / 100) * totalChars);
    const numDashes = totalChars - numEquals;
    return '='.repeat(numEquals) + '-'.repeat(numDashes);
};

describe('LevelNotification Component', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.runAllTimers();
        vi.useRealTimers();
    });

    test('Renders without crashing with minimal valid props', () => {
        expect(() => {
            render(<LevelNotification previousXP={0} newXP={0} previousLevel={1} newLevel={1} />);
        }).not.toThrow();
    });

    test('Displays XP and level correctly when made visible', async () => {
        const { rerender } = render(<LevelNotification previousXP={50} newXP={80} previousLevel={2} newLevel={2} />);
        
        await act(async () => {
            vi.advanceTimersByTime(100);
        });

        const xpAtLevel2Start = 40;
        const xpAtLevel3Start = 160;
        const totalInBand = xpAtLevel3Start - xpAtLevel2Start; // 120
        const progressInBand = 80 - xpAtLevel2Start; // 40
        const percentage = (progressInBand / totalInBand) * 100;

        expect(screen.getByText('Lvl 2')).toBeInTheDocument();
        expect(screen.getByText(/XP: 50 → 80/i)).toBeInTheDocument();
        expect(screen.getByText(generateProgressText(percentage))).toBeInTheDocument();
    });

    test('"LEVELED UP!" message appears only on level up', async () => {
        const { rerender } = render(
            <LevelNotification previousXP={0} newXP={50} previousLevel={1} newLevel={1} skillName="TestSkill" />
        );

        await act(async () => {
            vi.advanceTimersByTime(100);
        });

        expect(screen.queryByText(/LEVELED UP!/i)).not.toBeInTheDocument();
        expect(screen.getByText(/XP GAINED IN TestSkill/i)).toBeInTheDocument();

        rerender(
            <LevelNotification previousXP={30} newXP={45} previousLevel={1} newLevel={2} skillName="TestSkill" />
        );
        
        await act(async () => {
            vi.advanceTimersByTime(100);
        });

        expect(screen.getByText(/TestSkill LEVELED UP!/i)).toBeInTheDocument();
        expect(screen.getByText(/LEVEL 2/i)).toBeInTheDocument();
    });
    
    test('Notification is initially hidden if key props are undefined', () => {
        const { container } = render(
            <LevelNotification previousXP={0} newXP={undefined} previousLevel={1} newLevel={undefined} />
        );
        expect(container.firstChild).toBeNull();
    });

    test('Notification becomes visible when props are updated to indicate an event', async () => {
        const { rerender, container } = render(
            <LevelNotification previousXP={0} newXP={undefined} previousLevel={1} newLevel={undefined} />
        );
        expect(container.firstChild).toBeNull();

        rerender(
            <LevelNotification previousXP={0} newXP={30} previousLevel={1} newLevel={1} />
        );
        
        await act(async () => {
            vi.advanceTimersByTime(100);
        });

        expect(container.firstChild).not.toBeNull();
        expect(screen.getByText('Lvl 1')).toBeInTheDocument();
        expect(screen.getByText(/XP: 0 → 30/i)).toBeInTheDocument();
    });
});