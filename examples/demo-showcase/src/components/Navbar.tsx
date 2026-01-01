import { motion } from 'framer-motion';
import { Moon, Sun, Github } from 'lucide-react';
import { useDarkMode } from '../hooks/useDarkMode';

export function Navbar() {
  const { isDark, setIsDark } = useDarkMode();

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-aura-600 to-primary-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">A</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                Aura Verifier
              </h1>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                SDK Demo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://github.com/aura-blockchain/aura-verifier-sdk"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="View on GitHub"
            >
              <Github className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </a>

            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle dark mode"
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              ) : (
                <Moon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
