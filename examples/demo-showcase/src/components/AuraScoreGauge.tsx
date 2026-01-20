import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

interface AuraScoreGaugeProps {
  score: number;
  maxScore?: number;
}

export function AuraScoreGauge({ score, maxScore = 850 }: AuraScoreGaugeProps) {
  const percentage = (score / maxScore) * 100;
  const circumference = 2 * Math.PI * 70;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getScoreColor = () => {
    if (score >= 750) return 'text-green-500';
    if (score >= 650) return 'text-blue-500';
    if (score >= 550) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreLabel = () => {
    if (score >= 750) return 'Excellent';
    if (score >= 650) return 'Good';
    if (score >= 550) return 'Fair';
    return 'Needs Improvement';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-800"
    >
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="w-6 h-6 text-aura-600 dark:text-aura-400" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Aura Trust Score</h3>
      </div>

      <div className="flex flex-col items-center">
        <div className="relative w-48 h-48">
          <svg className="transform -rotate-90 w-48 h-48">
            <circle
              cx="96"
              cy="96"
              r="70"
              stroke="currentColor"
              strokeWidth="12"
              fill="transparent"
              className="text-gray-200 dark:text-gray-700"
            />
            <motion.circle
              cx="96"
              cy="96"
              r="70"
              stroke="currentColor"
              strokeWidth="12"
              fill="transparent"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              className={getScoreColor()}
              strokeLinecap="round"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className={`text-4xl font-bold ${getScoreColor()}`}
            >
              {score}
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-sm text-gray-600 dark:text-gray-400"
            >
              out of {maxScore}
            </motion.div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="mt-6 text-center"
        >
          <div className={`text-xl font-semibold ${getScoreColor()}`}>{getScoreLabel()}</div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Your trust score is based on verification history and credential quality
          </p>
        </motion.div>

        <div className="w-full mt-6 space-y-3">
          <ScoreBreakdown label="Verified Credentials" value={85} color="bg-green-500" />
          <ScoreBreakdown label="Recent Activity" value={70} color="bg-blue-500" />
          <ScoreBreakdown label="Account Age" value={60} color="bg-purple-500" />
        </div>
      </div>

      <div className="mt-6 p-4 bg-aura-50 dark:bg-aura-900/20 rounded-xl">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
          How to Improve Your Score
        </h4>
        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc ml-5">
          <li>Complete more verifications</li>
          <li>Maintain active credentials</li>
          <li>Use verified services regularly</li>
        </ul>
      </div>
    </motion.div>
  );
}

interface ScoreBreakdownProps {
  label: string;
  value: number;
  color: string;
}

function ScoreBreakdown({ label, value, color }: ScoreBreakdownProps) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-700 dark:text-gray-300">{label}</span>
        <span className="text-gray-900 dark:text-white font-semibold">{value}%</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={`h-2 rounded-full ${color}`}
        />
      </div>
    </div>
  );
}
