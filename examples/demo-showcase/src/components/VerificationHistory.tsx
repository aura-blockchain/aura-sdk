import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import type { VerificationHistory as VerificationHistoryType } from '../types';

interface VerificationHistoryProps {
  history: VerificationHistoryType[];
  onClear: () => void;
}

export function VerificationHistory({ history, onClear }: VerificationHistoryProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-800"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Clock className="w-6 h-6 text-aura-600 dark:text-aura-400" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Verification History
          </h3>
        </div>
        {history.length > 0 && (
          <button
            onClick={onClear}
            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Clear history"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            No verification history yet
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            Completed verifications will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          <AnimatePresence>
            {history.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {item.status === 'success' ? (
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-500" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className={`font-semibold ${
                          item.status === 'success'
                            ? 'text-green-700 dark:text-green-400'
                            : 'text-red-700 dark:text-red-400'
                        }`}>
                          {item.status === 'success' ? 'Verified Successfully' : 'Verification Failed'}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {new Date(item.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-500">
                        {item.verificationMethod === 'online' ? 'Online' : 'Offline'}
                      </div>
                    </div>

                    {item.ageVerification && (
                      <div className="mt-2 inline-flex items-center px-2.5 py-1 bg-aura-100 dark:bg-aura-900/30 text-aura-700 dark:text-aura-300 rounded-full text-xs font-medium">
                        Age {item.ageVerification} Verified
                      </div>
                    )}

                    {item.holderDID && (
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-500 font-mono truncate">
                        DID: {item.holderDID}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Total Verifications</span>
            <span className="font-semibold text-gray-900 dark:text-white">{history.length}</span>
          </div>
          <div className="flex justify-between text-sm mt-2">
            <span className="text-gray-600 dark:text-gray-400">Success Rate</span>
            <span className="font-semibold text-green-600 dark:text-green-400">
              {Math.round((history.filter(h => h.status === 'success').length / history.length) * 100)}%
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
