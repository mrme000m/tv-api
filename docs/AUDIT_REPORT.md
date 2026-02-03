# TradingView-API Codebase Audit (workspace)

Date: 2026-02-03

Scope: source code under `src/`, package metadata (`package.json`), and CI workflow (`.github/workflows/tests.yml`).

> Notes
> - This project is an integration client for TradingView’s public/private web endpoints. As such, long-term stability is impacted by upstream, undocumented API changes.
> - I ran the existing test suite (`vitest run`). It passed in this environment, but most tests are network/integration tests and can be flaky depending on TradingView availability.

---

## 1. Project overview

### What the library does
- Establishes a websocket connection to TradingView socket endpoint and speaks TradingView’s framing protocol.
- Creates **Quote** sessions and **Chart** sessions.
- For charts, creates **Study** objects for indicators (built-in and Pine scripts) and parses plot/graphics/strategy reports.
- Uses axios to call multiple HTTP endpoints:
  - symbol search
  - scanner/TA
  - pine-facade endpoints (indicator search/translate)
  - auth scraping (`getUser`) and login (`loginUser`)
  - chart token + drawings APIs

### Repo / CI
- Tests workflow: `.github/workflows/tests.yml` runs on Node **14.x, 18.x, 19.x** and supplies auth secrets for authenticated tests.

---

## 2. Automated tests & confidence

### Test suite results
- `npx vitest run` reported:
  - **9 test files passed**, **60 tests passed**, **5 skipped**.
- Skipped tests are typically those that require auth secrets (`SESSION`, `SIGNATURE`).

### Observations
- Most tests appear to be **live integration** tests (real network calls + real websocket).
- Strength: validates end-to-end behavior.
- Weakness: can become flaky due to rate limits, endpoint changes, network issues, or TradingView defenses.

**Recommendations**
1. Split into two tiers:
   - **Unit tests** (protocol framing, parsing, session ID generation, pure transformations)
   - **Integration tests** gated behind an env var (e.g. `INTEGRATION=1`) or a separate workflow.
2. Set explicit per-test timeouts and ensure every Promise chain has a rejection path.

---

## 3. Dependency and security audit (HIGH priority)

### Summary
`npm audit --omit=dev` reports **4 runtime vulnerabilities** (1 critical, 2 high, 1 moderate) across:
- `axios` (direct dependency)
- `ws` (direct dependency)
- transitive deps typically seen with axios chains (`follow-redirects`, `form-data`)

> The exact advisory list depends on your npm version and lockfile state; the audit output in this workspace indicates fixes are available.

### Affected direct dependencies
From `package.json`:
- `axios: ^1.5.0`
- `ws: ^7.4.3`

Both are in ranges that `npm audit` flags.

**Recommendations**
1. Upgrade runtime deps:
   - `ws` → **v8.x** (e.g. `^8.19.0`)
   - `axios` → latest **1.x** that clears advisories (currently audits often recommend `>=1.12.x` or later).
2. Add CI check:
   - `npm audit --omit=dev --audit-level=high`
3. Consider raising minimum Node:
   - Node 14 is EOL; supporting it increases attack surface and limits modern TLS/runtime improvements.

---

## 4. Core websocket client (`src/client.js`) — correctness & resilience

### 4.1 `end()` does not wait for socket close (BUG / API mismatch)
File: `src/client.js`

```js
end() {
  return new Promise((cb) => {
    if (this.#ws.readyState) this.#ws.close();
    cb();
  });
}
```
- The promise resolves immediately; callers cannot reliably `await client.end()`.
- Can lead to:
  - tests that “pass” but real apps that exit early
  - leaked timers/listeners in long-running processes

**Recommendation**
- Resolve on the websocket `'close'` event and reject on timeout.

### 4.2 Login/auth state is conflated with “queue flush allowed”
- `#logged` is used as a gate to send queued packets.
- For unauthenticated users `#logged` is set true immediately.
- For authenticated users, `#logged` becomes true after `misc.getUser()` returns (HTML scraping), not after server confirms auth.

Symptoms:
- The `logged` event is emitted in `#parsePacket()` when `!this.#logged` on first packets, which is not a reliable “auth successful” indicator.

**Recommendations**
- Separate state machine:
  - `connected` (ws open)
  - `auth_sent`
  - `auth_confirmed` or `auth_failed`
- Rename events to match semantics.

### 4.3 Lack of reconnect/backoff
- On close, the client emits `disconnected` and stops.

**Recommendation**
- Add optional `autoReconnect` with exponential backoff and maximum retries.

### 4.4 Packet length uses `msg.length` (potential framing issue)
File: `src/protocol.js`

```js
return `~m~${msg.length}~m~${msg}`;
```
- `msg.length` is UTF-16 code units; websocket framing may expect byte length.
- If non-ASCII characters appear, computed length may be wrong.

**Recommendation**
- Use `Buffer.byteLength(msg, 'utf8')`.

### 4.5 Protocol parsing drops invalid frames silently
File: `src/protocol.js`
- `parseWSPacket` catches JSON parse errors and `console.warn`s.
- That can hide protocol drift.

**Recommendation**
- Surface parse errors via `client.onError` or a dedicated event.

---

## 5. Chart session (`src/chart/session.js`) — performance & reliability

### 5.1 Unbounded candle storage
- `#periods` is an object keyed by timestamp; `fetchMore()` can grow without bound.

Impact:
- Memory growth in long-running bots.

**Recommendations**
- Provide `maxCandles` option and prune oldest.
- Provide `clearPeriods()` / `reset()`.

### 5.2 `periods` getter sorts on every access
```js
get periods() {
  return Object.values(this.#periods).sort((a, b) => b.time - a.time);
}
```
Impact:
- O(n log n) every call.

**Recommendations**
- Maintain ordered array and append/merge in-place.
- Or cache sorted list and invalidate on updates.

### 5.3 Replay promises can hang forever + leak callbacks
Replay methods store callbacks in `#replayOKCB` and resolve only on `replay_ok`.
If the server never answers, those entries remain forever.

**Recommendation**
- Add timeout + cleanup and reject with a meaningful error.

---

## 6. Study parsing (`src/chart/study.js`) — robustness & memory

### 6.1 Unbounded storage for plots/graphics/report
- `#periods`, `#graphic`, `#strategyReport` can grow without limits.

**Recommendations**
- Introduce limits and pruning policies.
- Provide methods to clear graphics/history.

### 6.2 `JSON.parse(data.ns.d)` without guardrails
If upstream changes format or sends invalid JSON, this will throw inside the listener.

**Recommendation**
- Wrap parse in try/catch and raise `onError`.

### 6.3 Strategy report decompression (`parseCompressed`) assumptions
`parseCompressed` assumes `zip.file('')` exists.
If TradingView changes the zip structure, this can throw.

**Recommendation**
- Validate zip entries and provide clearer errors.

---

## 7. HTTP layer (`src/miscRequests.js`) — brittleness & correctness

### 7.1 `getUser()` is HTML-scraping with regex (brittle)
File: `src/miscRequests.js`

```js
if (data.includes('auth_token')) {
  return {
    id: /"id":([0-9]{1,10}),/.exec(data)?.[1],
    username: /"username":"(.*?)"/.exec(data)?.[1],
    ...
    authToken: /"auth_token":"(.*?)"/.exec(data)?.[1],
  };
}
```
- Highly sensitive to upstream markup changes and escaping.

**Recommendations**
- Prefer a JSON endpoint if available.
- Otherwise parse an embedded JSON blob in a more structured way.
- At least validate required fields and fail with explicit diagnostics.

### 7.2 Incomplete URL encoding
```js
const indicID = id.replace(/ |%/g, '%25');
```
This is not safe encoding.

**Recommendation**
- Use `encodeURIComponent` for path parameters.

### 7.3 No axios timeouts
Calls do not specify `timeout`, which can cause hangs.

**Recommendation**
- Create an axios instance with `timeout` default (e.g. 15s) and consistent headers.

### 7.4 `validateStatus: status < 500`
This treats 4xx responses as “successful” and can hide failures.

**Recommendation**
- Default to 2xx only; handle known non-2xx explicitly.

---

## 8. API design / DX improvements

### 8.1 Replace `console.error` default behavior
Across client/session/study, if no error handler is registered, code uses `console.error`.

**Recommendation**
- Always emit errors; optionally allow a logger injection or a `debug` mode.

### 8.2 Stronger types / TS
The project is JSDoc-heavy; tests are TS.

**Recommendation**
- Consider publishing `.d.ts` type declarations or migrating core to TS for stronger API contracts.

### 8.3 Event emitter abstraction
Current implementation is bespoke arrays of callbacks.

**Recommendation**
- Consider Node’s `EventEmitter` or a small typed event emitter wrapper to:
  - simplify cleanup (`removeListener`)
  - avoid memory leaks
  - support `once` semantics

---

## 9. Prioritized remediation plan

### Quick wins (1–2 hours)
1. Upgrade `ws` and `axios` to clear `npm audit --omit=dev` issues.
2. Fix `Client.end()` to await close.
3. Add axios default timeout.

### Medium (1–3 days)
1. Replay timeouts and callback cleanup.
2. Limit/prune storage for candles/study periods/graphics.
3. Improve packet framing to use byte length.

### Larger refactors (multi-day)
1. Auth/login state machine & clearer semantics.
2. Robust `getUser()` parsing or endpoint change.
3. Test suite split: unit vs integration.

---

## 10. Appendix: CI notes
CI matrix includes Node 14/18/19. Consider switching to maintained versions (e.g. 18/20/22).

---

If you want, I can implement the top quick wins in a PR-ready change set (dependency upgrades + `Client.end()` fix + axios timeout defaults) and re-run the tests.
