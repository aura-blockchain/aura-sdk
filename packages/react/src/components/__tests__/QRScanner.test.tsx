import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QRScanner } from '../QRScanner';

const getUserMediaMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  (global as any).navigator.mediaDevices = {
    getUserMedia: getUserMediaMock,
  };
});

describe('QRScanner', () => {
  it('shows error message when camera access fails', async () => {
    const onError = vi.fn();
    getUserMediaMock.mockRejectedValueOnce(new Error('denied'));

    render(<QRScanner onScan={() => {}} onError={onError} />);

    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(screen.getByText(/denied/i)).toBeInTheDocument();
  });

  it('starts scanning when camera succeeds', async () => {
    const onScan = vi.fn();
    // minimal fake stream
    getUserMediaMock.mockResolvedValueOnce({ getTracks: () => [] });

    const { container } = render(<QRScanner onScan={onScan} showFrame={false} />);

    await waitFor(() => expect(getUserMediaMock).toHaveBeenCalled());
    expect(container.querySelector('video')).toBeTruthy();
  });
});
