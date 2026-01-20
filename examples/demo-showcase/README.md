# Aura Verifier SDK - Interactive Demo Showcase

An impressive, production-ready demo application showcasing all capabilities of the Aura Verifier SDK. This single-page application demonstrates privacy-preserving identity verification with a modern, responsive design.

![Aura Verifier Demo](https://img.shields.io/badge/React-19.2.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue)
![Vite](https://img.shields.io/badge/Vite-7.2.4-purple)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.1.18-cyan)

## Features

### Core Functionality

- **Live QR Code Scanner** - Real-time camera-based QR code scanning
- **Manual QR Input** - Paste and verify QR code data strings
- **Instant Verification** - Real-time credential validation with visual feedback
- **Age Verification Demo** - Toggle between 18+ and 21+ age requirements
- **Sample QR Generator** - Generate mock QR codes for testing

### Visualizations

- **Aura Score Gauge** - Animated trust score meter (0-850)
- **Verification Result Display** - Beautiful success/failure animations
- **Verification History Timeline** - Track all past verifications
- **Network Status Indicator** - Live connection status and latency

### Developer Features

- **Code Examples** - Syntax-highlighted TypeScript examples
- **Multiple Network Support** - Toggle between mainnet/testnet
- **Offline Mode** - Simulate offline verification with cached data
- **Export Receipts** - Download verification receipts as JSON
- **Raw Data Viewer** - Inspect credential presentation details

### Design & UX

- **Dark/Light Mode** - System-aware theme switching
- **Responsive Design** - Mobile-first, works on all devices
- **Framer Motion Animations** - Smooth, professional animations
- **Aura Brand Colors** - Consistent branding throughout
- **Glass Morphism** - Modern UI design patterns

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm or pnpm

### Installation

```bash
# Navigate to the demo directory
cd examples/demo-showcase

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will open automatically at `http://localhost:3000`

### Building for Production

```bash
# Build the application
npm run build

# Preview production build
npm run preview
```

## Usage Guide

### 1. Generate a Sample QR Code

1. Scroll to the **Age Verification Demo** section
2. Select age requirement (18+ or 21+)
3. Click **Generate Sample QR Code**
4. Copy the generated QR code data

### 2. Verify the QR Code

**Option A: Camera Scanner**

1. Click **Start Camera** in the QR Code Scanner section
2. Allow camera permissions
3. Point camera at a QR code
4. Verification happens automatically

**Option B: Manual Input**

1. Paste the QR code data in the **Manual Input** section
2. Click **Verify Credential**
3. View the verification result

### 3. View Verification History

All verifications are tracked in the **Verification History** panel with:

- Success/failure status
- Timestamp
- Age verification type (if applicable)
- Holder DID
- Online/offline mode indicator

### 4. Explore Code Examples

Navigate to the **Code Examples** section to see:

- Basic verification setup
- Age verification (21+)
- Offline mode configuration
- TypeScript integration examples

Copy any example to your clipboard with one click.

## Network Configuration

### Mainnet

```typescript
{
  rpcEndpoint: 'https://rpc.aurablockchain.org',
  restEndpoint: 'https://api.aurablockchain.org'
}
```

### Testnet (testnet)

```typescript
{
  rpcEndpoint: 'https://testnet-rpc.aurablockchain.org',
  restEndpoint: 'https://testnet-api.aurablockchain.org'
}
```

Toggle between networks using the **Network Status** panel.

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Available variables:

- `VITE_MAINNET_RPC` - Mainnet RPC endpoint
- `VITE_MAINNET_REST` - Mainnet REST endpoint
- `VITE_TESTNET_RPC` - Testnet RPC endpoint
- `VITE_TESTNET_REST` - Testnet REST endpoint
- `VITE_DEFAULT_NETWORK` - Default network (mainnet or testnet)
- `VITE_ENABLE_CAMERA` - Enable camera scanner
- `VITE_ENABLE_OFFLINE_MODE` - Enable offline mode

## Project Structure

```
demo-showcase/
├── src/
│   ├── components/
│   │   ├── Hero.tsx                  # Hero section with animations
│   │   ├── Navbar.tsx                # Navigation bar with theme toggle
│   │   ├── QRScanner.tsx             # Live camera QR scanner
│   │   ├── ManualQRInput.tsx         # Manual QR code input
│   │   ├── VerificationResult.tsx    # Verification result display
│   │   ├── AgeVerificationDemo.tsx   # Age verification demo
│   │   ├── AuraScoreGauge.tsx        # Trust score visualization
│   │   ├── NetworkStatus.tsx         # Network status indicator
│   │   ├── VerificationHistory.tsx   # Verification timeline
│   │   └── CodeExamples.tsx          # Syntax-highlighted examples
│   ├── hooks/
│   │   ├── useDarkMode.ts            # Dark mode management
│   │   └── useVerificationHistory.ts # History state management
│   ├── utils/
│   │   └── mockData.ts               # Mock QR code generation
│   ├── types/
│   │   └── index.ts                  # TypeScript type definitions
│   ├── App.tsx                       # Main application component
│   ├── main.tsx                      # Application entry point
│   └── index.css                     # Global styles (TailwindCSS)
├── public/                           # Static assets
├── .env.example                      # Environment variables template
├── vite.config.ts                    # Vite configuration
├── tailwind.config.js                # TailwindCSS configuration
├── tsconfig.json                     # TypeScript configuration
└── package.json                      # Project dependencies
```

## Technology Stack

- **React 19.2.0** - UI framework
- **TypeScript 5.9.3** - Type safety
- **Vite 7.2.4** - Build tool and dev server
- **TailwindCSS 4.1.18** - Utility-first CSS
- **Framer Motion 12.23** - Animation library
- **html5-qrcode** - QR code scanning
- **qrcode.react** - QR code generation
- **react-syntax-highlighter** - Code highlighting
- **lucide-react** - Icon library

## Camera Permissions

The QR scanner requires camera access. If blocked:

1. Click the camera icon in your browser's address bar
2. Allow camera access for this site
3. Reload the page
4. Click "Start Camera" again

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

Note: Camera scanning works best in Chrome/Edge.

## Offline Mode

Enable offline mode to simulate verification without network access:

1. Click the network status indicator
2. Toggle to "Offline Mode"
3. Verifications will use cached credential data
4. Limited features (no blockchain queries)

## Deployment

### GitHub Pages

```bash
# Install gh-pages
npm install -D gh-pages

# Deploy to GitHub Pages
npm run deploy
```

The app will be available at: `https://[username].github.io/aura-verifier-sdk/`

### Custom Domain

Update `vite.config.ts`:

```typescript
export default defineConfig({
  base: '/', // For custom domain
  // ... other config
});
```

## Development

### Run Development Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Lint Code

```bash
npm run lint
```

## Customization

### Brand Colors

Edit `tailwind.config.js` to customize the color scheme:

```javascript
colors: {
  aura: {
    50: '#f0f4ff',
    // ... customize colors
  }
}
```

### Network Endpoints

Update endpoints in `src/types/index.ts`:

```typescript
export const NETWORKS = {
  mainnet: {
    name: 'Mainnet',
    rpcEndpoint: 'your-rpc-endpoint',
    restEndpoint: 'your-rest-endpoint',
  },
};
```

## Troubleshooting

### Camera not working

- Check browser permissions
- Try Chrome/Edge for best compatibility
- Ensure HTTPS (required for camera access)
- Check console for error messages

### Build errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf .vite
```

### Dark mode not persisting

Dark mode preference is stored in localStorage. Check browser settings to ensure localStorage is enabled.

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see [LICENSE](../../LICENSE) for details.

## Support

- **Documentation**: [https://docs.aurablockchain.org](https://docs.aurablockchain.org)
- **Discord**: [https://discord.gg/aurablockchain](https://discord.gg/aurablockchain)
- **Issues**: [GitHub Issues](https://github.com/aura-blockchain/aura-verifier-sdk/issues)
- **Email**: dev@aurablockchain.org

## Acknowledgments

Built with:

- [Aura Verifier SDK](https://github.com/aura-blockchain/aura-verifier-sdk)
- [React](https://react.dev)
- [Vite](https://vitejs.dev)
- [TailwindCSS](https://tailwindcss.com)
- [Framer Motion](https://www.framer.com/motion)
- [Lucide Icons](https://lucide.dev)

---

**Made with care by the Aura Network team**
