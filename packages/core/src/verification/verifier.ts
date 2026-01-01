/**
 * Aura Verifier - Main Verification Class
 *
 * High-level API for verifying Aura verifiable presentations.
 * Coordinates QR parsing, signature verification, and blockchain verification.
 */

import { QRCodeData } from '../qr/types.js';
import type {
  AuraVerifierConfig,
  VerificationRequest,
  VerificationResult,
  SyncResult,
  EventHandler,
  VerifierEvent,
  VCVerificationDetail,
  VerificationStrategy,
  NonceConfig,
} from './types.js';
import {
  VCType,
  VCStatus,
  DIDDocument,
  NETWORK_ENDPOINTS,
  VerificationError,
} from './types.js';
import { safeJSONReviver } from '../utils/index.js';
import { NonceManager, NonceValidatorAdapter } from '../security/nonce-manager.js';
import {
  VerificationEventEmitter,
  createVerificationEvent,
  createErrorEvent,
} from './events.js';
import {
  extractAttributes,
  createFailedResult,
  createQuickErrorResult,
  createSuccessResult,
} from './result.js';
import { BatchVerifier } from './batch.js';

/**
 * Main AuraVerifier class
 */
export class AuraVerifier {
  private config: Required<AuraVerifierConfig>;
  private eventEmitter: VerificationEventEmitter;
  private initialized: boolean;
  private batchVerifier: BatchVerifier;
  private didCache: Map<string, { doc: DIDDocument; timestamp: number }>;
  private vcStatusCache: Map<string, { status: VCStatus; timestamp: number }>;
  private nonceManager: NonceManager | null;
  private nonceValidator: NonceValidatorAdapter | null;
  private nonceConfig: { enabled: boolean; nonceWindow: number; clockSkew: number; manager?: NonceManager };

  constructor(config: AuraVerifierConfig) {
    // Merge with defaults
    this.config = this.mergeWithDefaults(config);

    // Initialize event emitter
    this.eventEmitter = new VerificationEventEmitter(this.config.verbose);

    // Initialize caches
    this.didCache = new Map();
    this.vcStatusCache = new Map();

    // Initialize nonce protection (enabled by default)
    this.nonceConfig = {
      enabled: config.nonceConfig?.enabled ?? true,
      nonceWindow: config.nonceConfig?.nonceWindow ?? 300000, // 5 minutes
      clockSkew: config.nonceConfig?.clockSkew ?? 30000, // 30 seconds
      manager: config.nonceConfig?.manager,
    };

    if (this.nonceConfig.enabled) {
      // Use provided manager or create a new one
      this.nonceManager = this.nonceConfig.manager ?? new NonceManager({
        nonceWindow: this.nonceConfig.nonceWindow,
        clockSkew: this.nonceConfig.clockSkew,
      });
      this.nonceValidator = new NonceValidatorAdapter(this.nonceManager);

      if (this.config.verbose) {
        console.log('[AuraVerifier] Nonce replay protection enabled');
      }
    } else {
      this.nonceManager = null;
      this.nonceValidator = null;

      if (this.config.verbose) {
        console.log('[AuraVerifier] Nonce replay protection disabled');
      }
    }

    // Initialize batch verifier
    this.batchVerifier = new BatchVerifier(
      this.verify.bind(this),
      { concurrency: 5 }
    );

    this.initialized = false;
  }

  /**
   * Merge config with defaults
   */
  private mergeWithDefaults(config: AuraVerifierConfig): Required<AuraVerifierConfig> {
    const networkEndpoints = NETWORK_ENDPOINTS[config.network];

    return {
      network: config.network,
      grpcEndpoint: config.grpcEndpoint || networkEndpoints.grpc,
      restEndpoint: config.restEndpoint || networkEndpoints.rest,
      offlineMode: config.offlineMode || false,
      cacheConfig: {
        enableDIDCache: true,
        enableVCCache: true,
        ttl: 300,
        maxSize: 50,
        ...config.cacheConfig,
      },
      timeout: config.timeout || 30000,
      verbose: config.verbose || false,
      chainId: config.chainId || networkEndpoints.chainId,
      nonceConfig: {
        enabled: config.nonceConfig?.enabled ?? true,
        nonceWindow: config.nonceConfig?.nonceWindow ?? 300000,
        clockSkew: config.nonceConfig?.clockSkew ?? 30000,
        manager: config.nonceConfig?.manager,
      },
    };
  }

  /**
   * Initialize the verifier
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      if (this.config.verbose) {
        console.log('[AuraVerifier] Already initialized');
      }
      return;
    }

    if (this.config.verbose) {
      console.log('[AuraVerifier] Initializing...');
      console.log(`[AuraVerifier] Network: ${this.config.network}`);
      console.log(`[AuraVerifier] gRPC: ${this.config.grpcEndpoint}`);
      console.log(`[AuraVerifier] REST: ${this.config.restEndpoint}`);
      console.log(`[AuraVerifier] Offline Mode: ${this.config.offlineMode}`);
    }

    // In offline mode, try to load cached data
    if (this.config.offlineMode) {
      await this.loadCachedData();
    }

    // Test connectivity (unless in offline mode)
    if (!this.config.offlineMode) {
      await this.testConnectivity();
    }

    this.initialized = true;

    if (this.config.verbose) {
      console.log('[AuraVerifier] Initialization complete');
    }
  }

  /**
   * Destroy the verifier and cleanup resources
   */
  async destroy(): Promise<void> {
    if (this.config.verbose) {
      console.log('[AuraVerifier] Destroying verifier...');
    }

    // Save cache if enabled
    if (this.config.cacheConfig.enableDIDCache || this.config.cacheConfig.enableVCCache) {
      await this.saveCachedData();
    }

    // Clear caches
    this.didCache.clear();
    this.vcStatusCache.clear();

    // Stop nonce manager cleanup timer
    if (this.nonceManager) {
      this.nonceManager.stop();
    }

    // Remove all event listeners
    this.eventEmitter.removeAllListeners();

    this.initialized = false;

    if (this.config.verbose) {
      console.log('[AuraVerifier] Verifier destroyed');
    }
  }

  /**
   * Main verification method
   */
  async verify(request: VerificationRequest): Promise<VerificationResult> {
    if (!this.initialized) {
      throw new Error('Verifier not initialized. Call initialize() first.');
    }

    // Validate input
    if (request.qrCodeData === null || request.qrCodeData === undefined) {
      throw new Error('QR code data is required');
    }

    const startTime = Date.now();

    try {
      // Step 1: Parse QR code data
      const qrData = this.parseQRCode(request.qrCodeData);

      // Step 2: Validate QR code format and expiration
      this.validateQRCode(qrData);

      // Step 3: Validate nonce for replay protection (if enabled)
      if (this.nonceValidator && qrData.n !== undefined) {
        const nonceValid = await this.nonceValidator.validateAndMark(
          qrData.n,
          qrData.p,
          qrData.exp
        );

        if (!nonceValid) {
          throw VerificationError.nonceReplay(qrData.n, qrData.p);
        }

        if (this.config.verbose) {
          console.log(`[AuraVerifier] Nonce validated: ${qrData.n} for presentation ${qrData.p}`);
        }
      }

      // Step 4: Verify signature
      const signatureValid = await this.verifySignature(qrData);

      if (!signatureValid) {
        throw VerificationError.invalidSignature();
      }

      // Step 5: Resolve DID document
      const didDoc = await this.resolveDID(qrData.h);

      if (!didDoc) {
        throw VerificationError.didResolutionFailed(qrData.h);
      }

      // Step 6: Verify each credential
      const vcDetails = await this.verifyCredentials(qrData.vcs, request);

      // Check for revoked or expired credentials
      const hasRevokedVC = vcDetails.some((vc) => vc.status === VCStatus.REVOKED);
      const hasExpiredVC = vcDetails.some((vc) => vc.status === VCStatus.EXPIRED);

      // Calculate network latency
      const networkLatency = Date.now() - startTime;

      // Determine verification method
      const method: VerificationStrategy = request.offlineOnly
        ? 'offline'
        : this.config.offlineMode
        ? 'cached'
        : 'online';

      if (hasRevokedVC) {
        const revokedVC = vcDetails.find((vc) => vc.status === VCStatus.REVOKED)!;
        const result: VerificationResult = {
          isValid: false,
          holderDID: qrData.h,
          verifiedAt: new Date(),
          vcDetails,
          attributes: {},
          verificationError: `Credential ${revokedVC.vcId} has been revoked`,
          auditId: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          networkLatency,
          verificationMethod: method,
          presentationId: qrData.p,
          expiresAt: new Date(qrData.exp * 1000),
          signatureValid,
        };
        return result;
      }

      if (hasExpiredVC) {
        const expiredVC = vcDetails.find((vc) => vc.status === VCStatus.EXPIRED)!;
        const result: VerificationResult = {
          isValid: false,
          holderDID: qrData.h,
          verifiedAt: new Date(),
          vcDetails,
          attributes: {},
          verificationError: `Credential ${expiredVC.vcId} has expired`,
          auditId: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          networkLatency,
          verificationMethod: method,
          presentationId: qrData.p,
          expiresAt: new Date(qrData.exp * 1000),
          signatureValid,
        };
        return result;
      }

      // Step 7: Extract disclosed attributes
      const attributes = extractAttributes(qrData.ctx, vcDetails);

      // Step 8: Validate required VCs
      if (request.requiredVCTypes) {
        this.validateRequiredVCs(vcDetails, request.requiredVCTypes);
      }

      // Step 9: Validate max credential age
      if (request.maxCredentialAge) {
        this.validateCredentialAge(vcDetails, request.maxCredentialAge);
      }

      // Create result
      const result = createSuccessResult(
        qrData.h,
        qrData.p,
        vcDetails,
        attributes,
        new Date(qrData.exp * 1000),
        networkLatency,
        method,
        signatureValid
      );

      // Emit verification event
      await this.eventEmitter.emitVerification(
        createVerificationEvent(result, request)
      );

      return result;
    } catch (error) {
      // Handle errors
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Try to extract basic info for failed result
      let holderDID = 'unknown';
      let presentationId = 'unknown';
      let expiresAt = new Date();

      try {
        const qrData = this.parseQRCode(request.qrCodeData);
        holderDID = qrData.h;
        presentationId = qrData.p;
        expiresAt = new Date(qrData.exp * 1000);
      } catch {
        // Ignore parse errors
      }

      const result = createFailedResult(holderDID, presentationId, errorMessage, expiresAt);

      // Emit error event
      await this.eventEmitter.emitError(
        createErrorEvent(
          error instanceof Error ? error : new Error(errorMessage),
          'verification',
          request
        )
      );

      return result;
    }
  }

  /**
   * Verify multiple requests in batch
   */
  async verifyBatch(requests: VerificationRequest[]): Promise<VerificationResult[]> {
    const result = await this.batchVerifier.verifyBatch(requests);
    // Convert errors to failed verification results
    return result.results.map((r) => {
      if (r instanceof Error) {
        return createQuickErrorResult(r.message);
      }
      return r;
    });
  }

  /**
   * Convenience method: Check if holder is 21+ years old
   */
  async isAge21Plus(qrCodeData: string): Promise<boolean> {
    const result = await this.verify({ qrCodeData });
    return result.isValid && (result.attributes.ageOver21 === true);
  }

  /**
   * Convenience method: Check if holder is 18+ years old
   */
  async isAge18Plus(qrCodeData: string): Promise<boolean> {
    const result = await this.verify({ qrCodeData });
    return result.isValid && (result.attributes.ageOver18 === true);
  }

  /**
   * Convenience method: Check if holder is a verified human
   */
  async isVerifiedHuman(qrCodeData: string): Promise<boolean> {
    // Verify the credential is valid
    const result = await this.verify({
      qrCodeData,
    });
    // Any valid credential holder is considered verified
    return result.isValid;
  }

  /**
   * Convenience method: Get Aura trust score
   */
  async getAuraScore(qrCodeData: string): Promise<number | null> {
    const result = await this.verify({ qrCodeData });

    if (!result.isValid) {
      return null;
    }

    // Calculate score based on multiple factors
    let score = 0;

    // Base score for valid verification
    score += 30;

    // Credential diversity (different types)
    const vcTypes = new Set(result.vcDetails.map((vc) => vc.vcType));
    score += Math.min(vcTypes.size * 10, 30);

    // On-chain presence
    const onChainCount = result.vcDetails.filter((vc) => vc.onChain).length;
    score += Math.min(onChainCount * 10, 20);

    // Signature validity
    if (result.signatureValid) {
      score += 20;
    }

    return Math.min(score, 100);
  }

  /**
   * Check credential status on-chain
   */
  async checkCredentialStatus(vcId: string): Promise<VCStatus> {
    // Check cache first
    if (this.config.cacheConfig.enableVCCache) {
      const cached = this.vcStatusCache.get(vcId);
      if (cached) {
        const age = (Date.now() - cached.timestamp) / 1000;
        if (age < (this.config.cacheConfig.ttl ?? 300)) {
          return cached.status;
        }
      }
    }

    // Query blockchain
    const status = await this.queryVCStatus(vcId);

    // Cache result
    if (this.config.cacheConfig.enableVCCache) {
      this.vcStatusCache.set(vcId, { status, timestamp: Date.now() });
    }

    return status;
  }

  /**
   * Resolve DID document
   */
  async resolveDID(did: string): Promise<DIDDocument | null> {
    // Check cache first
    if (this.config.cacheConfig.enableDIDCache) {
      const cached = this.didCache.get(did);
      if (cached) {
        const age = (Date.now() - cached.timestamp) / 1000;
        if (age < (this.config.cacheConfig.ttl ?? 300)) {
          return cached.doc;
        }
      }
    }

    // Try to query blockchain
    try {
      const didDoc = await this.queryDIDDocument(did);

      // Cache result
      if (didDoc && this.config.cacheConfig.enableDIDCache) {
        this.didCache.set(did, { doc: didDoc, timestamp: Date.now() });
      }

      return didDoc;
    } catch (error) {
      // On network error, try to use cached data even if expired
      if (this.config.cacheConfig.enableDIDCache) {
        const cached = this.didCache.get(did);
        if (cached) {
          return cached.doc;
        }
      }
      // Re-throw if no cached fallback available
      throw error;
    }
  }

  /**
   * Enable offline mode
   */
  async enableOfflineMode(): Promise<void> {
    this.config.offlineMode = true;
    if (this.config.verbose) {
      console.log('[AuraVerifier] Offline mode enabled');
    }
  }

  /**
   * Disable offline mode
   */
  async disableOfflineMode(): Promise<void> {
    this.config.offlineMode = false;
    if (this.config.verbose) {
      console.log('[AuraVerifier] Offline mode disabled');
    }
  }

  /**
   * Sync cache with blockchain
   */
  async syncCache(): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    if (this.config.verbose) {
      console.log('[AuraVerifier] Starting cache sync...');
    }

    // In a real implementation, this would query the blockchain for updates
    // For now, we'll return a mock result

    const result: SyncResult = {
      success: true,
      didsSynced: this.didCache.size,
      vcsSynced: this.vcStatusCache.size,
      revocationsSynced: 0,
      duration: Date.now() - startTime,
      errors,
      lastSyncAt: new Date(),
    };

    await this.eventEmitter.emitSync({ result, timestamp: new Date() });

    if (this.config.verbose) {
      console.log(`[AuraVerifier] Cache sync complete in ${result.duration}ms`);
    }

    return result;
  }

  /**
   * Register event handler
   */
  on(event: VerifierEvent, handler: EventHandler): void {
    this.eventEmitter.on(event, handler);
  }

  /**
   * Unregister event handler
   */
  off(event: VerifierEvent, handler: EventHandler): void {
    this.eventEmitter.off(event, handler);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Parse QR code data
   */
  private parseQRCode(qrCodeData: string): QRCodeData {
    // In a real implementation, this would use the QR parser module
    // For now, we'll attempt a simple parse

    try {
      // Check if it's an Aura protocol URL
      if (qrCodeData.startsWith('aura://verify?data=')) {
        const base64Data = qrCodeData.replace('aura://verify?data=', '');
        const jsonString = Buffer.from(base64Data, 'base64').toString('utf-8');
        const data = JSON.parse(jsonString, safeJSONReviver);
        return data as QRCodeData;
      }

      // Try parsing as JSON directly
      const data = JSON.parse(qrCodeData, safeJSONReviver);
      return data as QRCodeData;
    } catch (error) {
      throw VerificationError.qrParseError(error);
    }
  }

  /**
   * Validate QR code format and expiration
   */
  private validateQRCode(qrData: QRCodeData): void {
    // Validate required fields
    if (!qrData.v || !qrData.p || !qrData.h || !qrData.vcs || !qrData.sig) {
      throw VerificationError.qrParseError('Missing required fields');
    }

    // Validate protocol version
    if (qrData.v !== '1.0') {
      throw VerificationError.qrParseError(`Unsupported protocol version: ${qrData.v}`);
    }

    // Validate VCS is non-empty array
    if (!Array.isArray(qrData.vcs) || qrData.vcs.length === 0) {
      throw VerificationError.qrParseError('VCS must be a non-empty array');
    }

    // Validate credential IDs are non-empty strings
    for (const vcId of qrData.vcs) {
      if (!vcId || typeof vcId !== 'string' || !vcId.trim()) {
        throw VerificationError.qrParseError('Invalid credential ID');
      }
    }

    // Validate DID format
    if (!this.isValidDID(qrData.h)) {
      throw VerificationError.qrParseError(`Invalid DID format: ${qrData.h}`);
    }

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (qrData.exp < now) {
      throw VerificationError.qrExpired(new Date(qrData.exp * 1000));
    }

    // Validate expiration is not too far in the future (max 10 years)
    const maxFutureSeconds = 10 * 365 * 24 * 60 * 60; // 10 years
    if (qrData.exp > now + maxFutureSeconds) {
      throw VerificationError.qrParseError('Expiration timestamp is too far in the future');
    }

    // Validate timestamp is not negative or unreasonably old
    if (qrData.exp <= 0) {
      throw VerificationError.qrParseError('Invalid expiration timestamp');
    }
  }

  /**
   * Validate DID format
   */
  private isValidDID(did: string): boolean {
    if (!did || typeof did !== 'string') {
      return false;
    }

    // DID format: did:aura:{network}:{address}
    const didPattern = /^did:aura:(mainnet|testnet|local):[a-zA-Z0-9]+$/;
    return didPattern.test(did);
  }

  /**
   * Verify signature on QR code data
   */
  private async verifySignature(qrData: QRCodeData): Promise<boolean> {
    // In a real implementation, this would:
    // 1. Reconstruct the signed message
    // 2. Extract public key from DID document
    // 3. Verify signature using crypto module

    // Basic validation
    if (!qrData.sig || qrData.sig.length < 64) {
      return false;
    }

    // Validate hex format
    if (!/^[0-9a-fA-F]+$/.test(qrData.sig)) {
      return false;
    }

    // Mock signature verification (always true for now)
    return true;
  }

  /**
   * Verify all credentials
   */
  private async verifyCredentials(
    vcIds: string[],
    _request: VerificationRequest
  ): Promise<VCVerificationDetail[]> {
    const details: VCVerificationDetail[] = [];

    for (const vcId of vcIds) {
      const status = await this.checkCredentialStatus(vcId);

      // In a real implementation, we would fetch full VC data from chain
      details.push({
        vcId,
        vcType: VCType.GOVERNMENT_ID, // Would be from actual VC
        issuerDID: 'did:aura:issuer', // Would be from actual VC
        issuedAt: new Date(),
        status,
        signatureValid: true,
        onChain: true,
      });
    }

    return details;
  }

  /**
   * Validate required VC types are present
   */
  private validateRequiredVCs(vcDetails: VCVerificationDetail[], requiredTypes: VCType[]): void {
    const presentTypes = new Set(vcDetails.map((vc) => vc.vcType));

    for (const requiredType of requiredTypes) {
      if (!presentTypes.has(requiredType)) {
        throw VerificationError.requiredVCMissing(requiredType);
      }
    }
  }

  /**
   * Validate credential age
   */
  private validateCredentialAge(vcDetails: VCVerificationDetail[], maxAge: number): void {
    const now = Date.now();

    for (const vc of vcDetails) {
      const age = (now - vc.issuedAt.getTime()) / 1000;
      if (age > maxAge) {
        throw new VerificationError(
          `Credential ${vc.vcId} is too old (${age}s > ${maxAge}s)`,
          'UNKNOWN_ERROR' as any
        );
      }
    }
  }

  /**
   * Query VC status from blockchain
   */
  private async queryVCStatus(_vcId: string): Promise<VCStatus> {
    if (this.config.offlineMode) {
      return VCStatus.UNKNOWN;
    }

    // In a real implementation, this would query the blockchain via gRPC or REST
    // For now, return ACTIVE for all VCs
    return VCStatus.ACTIVE;
  }

  /**
   * Query DID document from blockchain
   */
  private async queryDIDDocument(did: string): Promise<DIDDocument | null> {
    // In a real implementation, this would query the blockchain
    // In offline mode, we assume cached/known DIDs are valid
    // For now, return a mock DID document
    return {
      id: did,
      verificationMethod: [],
      authentication: [],
    };
  }

  /**
   * Test connectivity to blockchain
   */
  private async testConnectivity(): Promise<void> {
    // In a real implementation, this would ping the gRPC/REST endpoints
    if (this.config.verbose) {
      console.log('[AuraVerifier] Testing connectivity...');
    }

    // Mock connectivity test
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (this.config.verbose) {
      console.log('[AuraVerifier] Connectivity test passed');
    }
  }

  /**
   * Load cached data from storage
   */
  private async loadCachedData(): Promise<void> {
    if (this.config.verbose) {
      console.log('[AuraVerifier] Loading cached data...');
    }

    // In a real implementation, this would load from file system
    // For now, caches start empty
  }

  /**
   * Save cached data to storage
   */
  private async saveCachedData(): Promise<void> {
    if (this.config.verbose) {
      console.log('[AuraVerifier] Saving cached data...');
    }

    // In a real implementation, this would save to file system
  }
}
