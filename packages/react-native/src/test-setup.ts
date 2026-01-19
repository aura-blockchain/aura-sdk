import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { webcrypto } from 'node:crypto';

// Provide a minimal TextEncoder/TextDecoder for node environment
import { TextEncoder, TextDecoder } from 'util';
// @ts-expect-error global assignment for tests
global.TextEncoder = TextEncoder;
// @ts-expect-error global assignment for tests
global.TextDecoder = TextDecoder;
// Provide crypto.getRandomValues only if not already set by the runtime
if (typeof global.crypto === 'undefined') {
  // @ts-expect-error global assignment for tests
  global.crypto = webcrypto as unknown as Crypto;
}

// Silence react-native warnings by mocking console
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});
