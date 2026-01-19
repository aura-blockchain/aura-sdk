import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import {
  ChainID,
  NetworkConfig,
  NetworkType,
  buildDID,
  buildServiceEndpoints,
  getNetworkConfig,
  isValidDID,
  parseDID,
} from '../network.js';

const addressArb = fc.stringOf(
  fc.constantFrom(
    ..."abcdefghijklmnopqrstuvwxyz0123456789"
  ),
  { minLength: 6, maxLength: 64 }
);

const networkArb = fc.constantFrom(NetworkType.MAINNET, NetworkType.TESTNET, NetworkType.LOCALNET);

const endpointArb = fc.record({
  grpc: fc.webUrl(),
  rest: fc.webUrl(),
  rpc: fc.webUrl(),
  websocket: fc.webUrl(),
});

const configArb: fc.Arbitrary<NetworkConfig> = fc.record({
  network: networkArb,
  chainId: fc.constantFrom(ChainID.MAINNET, ChainID.TESTNET, ChainID.LOCALNET),
  endpoints: endpointArb,
  addressPrefix: fc.string({ minLength: 3, maxLength: 12 }),
  didPrefix: fc.constant('did:aura'),
  didNetwork: fc.string({ minLength: 3, maxLength: 12 }),
  gasPrice: fc.record({
    amount: fc.string({ minLength: 1, maxLength: 6 }),
    denom: fc.string({ minLength: 2, maxLength: 10 }),
  }),
  blockTime: fc.integer({ min: 500, max: 15000 }),
  isProduction: fc.boolean(),
});

describe('Network property-based behaviours', () => {
  it('buildDID always produces a valid Aura DID for known networks', () => {
    fc.assert(
      fc.property(addressArb, networkArb, (address, network) => {
        const did = buildDID(address, network);
        const parsed = parseDID(did);

        return (
          isValidDID(did) &&
          parsed !== null &&
          parsed.network === getNetworkConfig(network).didNetwork &&
          parsed.identifier === address
        );
      })
    );
  });

  it('service endpoints always start with the configured REST base', () => {
    fc.assert(
      fc.property(configArb, (config) => {
        const endpoints = buildServiceEndpoints(config);
        return (
          endpoints.vcRegistry.getVC.startsWith(config.endpoints.rest) &&
          endpoints.identity.getIdentity.startsWith(config.endpoints.rest)
        );
      })
    );
  });
});
