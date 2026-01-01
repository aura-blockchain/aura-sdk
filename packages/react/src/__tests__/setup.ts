/**
 * Test setup file
 */

import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock MediaDevices for QRScanner tests
Object.defineProperty(window.navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: async () => {
      return new MediaStream();
    },
  },
});
