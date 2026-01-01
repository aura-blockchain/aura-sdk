/**
 * Verification Result Utilities
 *
 * Provides utility functions for processing and formatting verification results.
 */

import { sha256HashHex } from '../crypto/hash.js';
import {
  VerificationResult,
  DiscloseableAttributes,
  VCVerificationDetail,
} from './types.js';
import { DisclosureContext } from '../qr/types.js';

/**
 * Generate a unique audit ID for a verification
 * @param holderDID - Holder's DID
 * @param presentationId - Presentation ID from QR code
 * @param timestamp - Verification timestamp
 * @returns Unique audit ID
 */
export function generateAuditId(
  holderDID: string,
  presentationId: string,
  timestamp: Date
): string {
  const data = `${holderDID}:${presentationId}:${timestamp.getTime()}`;
  const hash = sha256HashHex(data);
  return `audit-${hash.substring(0, 16)}`;
}

/**
 * Extract disclosed attributes from QR code context
 * @param context - Disclosure context from QR code
 * @param _vcDetails - Verified credential details (for future use)
 * @returns Disclosed attributes object
 */
export function extractAttributes(
  context: DisclosureContext,
  _vcDetails: VCVerificationDetail[]
): DiscloseableAttributes {
  const attributes: DiscloseableAttributes = {};

  // Note: In a real implementation, these values would come from the actual
  // verifiable credentials on-chain. For now, we use the context values
  // which indicate both consent to disclose AND the actual values.

  // Map standard context fields to attribute values
  if (context.show_age_over_21 === true) {
    attributes.ageOver21 = true;
  }
  if (context.show_age_over_18 === true) {
    attributes.ageOver18 = true;
  }
  if (context.show_full_name !== undefined) {
    attributes.fullName = String(context.show_full_name);
  }
  if (context.show_age !== undefined) {
    attributes.age = Number(context.show_age);
  }
  if (context.show_city_state !== undefined) {
    attributes.cityState = String(context.show_city_state);
  }
  if (context.show_full_address !== undefined) {
    attributes.fullAddress = String(context.show_full_address);
  }

  // Extract custom attributes from context
  const customAttributes: Record<string, unknown> = {};
  const standardFields = [
    'show_full_name',
    'show_age',
    'show_age_over_18',
    'show_age_over_21',
    'show_city_state',
    'show_full_address',
  ];

  Object.entries(context).forEach(([key, value]) => {
    if (!standardFields.includes(key) && value !== undefined) {
      customAttributes[key] = value;
    }
  });

  if (Object.keys(customAttributes).length > 0) {
    attributes.customAttributes = customAttributes;
  }

  return attributes;
}

/**
 * Format verification result for display
 * @param result - Verification result
 * @returns Formatted string representation
 */
export function formatVerificationResult(result: VerificationResult): string {
  const lines: string[] = [];

  lines.push('=== Verification Result ===');
  lines.push(`Status: ${result.isValid ? 'VALID ✓' : 'INVALID ✗'}`);
  lines.push(`Holder DID: ${result.holderDID}`);
  lines.push(`Verified At: ${result.verifiedAt.toISOString()}`);
  lines.push(`Audit ID: ${result.auditId}`);
  lines.push(`Method: ${result.verificationMethod.toUpperCase()}`);
  lines.push(`Network Latency: ${result.networkLatency}ms`);

  if (result.verificationError) {
    lines.push(`Error: ${result.verificationError}`);
  }

  lines.push('\n--- Credentials ---');
  result.vcDetails.forEach((vc, index) => {
    lines.push(`\n${index + 1}. ${vc.vcType}`);
    lines.push(`   ID: ${vc.vcId}`);
    lines.push(`   Issuer: ${vc.issuerDID}`);
    lines.push(`   Status: ${vc.status.toUpperCase()}`);
    lines.push(`   Signature: ${vc.signatureValid ? 'Valid ✓' : 'Invalid ✗'}`);
    lines.push(`   On-Chain: ${vc.onChain ? 'Yes' : 'No'}`);

    if (vc.issuedAt) {
      lines.push(`   Issued: ${vc.issuedAt.toISOString()}`);
    }

    if (vc.expiresAt) {
      lines.push(`   Expires: ${vc.expiresAt.toISOString()}`);
    }

    if (vc.txHash) {
      lines.push(`   Tx Hash: ${vc.txHash}`);
    }
  });

  lines.push('\n--- Disclosed Attributes ---');
  const attrs = result.attributes;

  if (attrs.fullName) {
    lines.push(`Full Name: ${attrs.fullName}`);
  }

  if (attrs.age !== undefined) {
    lines.push(`Age: ${attrs.age}`);
  }

  if (attrs.ageOver18 !== undefined) {
    lines.push(`Age Over 18: ${attrs.ageOver18 ? 'Yes' : 'No'}`);
  }

  if (attrs.ageOver21 !== undefined) {
    lines.push(`Age Over 21: ${attrs.ageOver21 ? 'Yes' : 'No'}`);
  }

  if (attrs.cityState) {
    lines.push(`City, State: ${attrs.cityState}`);
  }

  if (attrs.fullAddress) {
    lines.push(`Address: ${attrs.fullAddress}`);
  }

  if (attrs.customAttributes && Object.keys(attrs.customAttributes).length > 0) {
    lines.push('\nCustom Attributes:');
    Object.entries(attrs.customAttributes).forEach(([key, value]) => {
      lines.push(`  ${key}: ${JSON.stringify(value)}`);
    });
  }

  return lines.join('\n');
}

/**
 * Convert verification result to JSON-serializable format
 * @param result - Verification result
 * @returns JSON-safe object
 */
export function serializeVerificationResult(result: VerificationResult): Record<string, unknown> {
  return {
    isValid: result.isValid,
    holderDID: result.holderDID,
    verifiedAt: result.verifiedAt.toISOString(),
    vcDetails: result.vcDetails.map((vc) => ({
      vcId: vc.vcId,
      vcType: vc.vcType,
      issuerDID: vc.issuerDID,
      issuedAt: vc.issuedAt.toISOString(),
      expiresAt: vc.expiresAt?.toISOString(),
      status: vc.status,
      signatureValid: vc.signatureValid,
      onChain: vc.onChain,
      txHash: vc.txHash,
      blockHeight: vc.blockHeight,
    })),
    attributes: result.attributes,
    verificationError: result.verificationError,
    auditId: result.auditId,
    networkLatency: result.networkLatency,
    verificationMethod: result.verificationMethod,
    presentationId: result.presentationId,
    expiresAt: result.expiresAt.toISOString(),
    signatureValid: result.signatureValid,
    metadata: result.metadata,
  };
}

/**
 * Create a minimal verification result (for failures)
 * @param holderDID - Holder's DID
 * @param presentationId - Presentation ID
 * @param error - Error message
 * @param expiresAt - QR code expiration time
 * @returns Verification result indicating failure
 */
export function createFailedResult(
  holderDID: string,
  presentationId: string,
  error: string,
  expiresAt: Date
): VerificationResult {
  return {
    isValid: false,
    holderDID,
    verifiedAt: new Date(),
    vcDetails: [],
    attributes: {},
    verificationError: error,
    auditId: generateAuditId(holderDID, presentationId, new Date()),
    networkLatency: 0,
    verificationMethod: 'offline',
    presentationId,
    expiresAt,
    signatureValid: false,
  };
}

/**
 * Create a quick failed verification result with minimal info
 * Use when only error message is available (e.g., batch verification errors)
 *
 * @param error - Error message
 * @returns Verification result indicating failure with placeholder values
 */
export function createQuickErrorResult(error: string): VerificationResult {
  const now = new Date();
  return {
    isValid: false,
    holderDID: 'unknown',
    verifiedAt: now,
    vcDetails: [],
    attributes: {},
    verificationError: error,
    auditId: `err_${now.getTime()}_${Math.random().toString(36).substring(2, 10)}`,
    networkLatency: 0,
    verificationMethod: 'offline',
    presentationId: 'unknown',
    expiresAt: now,
    signatureValid: false,
  };
}

/**
 * Create a successful verification result
 * @param holderDID - Holder's DID
 * @param presentationId - Presentation ID
 * @param vcDetails - Verified credential details
 * @param attributes - Disclosed attributes
 * @param expiresAt - QR code expiration time
 * @param networkLatency - Network latency in ms
 * @param method - Verification method used
 * @param signatureValid - Whether signature is valid
 * @returns Verification result indicating success
 */
export function createSuccessResult(
  holderDID: string,
  presentationId: string,
  vcDetails: VCVerificationDetail[],
  attributes: DiscloseableAttributes,
  expiresAt: Date,
  networkLatency: number,
  method: 'online' | 'offline' | 'cached',
  signatureValid: boolean
): VerificationResult {
  const timestamp = new Date();

  return {
    isValid: true,
    holderDID,
    verifiedAt: timestamp,
    vcDetails,
    attributes,
    auditId: generateAuditId(holderDID, presentationId, timestamp),
    networkLatency,
    verificationMethod: method,
    presentationId,
    expiresAt,
    signatureValid,
  };
}

/**
 * Validate that all required VCs are present in the result
 * @param result - Verification result
 * @param requiredTypes - Required VC types
 * @returns True if all required types are present
 */
export function hasRequiredVCTypes(
  result: VerificationResult,
  requiredTypes: string[]
): boolean {
  const presentTypes = new Set(result.vcDetails.map((vc) => vc.vcType.toString()));
  return requiredTypes.every((type) => presentTypes.has(type));
}

/**
 * Calculate verification score (0-100)
 * Based on multiple factors: credential validity, signature, on-chain presence, etc.
 * @param result - Verification result
 * @returns Score from 0 to 100
 */
export function calculateVerificationScore(result: VerificationResult): number {
  if (!result.isValid) {
    return 0;
  }

  let score = 0;

  // Base score for being valid
  score += 30;

  // Signature validity
  if (result.signatureValid) {
    score += 20;
  }

  // Credential quality
  const validVCs = result.vcDetails.filter(
    (vc) => vc.signatureValid && vc.status === 'active'
  );
  const vcScore = (validVCs.length / Math.max(result.vcDetails.length, 1)) * 30;
  score += vcScore;

  // On-chain presence
  const onChainVCs = result.vcDetails.filter((vc) => vc.onChain);
  const onChainScore = (onChainVCs.length / Math.max(result.vcDetails.length, 1)) * 20;
  score += onChainScore;

  return Math.min(Math.round(score), 100);
}

/**
 * Check if verification result indicates a trusted identity
 * @param result - Verification result
 * @param minScore - Minimum score threshold (default: 80)
 * @returns True if identity is trusted
 */
export function isTrustedIdentity(result: VerificationResult, minScore = 80): boolean {
  const score = calculateVerificationScore(result);
  return score >= minScore;
}

/**
 * Extract summary statistics from verification result
 * @param result - Verification result
 * @returns Summary statistics
 */
export function getVerificationSummary(result: VerificationResult): {
  totalCredentials: number;
  validCredentials: number;
  revokedCredentials: number;
  expiredCredentials: number;
  onChainCredentials: number;
  score: number;
} {
  const validVCs = result.vcDetails.filter(
    (vc) => vc.signatureValid && vc.status === 'active'
  );
  const revokedVCs = result.vcDetails.filter((vc) => vc.status === 'revoked');
  const expiredVCs = result.vcDetails.filter((vc) => vc.status === 'expired');
  const onChainVCs = result.vcDetails.filter((vc) => vc.onChain);

  return {
    totalCredentials: result.vcDetails.length,
    validCredentials: validVCs.length,
    revokedCredentials: revokedVCs.length,
    expiredCredentials: expiredVCs.length,
    onChainCredentials: onChainVCs.length,
    score: calculateVerificationScore(result),
  };
}
