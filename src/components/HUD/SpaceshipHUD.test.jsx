import React from 'react';
import { render, screen } from '@testing-library/react';
import SpaceshipHUD from './SpaceshipHUD';

// Mock child panel components with correct default export syntax
vi.mock('./panels/CommandDeck', () => ({
  default: () => <div data-testid="command-deck-panel">CommandDeck</div>
}));
vi.mock('./panels/MissionConsole', () => ({
  default: () => <div data-testid="mission-console-panel">MissionConsole</div>
}));
vi.mock('./panels/TargetingScanner', () => ({
  default: () => <div data-testid="targeting-scanner-panel">TargetingScanner</div>
}));
vi.mock('./panels/CommsLog', () => ({
  default: () => <div data-testid="comms-log-panel">CommsLog</div>
}));
vi.mock('./panels/CapabilityGalaxyPanel', () => ({
  default: () => <div data-testid="capability-galaxy-panel">CapabilityGalaxy</div>
}));
vi.mock('./panels/StatusBar', () => ({
  default: () => <div data-testid="status-bar">StatusBar</div>
}));

// Mock hooks used by SpaceshipHUD or its direct children if necessary
vi.mock('../../hooks/useWindowSize', () => ({
  useWindowSize: () => ({
    width: 1920, // Default to desktop size
    height: 1080,
  }),
}));

describe('SpaceshipHUD', () => {
  test('renders the main HUD container', () => {
    render(<SpaceshipHUD />);
    expect(screen.getByTestId('command-deck-panel')).toBeInTheDocument();
  });

  test('renders all five primary panels and the StatusBar', () => {
    render(<SpaceshipHUD />);
    expect(screen.getByTestId('command-deck-panel')).toBeInTheDocument();
    expect(screen.getByTestId('mission-console-panel')).toBeInTheDocument();
    expect(screen.getByTestId('targeting-scanner-panel')).toBeInTheDocument();
    expect(screen.getByTestId('comms-log-panel')).toBeInTheDocument();
    expect(screen.getByTestId('capability-galaxy-panel')).toBeInTheDocument();
    expect(screen.getByTestId('status-bar')).toBeInTheDocument();
  });

  test('does not render HUDSettingsPanel', () => {
    render(<SpaceshipHUD />);
    expect(screen.queryByTestId('hud-settings-panel')).not.toBeInTheDocument();
  });

  test('renders children passed to it (map viewport content)', () => {
    render(
      <SpaceshipHUD>
        <div data-testid="map-content">Galactic Map View</div>
      </SpaceshipHUD>
    );
    expect(screen.getByTestId('map-content')).toBeInTheDocument();
    expect(screen.getByText('Galactic Map View')).toBeInTheDocument();
  });

  test('primary panels have their respective positioning classes', () => {
    render(<SpaceshipHUD />);
    
    const commandDeckWrapper = screen.getByTestId('command-deck-panel').parentElement;
    expect(commandDeckWrapper).toHaveClass('panel-wrapper', 'command-deck-panel');

    const targetingScannerWrapper = screen.getByTestId('targeting-scanner-panel').parentElement;
    expect(targetingScannerWrapper).toHaveClass('panel-wrapper', 'targeting-scanner-panel');
    
    const missionConsoleWrapper = screen.getByTestId('mission-console-panel').parentElement;
    expect(missionConsoleWrapper).toHaveClass('panel-wrapper', 'mission-console-panel');

    const commsLogWrapper = screen.getByTestId('comms-log-panel').parentElement;
    expect(commsLogWrapper).toHaveClass('panel-wrapper', 'comms-log-panel');

    const capabilityGalaxyWrapper = screen.getByTestId('capability-galaxy-panel').parentElement;
    expect(capabilityGalaxyWrapper).toHaveClass('panel-wrapper', 'capability-galaxy-panel');
  });
});