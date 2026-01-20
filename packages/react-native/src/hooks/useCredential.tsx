import { useEffect, useState, useCallback } from 'react';
import { useAuraClient } from './useAuraClient';
import { Credential, CredentialStatus, VerificationResult } from '../types';

interface Options {
  autoVerify?: boolean;
  checkStatus?: boolean;
  cache?: boolean;
}

const credentialCache = new Map<string, Credential>();

export function useCredential(id: string, options?: Options) {
  const { client, isConnected } = useAuraClient();
  const [credential, setCredential] = useState<Credential | null>(null);
  const [status, setStatus] = useState<CredentialStatus | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!client || !isConnected || !id) return;
    setLoading(true);
    try {
      let cred: Credential | undefined;
      if (options?.cache && credentialCache.has(id)) {
        cred = credentialCache.get(id);
      } else {
        cred = await client.queryCredential(id);
        if (options?.cache) credentialCache.set(id, cred);
      }
      setCredential(cred ?? null);
      if (options?.checkStatus) {
        const s = await client.getCredentialStatus(id);
        setStatus(s);
      } else {
        setStatus(cred?.status ?? null);
      }
      setError(null);
    } catch (err) {
      setError(err as Error);
      setCredential(null);
    } finally {
      setLoading(false);
    }
  }, [client, isConnected, id, options?.cache, options?.checkStatus]);

  const verify = useCallback(async () => {
    if (!client || !credential) return;
    const res = await client.verifyCredential(credential);
    setVerificationResult(res);
  }, [client, credential]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (options?.autoVerify && credential) {
      verify();
    }
  }, [options?.autoVerify, credential, verify]);

  const isExpired = credential?.expirationDate
    ? new Date(credential.expirationDate) < new Date()
    : false;
  const isValid =
    (status ?? credential?.status ?? CredentialStatus.VALID) === CredentialStatus.VALID &&
    !isExpired;

  return {
    credential,
    status,
    verificationResult,
    isLoading,
    error,
    verify,
    isValid,
    isExpired,
  };
}
