import { useState } from 'react';
import { motion } from 'framer-motion';
import { Code, Copy, Check } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useDarkMode } from '../hooks/useDarkMode';

const examples = {
  basic: {
    title: 'Basic Verification',
    code: `import { VerifierSDK } from '@aura-network/verifier-sdk';

// Initialize the SDK
const verifier = new VerifierSDK({
  rpcEndpoint: 'https://rpc.aura.network',
  timeout: 30000,
  debug: false
});

// Verify a signature from a QR code
const result = await verifier.verifySignature({
  publicKey: 'a1b2c3d4...', // hex-encoded public key
  message: 'credential-presentation-data',
  signature: 'signature-from-qr-code',
  algorithm: 'ed25519'
});

if (result.valid) {
  console.log('Credential verified successfully!');
} else {
  console.error('Verification failed:', result.error);
}`,
  },
  ageVerification: {
    title: 'Age Verification (21+)',
    code: `import { parseQRCode } from '@aura-network/verifier-sdk';

// Scan QR code and parse
const qrData = parseQRCode(scannedQRString);

// Check disclosure context for age verification
if (qrData.ctx.show_age_over_21) {
  // Verify the presentation signature
  const verified = await verifier.verifySignature({
    publicKey: qrData.h, // holder's DID
    message: JSON.stringify({
      p: qrData.p,
      vcs: qrData.vcs,
      ctx: qrData.ctx,
      exp: qrData.exp,
      n: qrData.n
    }),
    signature: qrData.sig,
    algorithm: 'ed25519'
  });

  // Check expiration
  if (verified.valid && Date.now() / 1000 < qrData.exp) {
    console.log('✓ Customer is over 21 - allow entry');
  } else {
    console.log('✗ Verification failed or expired');
  }
}`,
  },
  offlineMode: {
    title: 'Offline Verification',
    code: `import { VerifierSDK } from '@aura-network/verifier-sdk';
import { OfflineCache } from '@aura-network/verifier-sdk/offline';

// Initialize with offline support
const cache = new OfflineCache({
  maxAge: 86400000, // 24 hours
  syncInterval: 3600000 // sync every hour
});

const verifier = new VerifierSDK({
  rpcEndpoint: 'https://rpc.aura.network',
  cache: cache,
  offlineMode: true
});

// Sync revocation list while online
await cache.syncRevocationList();

// Later, verify offline
const result = await verifier.verifyOffline(qrData);

if (result.valid) {
  console.log('Verified using cached data');
}`,
  },
  typescript: {
    title: 'TypeScript Integration',
    code: `import type {
  VerificationResult,
  QRCodeData,
  SignatureVerificationRequest
} from '@aura-network/verifier-sdk';

interface VerificationResponse {
  success: boolean;
  holder?: string;
  credentials?: string[];
  error?: string;
}

async function verifyCredential(
  qrString: string
): Promise<VerificationResponse> {
  try {
    const qrData: QRCodeData = parseQRCode(qrString);

    const request: SignatureVerificationRequest = {
      publicKey: qrData.h,
      message: JSON.stringify(qrData),
      signature: qrData.sig,
      algorithm: 'ed25519'
    };

    const result: VerificationResult =
      await verifier.verifySignature(request);

    if (result.valid) {
      return {
        success: true,
        holder: qrData.h,
        credentials: qrData.vcs
      };
    }

    return {
      success: false,
      error: result.error
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}`,
  },
};

export function CodeExamples() {
  const [selectedExample, setSelectedExample] = useState<keyof typeof examples>('basic');
  const [copied, setCopied] = useState(false);
  const { isDark } = useDarkMode();

  const handleCopy = () => {
    navigator.clipboard.writeText(examples[selectedExample].code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-800"
    >
      <div className="flex items-center gap-2 mb-6">
        <Code className="w-6 h-6 text-aura-600 dark:text-aura-400" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          Code Examples
        </h3>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(examples).map(([key, example]) => (
          <button
            key={key}
            onClick={() => setSelectedExample(key as keyof typeof examples)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              selectedExample === key
                ? 'bg-aura-600 text-white shadow-lg'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {example.title}
          </button>
        ))}
      </div>

      <div className="relative">
        <button
          onClick={handleCopy}
          className="absolute top-4 right-4 z-10 p-2 bg-gray-800 dark:bg-gray-700 hover:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
        >
          {copied ? (
            <Check className="w-5 h-5 text-green-400" />
          ) : (
            <Copy className="w-5 h-5 text-gray-300" />
          )}
        </button>

        <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
          <SyntaxHighlighter
            language="typescript"
            style={isDark ? vscDarkPlus : vs}
            customStyle={{
              margin: 0,
              padding: '1.5rem',
              fontSize: '0.875rem',
              lineHeight: '1.5',
            }}
            showLineNumbers
          >
            {examples[selectedExample].code}
          </SyntaxHighlighter>
        </div>
      </div>

      <div className="mt-4 p-4 bg-aura-50 dark:bg-aura-900/20 rounded-xl">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
          Try it yourself
        </h4>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Install the SDK: <code className="px-2 py-1 bg-white dark:bg-gray-800 rounded">npm install @aura-network/verifier-sdk</code>
        </p>
      </div>
    </motion.div>
  );
}
