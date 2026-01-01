/**
 * Hook for QR code verification with loading and error states
 */

import { useState, useCallback } from 'react';
import type { VerificationResult, VerificationRequest } from '@aura-network/verifier-sdk';
import { useAuraVerifierContext } from '../context/AuraVerifierContext.js';
import type { VerificationState } from '../types/index.js';

/**
 * Hook for verifying QR codes with loading and error states
 *
 * @param options - Optional verification request options
 * @returns Verification state and functions
 *
 * @example
 * ```tsx
 * function VerifyButton() {
 *   const { result, loading, error, verify, reset } = useVerification();
 *
 *   const handleScan = async (qrData: string) => {
 *     await verify(qrData);
 *   };
 *
 *   if (loading) return <div>Verifying...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *   if (result?.isValid) return <div>Valid!</div>;
 *
 *   return <button onClick={() => handleScan(scannedData)}>Verify</button>;
 * }
 * ```
 */
export function useVerification(
  options?: Partial<Omit<VerificationRequest, 'qrCodeData'>>
): VerificationState {
  const { verifier, isInitialized } = useAuraVerifierContext();
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const verify = useCallback(
    async (qrData: string) => {
      if (!verifier || !isInitialized) {
        setError(new Error('Verifier not initialized'));
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const request: VerificationRequest = {
          qrCodeData: qrData,
          ...options,
        };

        const verificationResult = await verifier.verify(request);
        setResult(verificationResult);
        setError(null);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Verification failed');
        setError(error);
        setResult(null);
      } finally {
        setLoading(false);
      }
    },
    [verifier, isInitialized, options]
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    result,
    loading,
    error,
    verify,
    reset,
  };
}
