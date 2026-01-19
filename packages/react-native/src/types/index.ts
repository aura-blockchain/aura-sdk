export enum NetworkType {
  MAINNET = 'mainnet',
  TESTNET = 'testnet',
  DEVNET = 'devnet',
}

export interface Balance {
  denom: string;
  amount: string;
}

export enum CredentialStatus {
  VALID = 'valid',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
  SUSPENDED = 'suspended',
}

export interface Credential {
  id: string;
  issuer: string;
  subject: string;
  issuanceDate?: string;
  expirationDate?: string;
  status?: CredentialStatus;
  credentialSubject?: Record<string, unknown>;
  proof?: Record<string, unknown>;
}

export interface VerificationResult {
  verified: boolean;
  checks: string[];
  credential?: Credential;
  reason?: string;
}

export interface PresentationRequest {
  id: string;
  verifier: string;
  requestedCredentials: Array<{ type: string; required: boolean; constraints?: Record<string, unknown> }>;
  challenge?: string;
  domain?: string;
}

export interface PresentationSubmissionResult {
  accepted: boolean;
  details?: Record<string, unknown>;
}

export interface WalletData {
  address: string;
  did: string;
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}
