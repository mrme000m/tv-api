const fs = require('fs');
const path = require('path');
const os = require('os');
const TradingView = require('../main');

function loadSymbols() {
  const argPath = process.argv.find((arg) => arg.startsWith('--symbols='));
  const filePath = (argPath && argPath.split('=')[1]) || process.env.SYMBOLS_FILE || process.env.SYMBOLS_JSON;
  const inline = process.env.SYMBOLS;

  if (filePath) {
    const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    const raw = fs.readFileSync(abs, 'utf8');
    const t = raw.trim();
    if (!t) return [];

    // JSON file (array of symbol strings)
    if (t[0] === '[') {
      try {
        const arr = JSON.parse(t);
        if (Array.isArray(arr)) return arr.map(String).map((s) => s.trim()).filter(Boolean);
      } catch (e) { /* fallthrough to other parsers */ }
    }

    // CSV file with a header containing 'tv_id' or plain CSV
    const firstLine = t.split(/\r?\n/)[0] || '';
    if (path.extname(abs).toLowerCase() === '.csv' || /tv[_ ]?id/i.test(firstLine)) {
      const lines = t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const header = lines.shift().split(',').map((h) => h.trim());
      const idx = header.findIndex((h) => /^tv[_ ]?id$/i.test(h));
      if (idx >= 0) {
        return lines.map((l) => {
          const cols = l.split(',');
          return (cols[idx] || '').trim();
        }).filter(Boolean);
      }
    }

    // Fallback: newline-separated list
    return t
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));
  }

  if (inline) {
    return inline
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  throw new Error('No symbols provided. Use --symbols=path.txt, --symbols=path.json, SYMBOLS_FILE, SYMBOLS_JSON, or SYMBOLS env var.');
}

function parseList(envValue, fallback) {
  if (!envValue) return fallback;
  return envValue
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

function nowMs() {
  return Date.now();
}

// Runtime concurrency/resource control (declared top-level so runWithConcurrency can reference them)
let currentConcurrency = 1;
let targetConcurrency = 1;
let minConcurrency = 1;
let maxLoadPerCore = 0.75;
let maxMemoryPercent = 0.8;
let cooldownMs = 5000;
let resourceMonitorInterval = null;
let lastAdjustment = 0;

async function fetchDeepHistory(client, symbol, timeframe, options) {
  const {
    targetBars,
    fetchBatch,
    initialRange,
    timeoutMs,
    maxFetches,
  } = options;

  const chart = new client.Session.Chart();
  const started = nowMs();

  return new Promise((resolve, reject) => {
    let pendingFetch = false;
    let fetchCount = 0;
    let lastLen = 0;
    let resolved = false;

    const cleanup = () => {
      if (resolved) return;
      resolved = true;
      try { chart.delete(); } catch (e) { /* noop */ }
    };

    const done = (status) => {
      cleanup();
      resolve({
        symbol,
        timeframe,
        status,
        bars: chart.periods?.length || 0,
        fetches: fetchCount,
        ms: nowMs() - started,
      });
    };

    const fail = (err) => {
      cleanup();
      reject(err);
    };

    const timer = setTimeout(() => {
      done('timeout');
    }, timeoutMs);

    chart.onError((error) => {
      clearTimeout(timer);
      fail(error);
    });

    chart.onUpdate(() => {
      const len = chart.periods?.length || 0;
      pendingFetch = false;

      if (len >= targetBars) {
        clearTimeout(timer);
        done('ok');
        return;
      }

      if (fetchCount >= maxFetches) {
        clearTimeout(timer);
        done('max-fetches');
        return;
      }

      if (len === lastLen && len > 0 && fetchCount > 0) {
        // No growth since last update; still try more data.
      }

      lastLen = len;

      if (!pendingFetch) {
        pendingFetch = true;
        fetchCount += 1;
        chart.fetchMore(fetchBatch);
      }
    });

    chart.setMarket(symbol, {
      timeframe,
      range: Math.min(initialRange, targetBars),
    });
  });
}

async function runWithConcurrency(items, limit, worker) {
  const results = [];
  const queue = [...items];
  const active = new Set();

  const next = async () => {
    if (queue.length === 0) return;
    const item = queue.shift();
    const p = (async () => worker(item))()
      .then((res) => results.push(res))
      .catch((err) => results.push({ error: err, item }))
      .finally(() => active.delete(p));
    active.add(p);

    while (active.size >= Math.max(1, currentConcurrency)) {
      // Wait for at least one active task to finish before starting more when at cap
      await Promise.race(active);
    }

    await next();
  };

  await next();
  await Promise.all(active);
  return results;
}

(async () => {
  // Simple CLI parsing for overrides
  const argv = process.argv.slice(2);
  const argVal = (name) => {
    const a = argv.find((arg) => arg.startsWith(`--${name}=`));
    if (a) return a.split('=')[1];
    const idx = argv.indexOf(`--${name}`);
    if (idx >= 0 && idx + 1 < argv.length) return argv[idx + 1];
    return undefined;
  };

  if (argv.includes('--help') || argv.includes('-h')) {
    console.log('Usage: node stress_test_deep_history.js [options]');
    console.log('\nOptions:');
    console.log('  --symbols=path           Path to symbols (json/csv/newline list).');
    console.log('  --limit=N                Limit to first N symbols.');
    console.log('  --timeframes=1,5,15      Override timeframes (comma-separated).');
    console.log('  --add-timeframes=60,240  Append additional timeframes.');
    console.log('  --target-bars=N          Number of bars to fetch per timeframe (alias: --period, --targetBars).');
    console.log('  --fetch-batch=N          Bars per request_more_data call (default: 500).');
    console.log('  --initial-range=N        Initial range passed to setMarket (default: 200).');
    console.log('  --concurrency=N          Number of concurrent tasks.');
    console.log('  --timeout-ms=N           Per-task timeout in ms.');
    console.log('  --max-fetches=N          Max fetchMore calls per task.');
    console.log('  --debug                  Enable verbose library debug logs (sets global.TW_DEBUG and client DEBUG).');
    console.log('  --ramp                   Run auto-ramp mode and exit (sample-based concurrency tuning)');
    console.log('  --ramp-workers=1,2,4     Comma list of worker counts to test (default: 1,2,4,8)');
    console.log('  --ramp-sample=N          Number of sample tasks to use for each trial (default: 20)');
    console.log('  --ramp-repeat=N          Number of repeats per trial (default: 1)');
    console.log('  --ramp-out=path.json     Write recommendation JSON (contains recommended_concurrency)');
    console.log('  --ramp-env-out=path.env  Write env suggestion file (e.g., RAMP_RECOMMENDED_CONCURRENCY=4)');

    process.exit(0);
  }

  // Debug option (also compatible with env TW_DEBUG=1)
  const debugEnabled = argv.includes('--debug') || process.env.TW_DEBUG === '1';
  if (debugEnabled) {
    global.TW_DEBUG = true;
    process.env.TW_DEBUG = '1';
  }

  let symbols = loadSymbols();

  // CLI overrides
  const cliLimit = Number(argVal('limit') || process.env.LIMIT || 0) || 0;
  if (cliLimit > 0) symbols = symbols.slice(0, cliLimit);

  let timeframes = parseList(argVal('timeframes') || process.env.TIMEFRAMES, ['1', '5', '15', '60', '240', 'D']);
  const addTF = parseList(argVal('add-timeframes') || process.env.ADD_TIMEFRAMES, []);
  if (addTF.length) timeframes = [...new Set([...timeframes, ...addTF])];

  const targetBars = Number(argVal('target-bars') || argVal('targetBars') || argVal('period') || process.env.TARGET_BARS || 5000);
  const fetchBatch = Number(argVal('fetch-batch') || process.env.FETCH_BATCH || 500);
  const initialRange = Number(argVal('initial-range') || process.env.INITIAL_RANGE || 200);
  const timeoutMs = Number(argVal('timeout-ms') || process.env.TIMEOUT_MS || 60000);
  const maxFetches = Number(argVal('max-fetches') || process.env.MAX_FETCHES || 20);
  const concurrency = Number(argVal('concurrency') || process.env.CONCURRENCY || 5);

  // Auto-ramp mode options
  const rampMode = !!(argv.includes('--ramp') || process.env.RAMP);
  const rampWorkersArg = argVal('ramp-workers') || process.env.RAMP_WORKERS || '1,2,4,8';
  const rampWorkers = rampWorkersArg.split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n) && n > 0);
  const rampSample = Number(argVal('ramp-sample') || process.env.RAMP_SAMPLE || 20);
  const rampRepeats = Number(argVal('ramp-repeat') || process.env.RAMP_REPEAT || 1);
  const rampOut = argVal('ramp-out') || process.env.RAMP_OUT || null;
  const rampEnvOut = argVal('ramp-env-out') || process.env.RAMP_ENV_OUT || null;

  // Runtime resource safety thresholds and controls
  const maxLoadPerCore = Number(argVal('max-load') || process.env.MAX_LOAD || 0.75); // fraction of a CPU core
  const maxMemoryPercent = Number(argVal('max-memory-percent') || process.env.MAX_MEMORY_PERCENT || 0.8); // fraction of total RAM
  const minConcurrency = Math.max(1, Number(argVal('min-concurrency') || process.env.MIN_CONCURRENCY || 1));
  const cooldownMs = Number(argVal('cooldown-ms') || process.env.COOLDOWN_MS || 5000);

  // Dynamic concurrency control (currentConcurrency can be adjusted at runtime)
  targetConcurrency = Number(concurrency);
  currentConcurrency = targetConcurrency;
  resourceMonitorInterval = null;
  lastAdjustment = 0;

  console.log('Stress test config:', {
    symbols: symbols.length,
    limit: cliLimit || 'none',
    timeframes,
    targetBars,
    fetchBatch,
    initialRange,
    timeoutMs,
    maxFetches,
    concurrency,
    maxLoadPerCore,
    maxMemoryPercent,
    minConcurrency,
    cooldownMs,
  });

  if (symbols.length < 200) {
    console.warn(`⚠️ Only ${symbols.length} symbols provided. For a 200-symbol stress test, supply at least 200.`);
  }

  const clientOptions = {};
  if (process.env.SESSION && process.env.SIGNATURE) {
    clientOptions.token = process.env.SESSION;
    clientOptions.signature = process.env.SIGNATURE;
  }
  if (debugEnabled) clientOptions.DEBUG = true;

  const client = new TradingView.Client(clientOptions);

  const tasks = [];
  for (const symbol of symbols) {
    for (const timeframe of timeframes) {
      tasks.push({ symbol, timeframe });
    }
  }

  const started = nowMs();
  const totalTasks = tasks.length;

  // Runtime resource monitor (adjusts `currentConcurrency` up/down)
  function startResourceMonitor() {
    resourceMonitorInterval = setInterval(() => {
      const load = os.loadavg()[0] || 0;
      const cpuCount = Math.max(1, os.cpus().length || 1);
      const perCore = load / cpuCount;
      const rss = process.memoryUsage().rss || 0;
      const memPercent = rss / os.totalmem();
      const now = Date.now();

      // Avoid flapping
      if (now - lastAdjustment < cooldownMs) return;

      if ((perCore > maxLoadPerCore || memPercent > maxMemoryPercent) && currentConcurrency > minConcurrency) {
        currentConcurrency = Math.max(minConcurrency, currentConcurrency - 1);
        lastAdjustment = now;
        console.log(`⚠️ Resource pressure detected. Reducing concurrency to ${currentConcurrency} (load=${perCore.toFixed(2)}, mem=${(memPercent*100).toFixed(0)}%)`);
      } else if ((perCore < maxLoadPerCore * 0.6 && memPercent < maxMemoryPercent * 0.6) && currentConcurrency < targetConcurrency) {
        currentConcurrency = Math.min(targetConcurrency, currentConcurrency + 1);
        lastAdjustment = now;
        console.log(`✅ Resources recovered. Increasing concurrency to ${currentConcurrency} (load=${perCore.toFixed(2)}, mem=${(memPercent*100).toFixed(0)}%)`);
      }
    }, 2000);
  }

  function stopResourceMonitor() {
    if (resourceMonitorInterval) {
      clearInterval(resourceMonitorInterval);
      resourceMonitorInterval = null;
    }
  }

  // Run an optional ramp test to discover best concurrency
  async function runRampTest(tasks, workersList, sampleSize = 20, repeats = 1) {
    console.log('\n🔬 Starting auto-ramp test...');
    const sampleTasks = tasks.slice(0, Math.min(sampleSize, tasks.length));
    if (sampleTasks.length === 0) throw new Error('No tasks available for ramp test');

    const results = [];
    const origTarget = targetConcurrency;
    const origCurrent = currentConcurrency;

    for (const w of workersList) {
      let accBars = 0;
      let accTasks = 0;
      let accMs = 0;

      for (let r = 0; r < repeats; r += 1) {
        console.log(`\n▶ Trial: concurrency=${w} (repeat ${r + 1}/${repeats})`);
        targetConcurrency = w;
        currentConcurrency = w;

        // Run the sample tasks (short, deterministic)
        const start = nowMs();
        const res = await runWithConcurrency(sampleTasks, w, async ({ symbol, timeframe }) => {
          return fetchDeepHistory(client, symbol, timeframe, {
            targetBars: Math.min(100, targetBars), // use smaller target for ramp quickness
            fetchBatch,
            initialRange,
            timeoutMs,
            maxFetches: Math.max(3, Math.min(10, maxFetches)),
          });
        });

        const ms = nowMs() - start;
        const bars = res.reduce((sum, r) => sum + (r?.bars || 0), 0);
        accBars += bars;
        accTasks += res.length;
        accMs += ms;

        console.log(`  Result: ${res.length} tasks, ${bars} bars in ${ms}ms`);
        // brief cooldown
        await new Promise((r2) => setTimeout(r2, 200));
      }

      const avgBarsPerSec = accBars / (accMs / 1000);
      const avgTasksPerSec = accTasks / (accMs / 1000);
      results.push({ concurrency: w, avgBarsPerSec, avgTasksPerSec, accBars, accTasks, accMs });

      console.log(`→ concurrency=${w} => ${avgBarsPerSec.toFixed(2)} bars/s, ${avgTasksPerSec.toFixed(2)} t/s`);
    }

    // restore concurrency
    targetConcurrency = origTarget;
    currentConcurrency = origCurrent;

    // Pick best by max avgBarsPerSec while respecting safety caps (we already use monitor)
    results.sort((a, b) => b.avgBarsPerSec - a.avgBarsPerSec);
    const best = results[0];

    console.log('\n🔎 Ramp test complete — summary:');
    results.forEach((r) => {
      console.log(`  workers=${r.concurrency}: ${r.avgBarsPerSec.toFixed(2)} bars/s, ${r.avgTasksPerSec.toFixed(2)} t/s`);
    });
    console.log(`\n✅ Recommended concurrency: ${best.concurrency} (best avg ${best.avgBarsPerSec.toFixed(2)} bars/s)`);

    // Optionally write recommendation to JSON and/or env file
    try {
      if (rampOut) {
        const outPath = path.isAbsolute(rampOut) ? rampOut : path.join(process.cwd(), rampOut);
        const payload = {
          recommended_concurrency: best.concurrency,
          measured_at: new Date().toISOString(),
          metrics: results.map((x) => ({ concurrency: x.concurrency, avgBarsPerSec: x.avgBarsPerSec, avgTasksPerSec: x.avgTasksPerSec }))
        };
        fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
        console.log(`💾 Ramp recommendation saved to: ${outPath}`);
      }

      if (rampEnvOut) {
        const envPath = path.isAbsolute(rampEnvOut) ? rampEnvOut : path.join(process.cwd(), rampEnvOut);
        const envContents = `# Ramp recommendation\nRAMP_RECOMMENDED_CONCURRENCY=${best.concurrency}\n`;
        fs.writeFileSync(envPath, envContents);
        console.log(`💾 Ramp env suggestion saved to: ${envPath}`);
      }
    } catch (e) {
      console.error('Failed to write ramp output files:', e?.message || e);
    }

    return { results, best };
  }

  // Start monitoring resources before tasks begin
  startResourceMonitor();

  // If ramp mode requested, run ramp test and exit
  if (rampMode) {
    console.log('⚡ Running auto-ramp mode (this uses a small sample).');
    const rampReport = await runRampTest(tasks, rampWorkers, rampSample, rampRepeats, rampOut, rampEnvOut);
    console.log('\nExiting after ramp test. To run full test, re-run without --ramp.');
    await client.end();
    process.exit(0);
  }

  // Progress tracking
  let completedCount = 0;
  let okCount = 0;
  let timeoutCount = 0;
  let maxedCount = 0;
  let errorCount = 0;
  let totalBarsFetched = 0;
  let totalTimeMsSum = 0;

  function formatETA(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return '0s';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m${s}s`;
  }

  function printProgress(prefix = '[progress]') {
    const elapsed = Math.max(1, nowMs() - started);
    const avgMs = completedCount ? totalTimeMsSum / completedCount : 0;
    const rateTasksPerSec = (completedCount / (elapsed / 1000)) || 0;
    const barsPerSec = (totalBarsFetched / (elapsed / 1000)) || 0;
    const remaining = Math.max(0, totalTasks - completedCount);
    const etaSec = avgMs ? (avgMs * remaining) / 1000 : 0;
    const pct = totalTasks ? (completedCount / totalTasks) * 100 : 0;

    console.log(`${prefix} ${completedCount}/${totalTasks} (${pct.toFixed(1)}%) ETA: ${formatETA(etaSec)} rate: ${rateTasksPerSec.toFixed(2)} t/s, ${barsPerSec.toFixed(1)} bars/s (concurrency: ${currentConcurrency}) avg:${avgMs.toFixed(0)}ms`);
  }

  // Periodic summary
  const progressInterval = setInterval(() => printProgress('[summary]'), 15000);

  const results = await runWithConcurrency(tasks, concurrency, async ({ symbol, timeframe }) => {
    const taskStart = nowMs();
    try {
      const res = await fetchDeepHistory(client, symbol, timeframe, {
        targetBars,
        fetchBatch,
        initialRange,
        timeoutMs,
        maxFetches,
      });

      // Update aggregates
      completedCount += 1;
      totalBarsFetched += res.bars || 0;
      totalTimeMsSum += res.ms || (nowMs() - taskStart);

      if (res.status === 'ok') okCount += 1;
      else if (res.status === 'timeout') timeoutCount += 1;
      else if (res.status === 'max-fetches') maxedCount += 1;
      else if (res.status === 'error') errorCount += 1;

      console.log(`✅ ${symbol} ${timeframe}: ${res.bars} bars in ${res.ms}ms (fetches=${res.fetches})`);
      printProgress();
      return res;
    } catch (err) {
      completedCount += 1;
      errorCount += 1;
      totalTimeMsSum += (nowMs() - taskStart);
      console.error(`❌ ${symbol} ${timeframe}:`, err?.message || err);
      printProgress('[error]');
      return { symbol, timeframe, status: 'error', error: err?.message || String(err) };
    }
  });

  clearInterval(progressInterval);
  // Stop the resource monitor when tasks finish
  stopResourceMonitor();
  printProgress('[final]');

  const totalMs = nowMs() - started;

  const rate_tasks_per_sec = (completedCount / (totalMs / 1000)) || 0;
  const bars_per_sec = (totalBarsFetched / (totalMs / 1000)) || 0;
  const workers = Number(concurrency) || 1;
  const bars_per_worker = bars_per_sec / workers;
  const tasks_per_worker = rate_tasks_per_sec / workers;

  console.log('Summary:', {
    totalTasks: results.length,
    ok: okCount,
    timeouts: timeoutCount,
    maxed: maxedCount,
    errors: errorCount,
    totalMs,
    rate_tasks_per_sec,
    bars_per_sec,
    // Per-worker metrics (useful for capacity planning)
    bars_per_worker: Number.isFinite(bars_per_worker) ? Number(bars_per_worker.toFixed(2)) : 0,
    tasks_per_worker: Number.isFinite(tasks_per_worker) ? Number(tasks_per_worker.toFixed(2)) : 0,
  });

  await client.end();
})();
