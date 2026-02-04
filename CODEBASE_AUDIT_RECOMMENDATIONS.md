# Codebase Audit – redundancies, organization, inconsistencies, incompleteness

Date: 2026-02-04

Scope: repository snapshot in this workspace (`src/`, `scripts/`, `examples/`, `tests/`, docs).

> Note: There is an existing audit document at `docs/AUDIT_REPORT.md`. This report complements it by focusing specifically on **redundancies, code organization, inconsistencies, and incomplete areas** and by adding an updated, prioritized action plan.

---

## Executive summary (highest-impact items)

1. **Redundant implementations and split responsibilities** exist across `src/miscRequests.js` and `src/taExtension.js` (duplicate `fetchScanData`, duplicate `validateStatus`), increasing maintenance cost.
2. **Error handling and HTTP semantics are inconsistent** (frequent `validateStatus: status < 500` treats 4xx as success; mixed `throw` vs `console.error` vs silent returns).
3. **Project organization is partially “monolith-y”** (`src/miscRequests.js` is very large and mixes unrelated concerns: auth, search, indicators, scripts CRUD, drawings, TA/scanner).
4. **Type system is incomplete**: `src/types.js` contains JSDoc typedefs but exports `{}`; tests are TypeScript while library is JS (no published `.d.ts`), which limits DX.
5. **Test/CI incompleteness** in this workspace snapshot: tests exist and are extensive, but there is **no CI workflow** folder here (`.github/workflows` missing). In addition, many tests are live/integration and can be flaky.

---

## Findings

### 1) Redundancies (duplication / overlapping code)

#### 1.1 Duplicate `fetchScanData` in `src/miscRequests.js`
- `src/miscRequests.js` defines `fetchScanData` twice (same name/signature/body).
- `src/taExtension.js` also implements scanner calls.

**Impact**
- Risk of drift when changing request format, endpoint, headers, or error handling.
- Harder to reason about which function is “canonical”.

**Recommendation**
- Keep **one** implementation of scanner post (`scan`) in a dedicated module (e.g. `src/http/scanner.js` or `src/services/scanner.js`).
- Re-export it in `miscRequests` only if needed for backward compatibility.

#### 1.2 Duplicate `validateStatus` logic in multiple modules
- `src/miscRequests.js`: `const validateStatus = (status) => status < 500;`
- `src/taExtension.js`: same.

**Impact**
- Different semantics from axios defaults (2xx). 4xx responses become “successful” and must be manually checked everywhere (often not done).

**Recommendation**
- Move HTTP defaults into `src/http.js` (axios instance) with consistent behavior.
- Prefer axios default `validateStatus` and handle known non-2xx cases explicitly.

#### 1.3 Documentation duplication / drift risk
- There are multiple high-level docs (`README.md`, `ARCHITECTURE.md`, `API_SPEC.md`, `USAGE_EXAMPLES.md`, `TROUBLESHOOTING.md`, `docs/AUDIT_REPORT.md`).

**Impact**
- Easy for API docs to drift from implementation.

**Recommendation**
- Declare a single “source of truth” for API reference:
  - either auto-generate from JSDoc/TS,
  - or keep `API_SPEC.md` authoritative and link from README.

---

### 2) Code organization & module boundaries

#### 2.1 `src/miscRequests.js` is a “god module”
It contains:
- TA/scanner functions
- market search
- indicator search + translation
- authentication (login + user scraping)
- Pine script CRUD endpoints
- chart token + drawings endpoints

**Impact**
- Large file increases merge conflicts and cognitive load.
- Related behaviors (headers, auth cookies, errors) are duplicated rather than centralized.

**Recommendation** (incremental, low-risk refactor)
- Split into feature modules, re-export from a compatibility facade:
  - `src/services/auth.js` (loginUser, getUser)
  - `src/services/search.js` (searchMarketV3, searchMarket)
  - `src/services/indicators.js` (searchIndicator, getIndicator, getPrivateIndicators)
  - `src/services/pineScripts.js` (translate_light, parse_title, save/new, versions, rename, delete)
  - `src/services/layoutsDrawings.js` (getChartToken, getDrawings, layouts)
  - `src/services/ta.js` (scanner/TA)

#### 2.2 Mixed “service layer” and “domain objects”
- `src/classes/*` provides indicator objects.
- `src/miscRequests.js` both fetches and instantiates domain objects.

**Recommendation**
- Adopt a simple layering:
  - `services/*` return raw payloads + normalized DTOs
  - `classes/*` encapsulate behavior/state
  - a top-level “public API” module constructs classes from DTOs

---

### 3) Inconsistencies

#### 3.1 Inconsistent URL/path encoding
- Example: `getIndicator()` uses `id.replace(/ |%/g, '%25')` which is not a correct or complete encoding.
- Later code uses `encodeURIComponent()` in newer functions (e.g., script version endpoints).

**Recommendation**
- Use `encodeURIComponent()` for all path components and query params.

#### 3.2 Inconsistent error strategy and return shapes
Patterns observed:
- Some methods `throw new Error(...)`
- Some methods return `false` on failure (e.g. `getTA` when no data)
- Some parts default to `console.error` if no handler (chart/study/session)
- Protocol parsing logs warnings but continues

**Recommendation**
- Define a consistent policy:
  - Public API methods either **throw** typed errors or return `Result`-style objects.
  - Avoid returning `false` for errors (ambiguous with real falsey data).
  - Expose errors via events *and/or* returned promises, but keep it consistent.

#### 3.3 Logging/debug behavior differs by module
- `global.TW_DEBUG` is used across modules for debug logging.

**Recommendation**
- Replace global flag with injectable logger or client-level debug option propagated down:
  - `new Client({ logger, debug })`
  - `logger.debug/info/warn/error`

#### 3.4 HTTP defaults are partially centralized, partially per-call
- `src/http.js` already centralizes axios creation (timeout + origin).
- But many calls still set `headers.origin` per-call and use custom `validateStatus`.

**Recommendation**
- Push shared defaults into `src/http.js`:
  - `baseURL` where possible
  - default headers
  - consistent `timeout`
  - consistent error mapping

---

### 4) Incompleteness / gaps

#### 4.1 Type exports are incomplete
- `src/types.js` defines JSDoc typedefs but exports `{}`.

**Impact**
- Consumers do not get types from the package.
- Tests are TS, so internal contributors get types in tests, but library users don’t.

**Recommendation options**
1. **Publish `.d.ts`** generated from JSDoc (via TypeScript `checkJs` + `declaration` emit), or
2. Gradually migrate to TS starting with `types.ts` and public API surfaces.

#### 4.2 Missing CI workflows in this workspace snapshot
- `.github/workflows` does not exist here.

**Impact**
- No automated enforcement of tests/lint/audit on PRs (in this snapshot).

**Recommendation**
- Add GitHub Actions workflows:
  - `tests.yml`: run `pnpm install` + `pnpm test` on Node 18/20/22
  - optional `integration-tests.yml`: gated by secrets/env var
  - `lint.yml`: eslint
  - `audit.yml`: `pnpm audit --omit=dev --audit-level=high` (or use `pnpm audit signatures` depending on policy)

#### 4.3 Integration-test flakiness risk
- Many tests appear to be network/websocket integration tests.

**Recommendation**
- Split into:
  - Unit tests (protocol framing, parsing, session id, pure transforms)
  - Integration tests (live TradingView)
- Gate integration tests behind `INTEGRATION=1`.

#### 4.4 Defensive parsing and resilience
- `protocol.parseWSPacket()` warns and drops frames on JSON parse failure.
- `chart/study.js` uses `JSON.parse()` on server-provided content; errors would throw inside listeners.

**Recommendation**
- Wrap parsing in try/catch and surface errors via the client/session error channel.
- Consider adding “strict mode” to fail fast when protocol format changes.

---

## Quick wins (high ROI)

### A) Remove duplication
- Remove one of the duplicate `fetchScanData` definitions in `src/miscRequests.js`.
- Decide where scanner logic lives (prefer `src/taExtension.js` or new `services/ta.js`) and route calls through it.

### B) Standardize HTTP semantics
- Use axios default `validateStatus` (2xx) and handle expected error codes explicitly.
- Centralize headers and timeouts in `src/http.js`.

### C) Improve DX via types
- Add `.d.ts` generation or migrate the exported surface to TS.

---

## Medium-term refactor plan (safe, incremental)

1. Introduce `src/services/*` modules.
2. Keep `src/miscRequests.js` as a *facade* that re-exports from those services (avoid breaking changes).
3. Add consistent error classes (e.g. `AuthError`, `HttpError`, `ProtocolError`).
4. Add logger injection and remove `global.TW_DEBUG` reliance.

---

## Potential breaking changes (flag before doing)

- Changing `validateStatus` behavior may change current consumer flows relying on 4xx responses being returned as data.
- Changing return values from `false` to `throw` is a contract change.

Mitigation: introduce “vNext” methods or options (e.g., `{ strictHttp: true }`).

---

## Checklist of recommended actions

- [ ] Deduplicate `fetchScanData` and `validateStatus`.
- [ ] Split `miscRequests` into `services/` modules.
- [ ] Standardize encoding (`encodeURIComponent`) for all ids.
- [ ] Define and document error-handling conventions.
- [ ] Provide type declarations (`.d.ts`) or migrate to TS.
- [ ] Add CI workflows (tests/lint/audit) in `.github/workflows/`.
- [ ] Split unit vs integration tests.

---

## Appendix: notable files

- Entry point: `main.js`
- Websocket client: `src/client.js`
- Protocol framing/parsing: `src/protocol.js`
- HTTP client: `src/http.js`
- Monolithic HTTP/service module: `src/miscRequests.js`
- TA extension: `src/taExtension.js`
- Chart session/study: `src/chart/session.js`, `src/chart/study.js`
- Quote session: `src/quote/session.js`
- Existing audit: `docs/AUDIT_REPORT.md`
