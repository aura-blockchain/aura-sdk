import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wine, Beer, AlertCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { createMockQRCodeData, encodeQRCodeData } from '../utils/mockData';

export function AgeVerificationDemo() {
  const [ageRequirement, setAgeRequirement] = useState<'18+' | '21+'>('21+');
  const [qrCode, setQrCode] = useState<string>('');

  const generateQR = () => {
    const mockData = createMockQRCodeData(ageRequirement);
    const encoded = encodeQRCodeData(mockData);
    setQrCode(encoded);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-800"
    >
      <div className="flex items-center gap-2 mb-6">
        <Wine className="w-6 h-6 text-aura-600 dark:text-aura-400" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          Age Verification Demo
        </h3>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Select Age Requirement
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setAgeRequirement('18+')}
            className={`p-4 rounded-xl border-2 transition-all duration-300 ${
              ageRequirement === '18+'
                ? 'border-aura-500 bg-aura-50 dark:bg-aura-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-aura-300'
            }`}
          >
            <Beer className={`w-8 h-8 mx-auto mb-2 ${
              ageRequirement === '18+' ? 'text-aura-600 dark:text-aura-400' : 'text-gray-400'
            }`} />
            <div className="text-center">
              <div className="font-bold text-lg">18+</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Age 18 or older</div>
            </div>
          </button>

          <button
            onClick={() => setAgeRequirement('21+')}
            className={`p-4 rounded-xl border-2 transition-all duration-300 ${
              ageRequirement === '21+'
                ? 'border-aura-500 bg-aura-50 dark:bg-aura-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-aura-300'
            }`}
          >
            <Wine className={`w-8 h-8 mx-auto mb-2 ${
              ageRequirement === '21+' ? 'text-aura-600 dark:text-aura-400' : 'text-gray-400'
            }`} />
            <div className="text-center">
              <div className="font-bold text-lg">21+</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Age 21 or older</div>
            </div>
          </button>
        </div>
      </div>

      <button
        onClick={generateQR}
        className="w-full py-3 px-6 bg-gradient-to-r from-aura-600 to-primary-600 hover:from-aura-700 hover:to-primary-700 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl mb-6"
      >
        Generate Sample QR Code
      </button>

      {qrCode && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-6 p-6 bg-gray-50 dark:bg-gray-800 rounded-xl"
        >
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-white rounded-xl shadow-lg">
              <QRCodeSVG value={qrCode} size={200} level="H" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Sample QR Code Generated</strong>
                  <p className="mt-1">This is a mock QR code for {ageRequirement} age verification. Scan or copy the data below to test.</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                QR Code Data (for manual input)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={qrCode}
                  readOnly
                  className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(qrCode)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs bg-aura-600 hover:bg-aura-700 text-white rounded transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
        <h4 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-2 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          How It Works
        </h4>
        <ul className="text-sm text-yellow-800 dark:text-yellow-300 space-y-1 ml-7 list-disc">
          <li>User generates a credential presentation with selective disclosure</li>
          <li>QR code contains proof of age without revealing birthdate</li>
          <li>Verifier scans and validates against Aura blockchain</li>
          <li>No personal data is stored by the verifier</li>
        </ul>
      </div>
    </motion.div>
  );
}
