import { describe, it, expect, beforeEach } from 'vitest';
import { AuraClient } from '../AuraClient';
import { CredentialStatus, NetworkType } from '../../types';

describe('AuraClient', () => {
  let client: AuraClient;

  beforeEach(() => {
    client = new AuraClient({ network: NetworkType.TESTNET });
  });

  it('connects and disconnects', async () => {
    expect(client.isConnected()).toBe(false);
    await client.connect();
    expect(client.isConnected()).toBe(true);
    await client.disconnect();
    expect(client.isConnected()).toBe(false);
  });

  it('maps chain ids per network', async () => {
    expect(client.getChainId()).toBe('aura-mvp-1');
    const mainnet = new AuraClient({ network: NetworkType.MAINNET });
    expect(mainnet.getChainId()).toBe('aura-mvp-1');
    const devnet = new AuraClient({ network: NetworkType.DEVNET });
    expect(devnet.getChainId()).toBe('aura-devnet-1');
  });

  it('returns balances when connected', async () => {
    await client.connect();
    const balances = await client.queryBalance('addr');
    expect(balances).toHaveLength(2);
    const uaura = await client.queryBalanceByDenom('addr', 'uaura');
    expect(uaura?.denom).toBe('uaura');
  });

  it('returns empty balance list for empty address', async () => {
    await client.connect();
    const balances = await client.queryBalance('');
    expect(balances).toEqual([]);
  });

  it('throws when querying while disconnected', async () => {
    await expect(client.queryBalance('addr')).rejects.toThrow('Client not connected');
    await expect(client.queryCredential('vc1')).rejects.toThrow('Client not connected');
  });

  it('creates and verifies credentials', async () => {
    await client.connect();
    const cred = await client.queryCredential('vc:new');
    expect(cred.id).toBe('vc:new');
    const result = await client.verifyCredential(cred);
    expect(result.verified).toBe(true);
    const status = await client.getCredentialStatus(cred.id);
    expect(status).toBe(CredentialStatus.VALID);
  });

  it('marks revoked or expired credentials as invalid', async () => {
    await client.connect();
    const revoked = {
      id: 'vc:revoked',
      issuer: 'did:aura:issuer',
      subject: 'did:aura:subject',
      issuanceDate: new Date().toISOString(),
      status: CredentialStatus.REVOKED,
    };
    const res1 = await client.verifyCredential(revoked);
    expect(res1.verified).toBe(false);
    expect(res1.reason).toBe('revoked');

    const expired = {
      ...revoked,
      id: 'vc:expired',
      status: CredentialStatus.VALID,
      expirationDate: new Date(Date.now() - 1000).toISOString(),
    };
    const res2 = await client.verifyCredential(expired);
    expect(res2.verified).toBe(false);
    expect(res2.reason).toBe('expired');
  });

  it('builds presentations and verifies/submits them', async () => {
    await client.connect();
    const request = {
      requestedCredentials: [{ type: 'University', required: true }],
      challenge: 'ch',
      domain: 'd',
    };
    const presentation = await client.createPresentation(['vc:1'], request as any);
    expect(presentation.verifiableCredential).toHaveLength(1);

    const submit = await client.submitPresentation(presentation);
    expect(submit.accepted).toBe(true);

    const verify = await client.verifyPresentation(presentation);
    expect(verify.verified).toBe(true);
  });
});
