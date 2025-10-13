import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom'; // Needed for <Link>
import CommsLog from './CommsLog';
import { useNotifications } from '../../../pages/NotificationProvider';

// Mock the useNotifications hook
vi.mock('../../../pages/NotificationProvider', () => ({
  useNotifications: vi.fn(),
}));

// Wrapper component to provide Router context for <Link>
const renderWithRouter = (ui, { route = '/' } = {}) => {
  window.history.pushState({}, 'Test page', route);
  return render(ui, { wrapper: BrowserRouter });
};

describe('CommsLog', () => {
  beforeEach(() => {
    // Reset the mock before each test
    useNotifications.mockClear();
  });

  test('renders loading state when notifications are null', () => {
    useNotifications.mockReturnValue({ notifications: null });
    renderWithRouter(<CommsLog />);
    expect(screen.getByText(/Loading comms.../i)).toBeInTheDocument();
  });

  test('renders "No new activity" message when notifications array is empty', () => {
    useNotifications.mockReturnValue({ notifications: [] });
    renderWithRouter(<CommsLog />);
    expect(screen.getByText(/No new activity./i)).toBeInTheDocument();
  });

  test('renders a list of notifications', () => {
    const mockNotifications = [
      { id: 1, type: 'petal-approved', messageText: 'Petal "Design UI" was approved.' },
      { id: 2, type: 'petal-rejected', messageText: 'Petal "Backend Logic" was rejected.' },
    ];
    useNotifications.mockReturnValue({ notifications: mockNotifications });
    renderWithRouter(<CommsLog />);
    expect(screen.getByText('Petal "Design UI" was approved.')).toBeInTheDocument();
    expect(screen.getByText('Petal "Backend Logic" was rejected.')).toBeInTheDocument();
  });

  test('renders notifications as links if they have intentionId and petalId', () => {
    const mockNotifications = [
      { id: 1, type: 'petal-approved', messageText: 'Clickable Notification', intentionId: 'intention-123', petalId: 'petal-456' },
      { id: 2, type: 'info', messageText: 'Non-clickable Notification', intentionId: null, petalId: null },
    ];
    useNotifications.mockReturnValue({ notifications: mockNotifications });
    renderWithRouter(<CommsLog />);
    
    const clickableElement = screen.getByText('Clickable Notification');
    expect(clickableElement.closest('a')).toBeInTheDocument();
    expect(clickableElement.closest('a')).toHaveAttribute('href', '/visualizer/intention-123/petal-456');

    const nonClickableElement = screen.getByText('Non-clickable Notification');
    expect(nonClickableElement.closest('a')).toBeNull();
  });

  test('panel minimization works correctly', () => {
    useNotifications.mockReturnValue({ notifications: [{ id: 1, messageText: 'A notification', type: 'info' }] });
    renderWithRouter(<CommsLog />);

    const minimizeButton = screen.getByRole('button', { name: /minimize/i });
    let content = screen.getByRole('list');

    expect(content).toBeVisible();

    fireEvent.click(minimizeButton);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();

    expect(screen.getByRole('heading', { name: /Comms Log/i })).toBeVisible();
    expect(minimizeButton).toHaveAttribute('aria-label', 'Expand Comms Log');

    fireEvent.click(minimizeButton);
    content = screen.getByRole('list');
    expect(content).toBeVisible();
    expect(minimizeButton).toHaveAttribute('aria-label', 'Minimize Comms Log');
  });
});