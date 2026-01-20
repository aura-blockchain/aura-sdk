import { useState, useCallback } from 'react';
import type { VerificationHistory } from '../types';

export function useVerificationHistory() {
  const [history, setHistory] = useState<VerificationHistory[]>(() => {
    const saved = localStorage.getItem('verificationHistory');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
      } catch {
        return [];
      }
    }
    return [];
  });

  const addVerification = useCallback(
    (verification: Omit<VerificationHistory, 'id' | 'timestamp'>) => {
      const newVerification: VerificationHistory = {
        id: Math.random().toString(36).substring(2, 15),
        timestamp: new Date(),
        ...verification,
      };

      setHistory((prev) => {
        const updated = [newVerification, ...prev].slice(0, 50); // Keep last 50
        localStorage.setItem('verificationHistory', JSON.stringify(updated));
        return updated;
      });

      return newVerification;
    },
    []
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem('verificationHistory');
  }, []);

  return { history, addVerification, clearHistory };
}
