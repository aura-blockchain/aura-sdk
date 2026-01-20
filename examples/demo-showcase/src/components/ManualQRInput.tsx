import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, ArrowRight } from 'lucide-react';

interface ManualQRInputProps {
  onSubmit: (data: string) => void;
}

export function ManualQRInput({ onSubmit }: ManualQRInputProps) {
  const [qrData, setQrData] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (qrData.trim()) {
      onSubmit(qrData.trim());
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-800"
    >
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-6 h-6 text-aura-600 dark:text-aura-400" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Manual Input</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="qr-input"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Paste QR Code Data
          </label>
          <textarea
            id="qr-input"
            value={qrData}
            onChange={(e) => setQrData(e.target.value)}
            placeholder="aura://verify?data=eyJ2IjoiMS4wIiwicCI6InByZXNfMTIzNCIsImgiOiJkaWQ6YXVyYTptYWlubmV0OmFiYzEyMyJ9"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-aura-500 focus:border-transparent transition-all resize-none"
            rows={4}
          />
        </div>

        <button
          type="submit"
          disabled={!qrData.trim()}
          className="w-full py-3 px-6 bg-gradient-to-r from-aura-600 to-primary-600 hover:from-aura-700 hover:to-primary-700 text-white rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:hover:shadow-lg"
        >
          Verify Credential
          <ArrowRight className="w-5 h-5" />
        </button>
      </form>

      <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        Enter or paste the QR code data string starting with{' '}
        <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">aura://verify</code>
      </p>
    </motion.div>
  );
}
