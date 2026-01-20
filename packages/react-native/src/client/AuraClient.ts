import {
  Credential,
  CredentialStatus,
  VerificationResult,
  Balance,
  NetworkType,
  PresentationRequest,
  PresentationSubmissionResult,
} from '../types';

export interface AuraClientOptions {
  endpoint?: string;
  network?: NetworkType;
}

const mockBalances: Balance[] = [
  { denom: 'uaura', amount: '1000000' },
  { denom: 'stake', amount: '500000' },
];

const credentialStore = new Map<string, Credential>();

export class AuraClient {
  private connected = false;
  readonly endpoint: string;
  readonly network: NetworkType;

  constructor(opts?: AuraClientOptions) {
    this.endpoint = opts?.endpoint ?? 'https://testnet-api.aurablockchain.org';
    this.network = opts?.network ?? NetworkType.TESTNET;
  }

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getChainId(): string {
    switch (this.network) {
      case NetworkType.MAINNET:
        return 'aura-mvp-1';
      case NetworkType.DEVNET:
        return 'aura-devnet-1';
      default:
        return 'aura-mvp-1';
    }
  }

  async queryBalance(address: string): Promise<Balance[]> {
    if (!this.connected) throw new Error('Client not connected');
    if (!address) return [];
    return mockBalances;
  }

  async queryBalanceByDenom(address: string, denom: string): Promise<Balance | null> {
    const balances = await this.queryBalance(address);
    return balances.find((b) => b.denom === denom) ?? null;
  }

  async queryCredential(id: string): Promise<Credential> {
    if (!this.connected) throw new Error('Client not connected');
    const existing = credentialStore.get(id);
    if (existing) return existing;
    const cred: Credential = {
      id,
      issuer: 'did:aura:issuer',
      subject: 'did:aura:subject',
      issuanceDate: new Date().toISOString(),
      status: CredentialStatus.VALID,
    };
    credentialStore.set(id, cred);
    return cred;
  }

  async verifyCredential(credential: Credential | string): Promise<VerificationResult> {
    if (!this.connected) throw new Error('Client not connected');
    const cred =
      typeof credential === 'string' ? await this.queryCredential(credential) : credential;
    const expired = cred.expirationDate ? new Date(cred.expirationDate) < new Date() : false;
    const revoked = cred.status === CredentialStatus.REVOKED;
    const verified = !expired && !revoked;
    return {
      verified,
      credential: cred,
      checks: ['signature', 'expiration', 'revocation'],
      reason: verified ? undefined : revoked ? 'revoked' : 'expired',
    };
  }

  async getCredentialStatus(id: string): Promise<CredentialStatus> {
    const cred = await this.queryCredential(id);
    return cred.status ?? CredentialStatus.VALID;
  }

  async createPresentation(
    credentialIds: string[],
    request: PresentationRequest
  ): Promise<Record<string, unknown>> {
    return {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiablePresentation'],
      verifiableCredential: await Promise.all(credentialIds.map((id) => this.queryCredential(id))),
      holder: request.requestedCredentials?.[0]?.type ?? 'did:aura:holder',
      proof: {
        type: 'Ed25519Signature2020',
        created: new Date().toISOString(),
        proofPurpose: 'authentication',
        verificationMethod: 'did:aura:holder#key-1',
        challenge: request.challenge ?? 'challenge',
        domain: request.domain ?? 'aura',
      },
    };
  }

  async submitPresentation(_presentation: unknown): Promise<PresentationSubmissionResult> {
    return { accepted: true };
  }

  async verifyPresentation(_presentation: unknown): Promise<{ verified: boolean }> {
    return { verified: true };
  }
}
