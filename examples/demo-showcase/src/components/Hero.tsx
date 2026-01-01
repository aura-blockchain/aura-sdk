import { motion } from 'framer-motion';
import { Shield, Scan, CheckCircle } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden gradient-mesh">
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-5xl mx-auto"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="inline-block mb-8"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-aura-500 blur-3xl opacity-30 animate-pulse-slow"></div>
              <Shield className="w-20 h-20 sm:w-24 sm:h-24 text-aura-600 dark:text-aura-400 relative" />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-aura-600 via-primary-600 to-purple-600 bg-clip-text text-transparent"
          >
            Aura Verifier SDK
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-xl sm:text-2xl md:text-3xl text-gray-700 dark:text-gray-300 mb-8 font-light"
          >
            Privacy-Preserving Identity Verification
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-base sm:text-lg text-gray-600 dark:text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed"
          >
            Verify digital credentials with zero-knowledge proofs. Enable age verification,
            identity checks, and trust scores without storing sensitive personal information.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="flex flex-wrap gap-6 justify-center mb-16"
          >
            <FeatureCard
              icon={<Shield className="w-6 h-6" />}
              title="Cryptographically Secure"
              description="Ed25519 & secp256k1 signatures"
              delay={0.7}
            />
            <FeatureCard
              icon={<Scan className="w-6 h-6" />}
              title="QR Code Verification"
              description="Instant credential validation"
              delay={0.8}
            />
            <FeatureCard
              icon={<CheckCircle className="w-6 h-6" />}
              title="Privacy-First"
              description="Zero-knowledge disclosure"
              delay={0.9}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
          >
            <a
              href="#demo"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-aura-600 to-primary-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              Try Live Demo
              <motion.svg
                animate={{ y: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </motion.svg>
            </a>
          </motion.div>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white dark:from-gray-950 to-transparent"></div>
    </section>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
}

function FeatureCard({ icon, title, description, delay }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="flex-1 min-w-[200px] max-w-[280px] p-6 rounded-2xl bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border border-gray-200 dark:border-gray-800 hover:border-aura-500 dark:hover:border-aura-500 transition-all duration-300 hover:shadow-lg"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-lg bg-aura-100 dark:bg-aura-900/30 text-aura-600 dark:text-aura-400">
          {icon}
        </div>
        <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
    </motion.div>
  );
}
