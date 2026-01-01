#!/bin/bash
# Integration Test Runner for Aura Verifier SDK
#
# Usage:
#   ./run-tests.sh                    # Run all integration tests
#   ./run-tests.sh verification       # Run verification flow tests
#   ./run-tests.sh offline            # Run offline mode tests
#   ./run-tests.sh network            # Run network switching tests
#   ./run-tests.sh batch              # Run batch verification tests
#   ./run-tests.sh security           # Run security tests
#   ./run-tests.sh --coverage         # Run with coverage
#   ./run-tests.sh --watch            # Run in watch mode

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PACKAGE_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"

echo -e "${GREEN}Aura Verifier SDK - Integration Test Runner${NC}"
echo "=============================================="
echo ""

# Change to package directory
cd "$PACKAGE_DIR"

# Determine which tests to run
TEST_PATTERN="__integration__"
VITEST_ARGS=""

if [ "$1" == "--coverage" ] || [ "$2" == "--coverage" ]; then
    VITEST_ARGS="$VITEST_ARGS --coverage"
    echo -e "${YELLOW}Running with coverage enabled${NC}"
fi

if [ "$1" == "--watch" ] || [ "$2" == "--watch" ]; then
    VITEST_ARGS="$VITEST_ARGS --watch"
    echo -e "${YELLOW}Running in watch mode${NC}"
fi

case "$1" in
    verification)
        TEST_PATTERN="verification-flow.integration.test"
        echo -e "${GREEN}Running: Verification Flow Tests${NC}"
        ;;
    offline)
        TEST_PATTERN="offline-mode.integration.test"
        echo -e "${GREEN}Running: Offline Mode Tests${NC}"
        ;;
    network)
        TEST_PATTERN="network-switching.integration.test"
        echo -e "${GREEN}Running: Network Switching Tests${NC}"
        ;;
    batch)
        TEST_PATTERN="batch-verification.integration.test"
        echo -e "${GREEN}Running: Batch Verification Tests${NC}"
        ;;
    security)
        TEST_PATTERN="security.integration.test"
        echo -e "${GREEN}Running: Security Tests${NC}"
        ;;
    --coverage|--watch)
        echo -e "${GREEN}Running: All Integration Tests${NC}"
        ;;
    *)
        if [ -n "$1" ]; then
            echo -e "${RED}Unknown test suite: $1${NC}"
            echo ""
            echo "Available test suites:"
            echo "  verification  - Verification flow tests"
            echo "  offline       - Offline mode tests"
            echo "  network       - Network switching tests"
            echo "  batch         - Batch verification tests"
            echo "  security      - Security tests"
            echo ""
            echo "Options:"
            echo "  --coverage    - Run with coverage"
            echo "  --watch       - Run in watch mode"
            exit 1
        fi
        echo -e "${GREEN}Running: All Integration Tests${NC}"
        ;;
esac

echo ""
echo "Test pattern: $TEST_PATTERN"
echo "Additional args: $VITEST_ARGS"
echo ""

# Run the tests
npm test -- $TEST_PATTERN $VITEST_ARGS

echo ""
echo -e "${GREEN}Tests completed!${NC}"
