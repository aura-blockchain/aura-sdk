import { motion } from 'framer-motion';
import { Wifi, WifiOff, Globe, Activity } from 'lucide-react';
import { useState, useEffect } from 'react';

interface NetworkStatusProps {
  network: 'mainnet' | 'testnet';
  isOnline: boolean;
  onNetworkChange: (network: 'mainnet' | 'testnet') => void;
  onOfflineModeToggle: (offline: boolean) => void;
}

export function NetworkStatus({ network, isOnline, onNetworkChange, onOfflineModeToggle }: NetworkStatusProps) {
  const [latency, setLatency] = useState<number>(0);

  useEffect(() => {
    if (isOnline) {
      setLatency(Math.floor(Math.random() * 100) + 50);
    }
  }, [isOnline]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-800"
    >
      <div className="flex items-center gap-2 mb-6">
        <Activity className="w-6 h-6 text-aura-600 dark:text-aura-400" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          Network Status
        </h3>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <div className="flex items-center gap-3">
            {isOnline ? (
              <Wifi className="w-6 h-6 text-green-500" />
            ) : (
              <WifiOff className="w-6 h-6 text-gray-400" />
            )}
            <div>
              <div className="font-semibold text-gray-900 dark:text-white">
                {isOnline ? 'Online Mode' : 'Offline Mode'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {isOnline ? 'Connected to blockchain' : 'Using cached data'}
              </div>
            </div>
          </div>
          <button
            onClick={() => onOfflineModeToggle(!isOnline)}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              isOnline
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            {isOnline ? 'Online' : 'Offline'}
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Network
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onNetworkChange('mainnet')}
              className={`p-3 rounded-xl border-2 transition-all ${
                network === 'mainnet'
                  ? 'border-aura-500 bg-aura-50 dark:bg-aura-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-aura-300'
              }`}
            >
              <Globe className={`w-5 h-5 mx-auto mb-1 ${
                network === 'mainnet' ? 'text-aura-600 dark:text-aura-400' : 'text-gray-400'
              }`} />
              <div className="text-sm font-semibold">Mainnet</div>
            </button>
            <button
              onClick={() => onNetworkChange('testnet')}
              className={`p-3 rounded-xl border-2 transition-all ${
                network === 'testnet'
                  ? 'border-aura-500 bg-aura-50 dark:bg-aura-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-aura-300'
              }`}
            >
              <Globe className={`w-5 h-5 mx-auto mb-1 ${
                network === 'testnet' ? 'text-aura-600 dark:text-aura-400' : 'text-gray-400'
              }`} />
              <div className="text-sm font-semibold">Testnet</div>
            </button>
          </div>
        </div>

        {isOnline && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 pt-2"
          >
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">RPC Endpoint</span>
              <code className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                {network === 'mainnet' ? 'rpc.aura.network' : 'rpc.euphoria.aura.network'}
              </code>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Latency</span>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  latency < 100 ? 'bg-green-500 animate-pulse' : 'bg-yellow-500 animate-pulse'
                }`}></div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {latency}ms
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {!isOnline && (
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            Offline mode uses cached credentials and revocation lists. Some features may be limited.
          </p>
        </div>
      )}
    </motion.div>
  );
}
