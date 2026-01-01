#!/bin/bash
# Verification script for Aura Verifier SDK setup

set -e

echo "========================================="
echo "Aura Verifier SDK - Setup Verification"
echo "========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

success() {
  echo -e "${GREEN}✓${NC} $1"
}

error() {
  echo -e "${RED}✗${NC} $1"
}

warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

# Check Node.js version
echo "Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 18 ]; then
  success "Node.js version: $(node -v)"
else
  error "Node.js version must be >= 18.0.0 (current: $(node -v))"
  exit 1
fi
echo ""

# Check pnpm installation
echo "Checking pnpm installation..."
if command -v pnpm &> /dev/null; then
  success "pnpm installed: $(pnpm -v)"
else
  error "pnpm not found. Install with: npm install -g pnpm"
  exit 1
fi
echo ""

# Verify directory structure
echo "Verifying directory structure..."
cd /home/decri/blockchain-projects/third-party-verifier/aura-verifier-sdk

files=(
  "package.json"
  "pnpm-workspace.yaml"
  "tsconfig.json"
  "tsconfig.base.json"
  ".eslintrc.json"
  ".prettierrc"
  "vitest.config.ts"
  "packages/core/package.json"
  "packages/core/tsconfig.json"
  "packages/core/tsconfig.build.json"
  "packages/core/src/index.ts"
  "packages/core/src/types.ts"
  "packages/core/src/errors.ts"
  "packages/core/src/utils.ts"
  "packages/core/src/crypto.ts"
  "packages/core/src/verifier.ts"
)

missing_files=0
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    success "$file"
  else
    error "$file (missing)"
    missing_files=$((missing_files + 1))
  fi
done

if [ $missing_files -gt 0 ]; then
  error "$missing_files file(s) missing"
  exit 1
fi
echo ""

# Check package.json dependencies
echo "Verifying package.json configuration..."
if grep -q "pnpm-workspace" pnpm-workspace.yaml; then
  success "pnpm workspace configured"
else
  error "pnpm workspace not configured"
  exit 1
fi
echo ""

# Check TypeScript configuration
echo "Verifying TypeScript configuration..."
if grep -q '"strict": true' tsconfig.base.json; then
  success "TypeScript strict mode enabled"
else
  warning "TypeScript strict mode not enabled"
fi

if grep -q '"target": "ES2022"' tsconfig.base.json; then
  success "TypeScript target: ES2022"
else
  warning "TypeScript target not set to ES2022"
fi
echo ""

# Check core package dependencies
echo "Verifying core package dependencies..."
core_deps=(
  "@noble/ed25519"
  "@noble/secp256k1"
  "@noble/hashes"
  "@cosmjs/stargate"
  "@cosmjs/proto-signing"
  "protobufjs"
)

for dep in "${core_deps[@]}"; do
  if grep -q "\"$dep\"" packages/core/package.json; then
    success "$dep"
  else
    error "$dep (missing from package.json)"
  fi
done
echo ""

# Summary
echo "========================================="
echo -e "${GREEN}Setup verification complete!${NC}"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Run 'pnpm install' to install dependencies"
echo "2. Run 'pnpm build' to build the project"
echo "3. Run 'pnpm test' to run tests"
echo ""
echo "For more information, see:"
echo "- README.md"
echo "- QUICKSTART.md"
echo "- PROJECT_STRUCTURE.md"
echo ""
