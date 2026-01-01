import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface QRScannerProps {
  onScan: (data: string) => void;
}

export function QRScanner({ onScan }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const qrCodeRegionId = 'qr-code-region';

  useEffect(() => {
    return () => {
      if (scannerRef.current && isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [isScanning]);

  const startScanning = async () => {
    try {
      setError(null);
      const scanner = new Html5Qrcode(qrCodeRegionId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          onScan(decodedText);
          stopScanning();
        },
        () => {
          // Error scanning - ignore
        }
      );

      setIsScanning(true);
      setHasPermission(true);
    } catch (err) {
      console.error('Failed to start scanner:', err);
      setError('Failed to access camera. Please check permissions.');
      setHasPermission(false);
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        setIsScanning(false);
      } catch (err) {
        console.error('Failed to stop scanner:', err);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-800"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Camera className="w-6 h-6 text-aura-600 dark:text-aura-400" />
          QR Code Scanner
        </h3>
      </div>

      <div className="mb-4">
        <div
          id={qrCodeRegionId}
          className={`w-full rounded-xl overflow-hidden ${
            !isScanning ? 'bg-gray-100 dark:bg-gray-800' : ''
          }`}
          style={{ minHeight: isScanning ? 'auto' : '300px' }}
        />

        {!isScanning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                Click start to scan QR codes
              </p>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
          >
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={isScanning ? stopScanning : startScanning}
        className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
          isScanning
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-gradient-to-r from-aura-600 to-primary-600 hover:from-aura-700 hover:to-primary-700 text-white shadow-lg hover:shadow-xl'
        }`}
      >
        {isScanning ? (
          <>
            <CameraOff className="w-5 h-5" />
            Stop Scanning
          </>
        ) : (
          <>
            <Camera className="w-5 h-5" />
            Start Camera
          </>
        )}
      </button>

      {hasPermission === false && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center"
        >
          Camera access is required to scan QR codes. Please enable camera permissions in your
          browser settings.
        </motion.p>
      )}
    </motion.div>
  );
}
