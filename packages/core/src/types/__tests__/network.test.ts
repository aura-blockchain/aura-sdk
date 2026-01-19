import { describe, expect, it } from 'vitest';
import {
  ChainID,
  DEFAULT_CONNECTION_OPTIONS,
  LOCALNET_CONFIG,
  MAINNET_CONFIG,
  NETWORK_CONFIGS,
  NetworkConfig,
  NetworkError,
  NetworkType,
  TESTNET_CONFIG,
  TimeoutError,
  buildDID,
  buildServiceEndpoints,
  getNetworkConfig,
  getNetworkConfigByChainId,
  isProductionNetwork,
  isValidDID,
  parseDID,
  validateNetworkConfig,
  ConnectionError,
} from '../network.js';

describe('Network types and configuration', () => {
  it('exposes expected network enum values', () => {
    expect(NetworkType.MAINNET).toBe('mainnet');
    expect(NetworkType.TESTNET).toBe('testnet');
    expect(NetworkType.LOCALNET).toBe('localnet');
    expect(Object.values(NetworkType)).toHaveLength(3);
  });

  it('provides predefined configs for all networks', () => {
    expect(NETWORK_CONFIGS[NetworkType.MAINNET]).toEqual(MAINNET_CONFIG);
    expect(NETWORK_CONFIGS[NetworkType.TESTNET]).toEqual(TESTNET_CONFIG);
    expect(NETWORK_CONFIGS[NetworkType.LOCALNET]).toEqual(LOCALNET_CONFIG);
  });

  it('retrieves configs by network and chain id', () => {
    expect(getNetworkConfig(NetworkType.TESTNET).chainId).toBe(ChainID.TESTNET);
    expect(getNetworkConfigByChainId(ChainID.MAINNET)).toEqual(MAINNET_CONFIG);
    expect(getNetworkConfigByChainId('unknown')).toBeUndefined();
    expect(() => getNetworkConfig('invalid' as NetworkType)).toThrow('Unknown network type');
  });

  it('validates configs and detects missing fields', () => {
    expect(validateNetworkConfig(TESTNET_CONFIG)).toBe(true);

    const invalidConfig: NetworkConfig = {
      ...TESTNET_CONFIG,
      endpoints: { ...TESTNET_CONFIG.endpoints, rest: '' },
    };

    expect(validateNetworkConfig(invalidConfig)).toBe(false);
  });
});

describe('DID helpers', () => {
  it('builds Aura DIDs that pass validation and roundtrip parse', () => {
    const did = buildDID('aura1abc123', NetworkType.TESTNET);

    expect(isValidDID(did)).toBe(true);

    const parsed = parseDID(did);
    expect(parsed).not.toBeNull();
    expect(parsed?.method).toBe('aura');
    expect(parsed?.network).toBe('testnet');
    expect(parsed?.identifier).toBe('aura1abc123');
  });

  it('rejects malformed DIDs', () => {
    expect(isValidDID('')).toBe(false);
    expect(isValidDID('did:other:123')).toBe(false);
    expect(parseDID('did:aura')).toBeNull();
    expect(parseDID('invalid')).toBeNull();
  });
});

describe('Service endpoint construction', () => {
  it('builds REST endpoints from network config', () => {
    const endpoints = buildServiceEndpoints(TESTNET_CONFIG);

    expect(endpoints.vcRegistry.getVC).toContain(TESTNET_CONFIG.endpoints.rest);
    expect(endpoints.identity.getIdentity).toContain('/aura/identity/v1beta1/identity/{did}');
  });
});

describe('Network helpers', () => {
  it('identifies production networks', () => {
    expect(isProductionNetwork(NetworkType.MAINNET)).toBe(true);
    expect(isProductionNetwork(NetworkType.TESTNET)).toBe(false);
    expect(isProductionNetwork(NetworkType.LOCALNET)).toBe(false);
  });

  it('exposes sensible connection defaults', () => {
    expect(DEFAULT_CONNECTION_OPTIONS.timeout).toBe(30000);
    expect(DEFAULT_CONNECTION_OPTIONS.maxRetries).toBe(3);
    expect(DEFAULT_CONNECTION_OPTIONS.retryDelay).toBe(1000);
  });
});

describe('Network error types', () => {
  it('preserves network context on errors', () => {
    const err = new NetworkError('failed', NetworkType.TESTNET, 'https://rpc');
    expect(err.name).toBe('NetworkError');
    expect(err.network).toBe(NetworkType.TESTNET);
    expect(err.endpoint).toBe('https://rpc');
  });

  it('specialises timeout and connection errors', () => {
    const timeout = new TimeoutError('timeout', NetworkType.MAINNET, 'https://rpc', 5000);
    expect(timeout.name).toBe('TimeoutError');
    expect(timeout.timeoutMs).toBe(5000);

    const conn = new ConnectionError('refused', NetworkType.LOCALNET, 'http://localhost:26657');
    expect(conn.name).toBe('ConnectionError');
    expect(conn.endpoint).toBe('http://localhost:26657');
    expect(conn.network).toBe(NetworkType.LOCALNET);
  });
});
