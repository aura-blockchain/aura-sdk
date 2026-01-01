import { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { QRScanner } from './components/QRScanner';
import { ManualQRInput } from './components/ManualQRInput';
import { VerificationResult } from './components/VerificationResult';
import { AgeVerificationDemo } from './components/AgeVerificationDemo';
import { AuraScoreGauge } from './components/AuraScoreGauge';
import { NetworkStatus } from './components/NetworkStatus';
import { VerificationHistory } from './components/VerificationHistory';
import { CodeExamples } from './components/CodeExamples';
import { useVerificationHistory } from './hooks/useVerificationHistory';
import { decodeQRCodeData, calculateAuraScore } from './utils/mockData';
import type { QRCodeData } from './types';

function App() {
  const [network, setNetwork] = useState<'mainnet' | 'testnet'>('testnet');
  const [isOnline, setIsOnline] = useState(true);
  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean;
    qrData?: QRCodeData;
    error?: string;
    timestamp?: Date;
  } | null>(null);
  const { history, addVerification, clearHistory } = useVerificationHistory();

  const handleQRScan = async (qrString: string) => {
    try {
      const qrData = decodeQRCodeData(qrString);

      if (!qrData) {
        setVerificationResult({
          valid: false,
          error: 'Invalid QR code format',
          timestamp: new Date(),
        });
        addVerification({
          status: 'failed',
          verificationMethod: isOnline ? 'online' : 'offline',
        });
        return;
      }

      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (now > qrData.exp) {
        setVerificationResult({
          valid: false,
          error: 'QR code has expired',
          timestamp: new Date(),
        });
        addVerification({
          status: 'failed',
          verificationMethod: isOnline ? 'online' : 'offline',
        });
        return;
      }

      // Mock successful verification
      setVerificationResult({
        valid: true,
        qrData,
        timestamp: new Date(),
      });

      // Determine age verification
      let ageVerification: '18+' | '21+' | undefined;
      if (qrData.ctx.show_age_over_21) {
        ageVerification = '21+';
      } else if (qrData.ctx.show_age_over_18) {
        ageVerification = '18+';
      }

      addVerification({
        status: 'success',
        ageVerification,
        holderDID: qrData.h,
        verificationMethod: isOnline ? 'online' : 'offline',
      });
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationResult({
        valid: false,
        error: 'Verification failed. Please try again.',
        timestamp: new Date(),
      });
      addVerification({
        status: 'failed',
        verificationMethod: isOnline ? 'online' : 'offline',
      });
    }
  };

  const auraScore = calculateAuraScore(history);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />

      <main className="pt-16">
        <Hero />

        <div id="demo" className="container mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Interactive Demo
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Experience the full power of the Aura Verifier SDK with live demonstrations
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <QRScanner onScan={handleQRScan} />
                <ManualQRInput onSubmit={handleQRScan} />
              </div>

              {verificationResult && (
                <VerificationResult
                  result={verificationResult}
                  onClose={() => setVerificationResult(null)}
                />
              )}

              <AgeVerificationDemo />
              <CodeExamples />
            </div>

            <div className="space-y-6">
              <NetworkStatus
                network={network}
                isOnline={isOnline}
                onNetworkChange={setNetwork}
                onOfflineModeToggle={() => setIsOnline(!isOnline)}
              />
              <AuraScoreGauge score={auraScore} />
              <VerificationHistory history={history} onClear={clearHistory} />
            </div>
          </div>
        </div>

        <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Ready to Get Started?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Integrate privacy-preserving verification into your application today
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <a
                  href="https://github.com/aura-blockchain/aura-verifier-sdk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-gradient-to-r from-aura-600 to-primary-600 hover:from-aura-700 hover:to-primary-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl"
                >
                  View on GitHub
                </a>
                <a
                  href="https://docs.aura.network"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-semibold transition-all"
                >
                  Documentation
                </a>
              </div>
            </div>

            <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800 text-center text-sm text-gray-600 dark:text-gray-400">
              <p>Built with Aura Verifier SDK - Privacy-Preserving Identity Verification</p>
              <p className="mt-2">Copyright 2025 Aura Network. MIT License.</p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default App;
