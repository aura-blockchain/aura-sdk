# AURA SDK/API Testing Progress
Last updated: 2026-01-15

Progress log for implementing `AURA-SDK-API-TESTING-PLAN.md`. Tasks are checked off once completed in the codebase or verified as already satisfied.

## Phase 1 — TypeScript SDK (core)
- [x] 1.2 Type definitions covered: added network/constants/DID tests (`packages/core/src/types/__tests__/network.test.ts`, `constants.test.ts`).
- [x] 1.3 Error class coverage: existing suite already exercises error hierarchy (`packages/core/src/__tests__/errors.test.ts`), no gaps detected.
- [x] 1.4 Property-based tests: added `network.property.test.ts` using fast-check to stress DID and endpoint invariants.
- [x] 1.5 Mutation testing harness: added Stryker config (`stryker.conf.json`) and root script `pnpm test:mutation`; thresholds high=85/low=70/break=65.
- [x] Tooling/deps aligned: pnpm lockfile refreshed with `fast-check` and Stryker runner.
- [x] QueryExecutor response/error handling covered: added `queries.handleResponse.test.ts` to assert Aura API error wrapping, invalid JSON, and connection failure mapping (2026-01-16).

## Phase 2 — Go SDK
- [x] Client coverage: comprehensive tests for config defaults, mnemonic import, balance/all-balances, account query, and sign/broadcast key errors (`aura/sdk/go/client/client_test.go`).
- [x] Encoding coverage: ensured interface registry and tx config registered (`aura/sdk/go/client/encoding_test.go`).
- [x] Fixed client encoding setup to populate `TxConfig`/`InterfaceRegistry` for account unpacking (see `client.go`).
- [x] Batch/errors/events/types packages covered: added deterministic tests for transaction builder, chunking, query retries, typed errors, websocket subscription parsing/filtering, and shared types (`aura/sdk/go/pkg/*/*_test.go`).
- [x] Identity module client validation tests added (`pkg/modules/identity/client_validation_test.go`).
- [x] Validator security and prevalidation query clients covered with grpc-backed tests for params, gas estimation, validation, and nonce (`pkg/modules/validatorsecurity/client_test.go`, `pkg/modules/prevalidation/client_test.go`).
- [x] VC registry client validation/query happy paths covered (get VC, batch status, verify, list params) via gRPC stub (`pkg/modules/vcregistry/client_validation_test.go`).
- [x] Compliance client validation paths covered (`pkg/modules/compliance/client_validation_test.go`).
- [x] Bridge client validation for lock tokens (`pkg/modules/bridge/client_validation_test.go`).
- [x] AI assistant and identitychange client validation added (`pkg/modules/aiassistant/client_validation_test.go`, `pkg/modules/identitychange/client_validation_test.go`).
- [x] Network security params query covered (`pkg/modules/networksecurity/client_validation_test.go`).
- [x] Confidence score params query covered (`pkg/modules/confidencescore/client_validation_test.go`).
- [x] Wallet security nil-auraClient guard (`pkg/modules/walletsecurity/client_validation_test.go`).
- [x] Economic security params query covered (`pkg/modules/economicsecurity/client_validation_test.go`).
- [x] Data registry params query covered (`pkg/modules/dataregistry/client_validation_test.go`).
- [x] Cryptography params query covered (`pkg/modules/cryptography/client_validation_test.go`).
- [x] Privacy params query covered (`pkg/modules/privacy/client_validation_test.go`).
- [x] Inclusion routines params query covered (`pkg/modules/inclusionroutines/client_validation_test.go`).
- [x] Remaining module clients validated (economicsecurity, dataregistry, cryptography, privacy, inclusionroutines, etc.); no uncovered Go SDK modules remain.

## Phase 4 — Faucet
- [x] Abuse detector limits/risk scoring exercised (`faucet/backend/pkg/abuse/detector_test.go`).
- [x] Captcha generation/validation/TTL tests (`faucet/backend/pkg/captcha/captcha_test.go`).
- [x] Proof-of-work generation/verification/expiration and adaptive difficulty (`faucet/backend/pkg/pow/proof_of_work_test.go`).
- [x] Rate limiting (Redis) + TTL coverage (`faucet/backend/pkg/ratelimit/ratelimit_test.go`) using miniredis.
- [x] Metrics tracker summary/recording (`faucet/backend/pkg/metrics/tracker_test.go`).
- [x] Database layer covered via sqlmock (migrations, CRUD/history, stats) (`faucet/backend/pkg/database/database_test.go`).
- [x] API handler unit tests with mocked dependencies for health/info/recent/requests + rate-limit/balance paths (`faucet/backend/pkg/api/handler_test.go`).

## Upcoming phases
- [x] Phase 2: Go SDK coverage (all module clients validated).
- [x] Phase 3: Chain modules (identity, vcregistry, compliance) keeper suites.
  - Identity msg_server bech32/signature validation fixed; all identity keeper tests now green (`go test ./x/identity/...`).
  - VCRegistry and Compliance keeper suites executed cleanly (`go test ./x/vcregistry/...`, `go test ./x/compliance/...`).
- [x] Phase 4: Faucet backend database/API wiring.
- [x] Phase 5: Explorer smoke tests added (`explorer/test_api_endpoints.py`) covering health, search, blocks, validators, tx, staking delegations, supply; full contract coverage still pending.
- [ ] Phase 7: React Native SDK hooks/provider/storage tests + CI workflow.

## How to run
- Core tests with coverage: `pnpm test:coverage`
- Focused core type tests: `pnpm -C packages/core test src/types/__tests__`
- Mutation testing (core): `pnpm test:mutation`
