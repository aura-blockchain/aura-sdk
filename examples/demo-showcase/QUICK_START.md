# Quick Start Guide

## Installation & Setup (2 minutes)

```bash
# Navigate to demo directory
cd examples/demo-showcase

# Install dependencies
npm install

# Start development server
npm run dev
```

The demo will automatically open at http://localhost:3000

## First Verification (1 minute)

1. **Generate a Sample QR Code**

   - Scroll to "Age Verification Demo"
   - Click "21+" or "18+"
   - Click "Generate Sample QR Code"
   - Copy the QR code data

2. **Verify the Credential**
   - Paste into "Manual Input" section
   - Click "Verify Credential"
   - See the beautiful success animation!

## Key Features to Try

### Camera Scanner

- Click "Start Camera" in QR Scanner section
- Allow camera permissions
- Point at generated QR code (display on phone)

### Network Toggle

- Switch between Mainnet/Testnet
- Toggle Online/Offline mode
- Watch latency changes

### Aura Score

- Complete verifications to increase score
- Watch the animated gauge
- View score breakdown

### Verification History

- All verifications tracked automatically
- Success rate calculated
- Export individual receipts

### Code Examples

- View 4 different implementation patterns
- Copy with one click
- Syntax highlighted

### Dark/Light Mode

- Click moon/sun icon in navbar
- Auto-saves preference
- Smooth transitions

## Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

Built files in `dist/` directory ready for deployment.

## GitHub Pages Deployment

```bash
# Install deployment tool
npm install -D gh-pages

# Deploy
npm run deploy
```

## Keyboard Shortcuts

- `Ctrl/Cmd + K` - Focus search (when implemented)
- `Esc` - Close modals
- Click outside - Dismiss overlays

## Tips & Tricks

1. **Best Browser**: Chrome/Edge for camera features
2. **Mobile Testing**: Works great on phones/tablets
3. **Offline Demo**: Toggle offline mode to test caching
4. **Dark Mode**: Auto-detects system preference
5. **History**: Persists in localStorage

## Customization

Change colors in `tailwind.config.js`:

```javascript
colors: {
  aura: {
    600: '#your-color',
  }
}
```

## Troubleshooting

**Camera not working?**

- Check browser permissions
- Must be HTTPS in production
- Try Chrome/Edge

**Build errors?**

```bash
rm -rf node_modules package-lock.json
npm install
```

## Support

- Issues: [GitHub Issues](https://github.com/aura-blockchain/aura-verifier-sdk/issues)
- Docs: [https://docs.aurablockchain.org](https://docs.aurablockchain.org)
- Discord: [https://discord.gg/aurablockchain](https://discord.gg/aurablockchain)

---

**Total Setup Time: ~3 minutes**
**Total Demo Time: ~5 minutes**
**Total LOC: 1,529 lines** (TypeScript/TSX)
