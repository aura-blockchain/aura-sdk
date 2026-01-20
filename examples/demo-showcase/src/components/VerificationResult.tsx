import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Clock, User, Shield, Download } from 'lucide-react';
import type { QRCodeData } from '../types';

interface VerificationResultProps {
  result: {
    valid: boolean;
    qrData?: QRCodeData;
    error?: string;
    timestamp?: Date;
  } | null;
  onClose?: () => void;
}

export function VerificationResult({ result, onClose }: VerificationResultProps) {
  if (!result) return null;

  const handleDownloadReceipt = () => {
    const receipt = {
      verified: result.valid,
      timestamp: result.timestamp || new Date(),
      holderDID: result.qrData?.h,
      credentials: result.qrData?.vcs,
      context: result.qrData?.ctx,
    };

    const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verification-receipt-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 border-2 border-gray-200 dark:border-gray-800"
      >
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
            className="inline-block mb-4"
          >
            {result.valid ? (
              <div className="relative">
                <div className="absolute inset-0 bg-green-500 blur-2xl opacity-30 animate-pulse"></div>
                <CheckCircle className="w-20 h-20 text-green-500 relative" />
              </div>
            ) : (
              <div className="relative">
                <div className="absolute inset-0 bg-red-500 blur-2xl opacity-30 animate-pulse"></div>
                <XCircle className="w-20 h-20 text-red-500 relative" />
              </div>
            )}
          </motion.div>

          <motion.h3
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`text-3xl font-bold mb-2 ${
              result.valid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}
          >
            {result.valid ? 'Verification Successful' : 'Verification Failed'}
          </motion.h3>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-gray-600 dark:text-gray-400"
          >
            {result.valid
              ? 'Credential is valid and authentic'
              : result.error || 'Unable to verify credential'}
          </motion.p>
        </div>

        {result.valid && result.qrData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailCard
                icon={<User className="w-5 h-5" />}
                label="Holder DID"
                value={result.qrData.h}
              />
              <DetailCard
                icon={<Shield className="w-5 h-5" />}
                label="Credentials"
                value={`${result.qrData.vcs.length} credential(s)`}
              />
              <DetailCard
                icon={<Clock className="w-5 h-5" />}
                label="Expires"
                value={new Date(result.qrData.exp * 1000).toLocaleString()}
              />
              <DetailCard
                icon={<CheckCircle className="w-5 h-5" />}
                label="Version"
                value={result.qrData.v}
              />
            </div>

            {Object.keys(result.qrData.ctx).length > 0 && (
              <div className="mt-6 p-4 bg-aura-50 dark:bg-aura-900/20 rounded-xl">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                  Disclosed Attributes
                </h4>
                <div className="space-y-2">
                  {Object.entries(result.qrData.ctx).map(
                    ([key, value]) =>
                      value && (
                        <div key={key} className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                          </span>
                        </div>
                      )
                  )}
                </div>
              </div>
            )}

            <button
              onClick={handleDownloadReceipt}
              className="w-full mt-6 py-3 px-6 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Download Receipt
            </button>
          </motion.div>
        )}

        {onClose && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            onClick={onClose}
            className="w-full mt-6 py-3 px-6 bg-gradient-to-r from-aura-600 to-primary-600 hover:from-aura-700 hover:to-primary-700 text-white rounded-xl font-semibold transition-all duration-300"
          >
            Verify Another
          </motion.button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

interface DetailCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function DetailCard({ icon, label, value }: DetailCardProps) {
  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
      <div className="flex items-center gap-2 mb-2 text-gray-600 dark:text-gray-400">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="text-sm text-gray-900 dark:text-white font-mono break-all">{value}</p>
    </div>
  );
}
