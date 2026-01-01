import crypto from 'crypto';

/**
 * Verify webhook signature using HMAC-SHA256
 * @param payload - The raw request body
 * @param signature - The signature from the request header
 * @param secret - The webhook secret key
 * @returns True if signature is valid
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    // Remove 'sha256=' prefix if present
    const signatureValue = signature.startsWith('sha256=')
      ? signature.substring(7)
      : signature;

    // Compute expected signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signatureValue, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    // If any error occurs (e.g., invalid hex), signature is invalid
    return false;
  }
}

/**
 * Generate webhook signature for testing
 * @param payload - The request body
 * @param secret - The webhook secret key
 * @returns The generated signature with 'sha256=' prefix
 */
export function generateWebhookSignature(payload: string, secret: string): string {
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return `sha256=${signature}`;
}

/**
 * Generate a random webhook secret
 * @param length - The length of the secret in bytes (default: 32)
 * @returns A random hex string
 */
export function generateWebhookSecret(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}
