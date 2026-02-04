# Performance / Memory & API Stability Audit

Date: 2026-02-04

Scope: runtime-critical code paths in `src/` (websocket client, protocol, chart/study parsing, HTTP endpoints) + tooling (`scripts/`).

This document is an add-on to:
- `CODEBASE_AUDIT_RECOMMENDATIONS.md` (general audit)
- `docs/AUDIT_REPORT.md` (previous audit snapshot)

---

## 1) Key takeaways (prioritized)

### P0 – Stability regressions likely over time
- **`getUser()` is HTML + regex scraping** (`src/miscRequests.js`) → likely to break when TradingView changes markup/escaping.
- **Undocumented endpoints** (`scanner`, `pine-facade`, `charts-storage`, websocket protocol) → protocol drift will happen.
- **Error-handling is often “best effort”** (warn + drop frames; treat 4xx as success) → failures can be silent or confusing.

### P1 – Performance/memory risks in long-running bots
- Chart/study maintain large in-memory maps and frequently **sort or rebuild** arrays.
- Graphics parsing materializes many arrays each access.
- Reconnection/heartbeat loops and listener maps can leak if not carefully cleared.

### P2 – Tooling already contains useful benchmark patterns
- `scripts/stress_test_deep_history.js` already uses a **resource monitor** and dynamic concurrency tuning.
- That should be formalized as a repeatable perf regression benchmark.

---

## 2) Performance & memory hotspots

### 2.1 Chart periods storage & sorting (`src/chart/session.js`)

**What happens**
- Incoming `$prices` updates populate `#periods` as an object keyed by timestamp.
- `periods` getter returns a sorted cached array (`#periodsCache`), recomputed when dirty:
  - `Object.values(...).sort(...)` is (O(n log n)) and allocates a new array.
- `#maxPeriods` pruning exists and is used to trim oldest bars.

**Risk**
- Large deep-history fetches (5k–50k bars) can cause:
  - high GC pressure due to object/value array creation
  - repeated `Object.keys()` and `Object.values()` allocations
  - CPU spikes due to sorting

**Recommendations**
- Keep an ordered structure:
  - Option A: maintain a sorted array and insert/append based on timestamps (most updates are append-only).
  - Option B: keep a `Map<number, PricePeriod>` plus a min-heap/array of times.
- Add a `periodsSince(ts)` iterator or “streaming callback” to avoid repeatedly materializing full arrays.
- Expose a public `maxCandles` option instead of growing `#maxPeriods` implicitly in `fetchMore()`.

### 2.2 Study graphics parsing and repeated allocation (`src/chart/study.js`, `src/chart/graphicParser.js`)

**What happens**
- Study stores raw `#graphic` map (type → id → item).
- `graphic` getter constructs a translator mapping and calls `graphicParser()`.
- `graphicParser()` uses repeated `Object.values(...).map(...)` for labels/lines/boxes/tables/etc.

**Risk**
- For indicators that draw a lot, every `study.graphic` access becomes a full rebuild of normalized data.

**Recommendations**
- Cache normalized graphics and invalidate only when `graphicsCmds` is received.
- Provide `getGraphic({ raw: true })` or `graphicRaw` to allow advanced users to avoid normalization.
- Consider a small object pool or reuse arrays where possible.

### 2.3 Protocol parsing and JSON overhead (`src/protocol.js`)

**What happens**
- `parseWSPacket`:
  - `replace` + `split` on regexes
  - `JSON.parse` per frame
  - on parse failure: `console.warn` + drop

**Risk**
- In high-throughput streams this is CPU heavy and can be a bottleneck.

**Recommendations**
- Add an optional “fast path”:
  - avoid `replace(cleanerRgx, '')` if there is no `~h~` substring
  - avoid regex `split` by scanning the framing markers (`~m~len~m~payload`) iteratively
- Surface parse errors via the client error channel; allow a `strictProtocol` option.

### 2.4 TA/scanner bulk payload size (`src/taExtension.js`)

**What happens**
- `TECHNICAL_INDICATORS` is a large constant object.
- Batch TA methods build large `allCols` arrays and request them.

**Risk**
- Large column lists increase payload size and latency; may trigger server-side limits.

**Recommendations**
- Add a guardrail: cap columns per request; split requests automatically.
- Provide preset column sets (light/standard/advanced) rather than encouraging giant lists.

### 2.5 Client heartbeat and reconnection behavior (`src/client.js`)

**What’s good**
- Heartbeat timer and reconnection backoff exist.

**Remaining risks**
- On reconnection, existing sessions are not automatically re-created/resubscribed.
- `#sendQueue` is unbounded (theoretically); could grow if disconnected but still calling `send()`.

**Recommendations**
- Add queue limits (drop policy) + emit warning.
- Add optional session rehydration strategy:
  - keep a registry of “session factories” or “subscriptions” to restore.

---

## 3) API stability risks (upstream drift)

### 3.1 Auth scraping is brittle (`src/miscRequests.js#getUser`)

**Current approach**
- Requests `location` HTML and extracts JSON-like fields using regex.

**Risks**
- Minor markup/escaping changes can break parsing.
- Incorrect partial matches can yield subtly wrong values.

**Recommendations**
- Prefer a JSON endpoint if available (even if internal).
- If HTML must be used:
  - parse the embedded JSON state blob (search for a `<script>` assignment and parse JSON)
  - validate the presence of required keys
  - include diagnostics (e.g., capture a short snippet around the match) in debug mode
- Introduce `AuthError` with actionable messages (expired session vs markup change).

### 3.2 Undocumented HTTP endpoints (scanner / pine-facade / charts-storage)

**Observed endpoints**
- `https://scanner.tradingview.com/global/scan`
- `https://symbol-search.tradingview.com/symbol_search/v3`
- `https://pine-facade.tradingview.com/pine-facade/*`
- `https://charts-storage.tradingview.com/charts-storage/get/layout/*`
- `https://www.tradingview.com/chart-token`

**Risks**
- Rate limits / bot detection
- Required headers/origin changes
- Param and response shape changes

**Recommendations**
- Centralize endpoint definitions and add versioned adapters:
  - `src/endpoints.ts|js` with known paths and minimal wrappers
- Add resilient parsing:
  - tolerate missing fields
  - schema-validate critical fields (zod/valibot) when `strict` enabled
- Add automatic retries only for clearly retryable errors (429/502/503) with backoff.

### 3.3 Websocket protocol drift and framing assumptions

**Risks**
- Frame length calculation uses JS string length in other snapshots; this repo’s `protocol.js` uses `msg.length`.
- Parsing drops unknown/invalid frames.

**Recommendations**
- Use `Buffer.byteLength(msg, 'utf8')` for framing length.
- Provide a `protocolVersion` / capability negotiation hook (even if heuristic).
- Emit a structured `ProtocolError` with packet snippet and context.

### 3.4 “Success” semantics for HTTP are non-standard

**Current pattern**
- `validateStatus: status < 500` treats 4xx as success.

**Risk**
- Consumers may get unexpected payloads and proceed.

**Recommendation**
- Default to axios standard (2xx). For endpoints that return useful payloads on 4xx, handle explicitly.

---

## 4) Concrete improvements (roadmap)

### 4.1 Short-term (1–2 days)
- Add strict/lenient modes:
  - `new Client({ strictProtocol: true, strictHttp: true })`
- Add parsing guards:
  - wrap `JSON.parse(data.ns.d)` in try/catch, emit error
- Centralize endpoints and headers.

### 4.2 Medium-term (3–7 days)
- Refactor protocol parsing to a non-regex streaming parser.
- Add `graphics` caching and invalidation.
- Add chart period storage improvements (incremental ordering, iterators).

### 4.3 Long-term (1–3 weeks)
- Replace HTML scraping auth with a more robust method.
- Add session rehydration on reconnect.
- Publish performance budget benchmarks.

---

## 5) Benchmark & test plan (to prevent regressions)

### 5.1 Performance regression script
- Reuse `scripts/stress_test_deep_history.js` as the baseline.
- Add repeatable output:
  - write JSON report (p50/p95 task time, bars/sec, rss peak).
- Capture Node version + OS info.

### 5.2 Unit tests to add
- `protocol.parseWSPacket()`:
  - handles multiple frames
  - handles ping frames
  - handles invalid JSON (strict vs non-strict)
- `chart/session`:
  - trimming respects `maxCandles`
  - `fetchMoreAsync` resolves on update and times out

### 5.3 Integration tests gating
- Keep current suite, but gate live tests behind `INTEGRATION=1`.

---

## 6) Notes / cross-links

- Existing performance notes are also present in `docs/AUDIT_REPORT.md` and `TROUBLESHOOTING.md#performance-issues`.
- The CLI (`scripts/tv-cli.js`) already contains robustness features (version resolution, parsing responses). It can be a reference implementation for endpoint variance handling.
