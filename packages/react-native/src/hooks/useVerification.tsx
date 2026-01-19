import { useState, useCallback } from 'react';
import { useAuraClient } from './useAuraClient';
import { PresentationRequest, PresentationSubmissionResult } from '../types';

export function useVerification() {
  const { client } = useAuraClient();
  const [presentation, setPresentation] = useState<Record<string, unknown> | null>(null);
  const [pendingRequest, setPendingRequest] = useState<PresentationRequest | null>(null);
  const [submissionResult, setSubmissionResult] = useState<PresentationSubmissionResult | null>(null);
  const [verificationResult, setVerificationResult] = useState<{ verified: boolean } | null>(null);
  const [availabilityCheck, setAvailabilityCheck] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const createPresentation = useCallback(
    async (credentialIds: string[], request: PresentationRequest) => {
      if (!client) return;
      try {
        const pres = await client.createPresentation(credentialIds, request);
        setPresentation(pres);
        setPendingRequest(request);
        setError(null);
      } catch (err) {
        setError(err as Error);
      }
    },
    [client]
  );

  const createSelectivePresentation = useCallback(
    async (selective: { credentialId: string; disclosedFields: string[] }[], request: PresentationRequest) => {
      const ids = selective.map((s) => s.credentialId);
      await createPresentation(ids, request);
    },
    [createPresentation]
  );

  const submitPresentation = useCallback(async () => {
    if (!client || !presentation) return;
    try {
      const res = await client.submitPresentation(presentation);
      setSubmissionResult(res);
      setError(null);
    } catch (err) {
      setError(err as Error);
    }
  }, [client, presentation]);

  const verifyPresentation = useCallback(async (pres: unknown) => {
    if (!client) return;
    try {
      const res = await client.verifyPresentation(pres);
      setVerificationResult(res);
      setError(null);
    } catch (err) {
      setError(err as Error);
    }
  }, [client]);

  const parseVerificationRequest = useCallback((qrData: string) => {
    try {
      const parsed = JSON.parse(qrData) as PresentationRequest;
      setPendingRequest(parsed);
      setError(null);
    } catch (err) {
      setError(err as Error);
    }
  }, []);

  const checkCredentialAvailability = useCallback((request: PresentationRequest) => {
    // For now, mark all requested credentials as available
    const availability = request.requestedCredentials.map((rc) => ({ type: rc.type, available: true }));
    setAvailabilityCheck({ availability });
  }, []);

  const reset = useCallback(() => {
    setPresentation(null);
    setPendingRequest(null);
    setSubmissionResult(null);
    setVerificationResult(null);
    setAvailabilityCheck(null);
    setError(null);
  }, []);

  return {
    presentation,
    pendingRequest,
    submissionResult,
    verificationResult,
    availabilityCheck,
    error,
    createPresentation,
    createSelectivePresentation,
    submitPresentation,
    verifyPresentation,
    parseVerificationRequest,
    checkCredentialAvailability,
    reset,
  };
}
