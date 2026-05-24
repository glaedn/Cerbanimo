import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useIntelligence } from './useIntelligence';
import axios from 'axios';

vi.mock('axios');

describe('useIntelligence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'fake-token');
  });

  it('fetches pulse and applies no filtering by default', async () => {
    const mockPulse = {
      signals: [
        { type: 'opportunity', priority: 'low', message: 'test' },
        { type: 'friction', priority: 'high', message: 'stalled' }
      ]
    };
    axios.get.mockResolvedValue({ data: mockPulse });

    const { result } = renderHook(() => useIntelligence());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.pulse.signals).toHaveLength(2);
  });

  it('filters signals in focusMode', async () => {
    const mockPulse = {
      signals: [
        { type: 'opportunity', priority: 'low', message: 'test' },
        { type: 'friction', priority: 'high', message: 'stalled' },
        { type: 'crisis', priority: 'critical', message: 'emergency' }
      ]
    };
    axios.get.mockResolvedValue({ data: mockPulse });

    const { result } = renderHook(() => useIntelligence({ focusMode: true }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    // Should only keep friction and crisis
    expect(result.current.pulse.signals).toHaveLength(2);
    expect(result.current.pulse.signals.map(s => s.type)).not.toContain('opportunity');
  });

  it('filters signals in quietMode', async () => {
    const mockPulse = {
      signals: [
        { type: 'opportunity', priority: 'low', message: 'test' },
        { type: 'friction', priority: 'high', message: 'stalled' }
      ]
    };
    axios.get.mockResolvedValue({ data: mockPulse });

    const { result } = renderHook(() => useIntelligence({ quietMode: true }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    // Should only keep high priority
    expect(result.current.pulse.signals).toHaveLength(1);
    expect(result.current.pulse.signals[0].priority).toBe('high');
  });
});
