#!/usr/bin/env node
/**
 * TradingView Pine Script Manager - Unified CLI
 * 
 * A streamlined tool for managing Pine Scripts with:
 * - Local numeric ID tracking for better DX
 * - Pull-before-push to avoid unnecessary versions
 * - Separate script management vs running with custom inputs
 * - Convention-based YAML input files
 * 
 * Usage:
 *   tv-cli list                          List all tracked scripts
 *   tv-cli create <file.pine> [--name]   Create new remote script from local file
 *   tv-cli pull <id|pineId>              Pull remote script to local
 *   tv-cli push <id|file>                Push local changes (only if changed)
 *   tv-cli run <id|file> [--inputs ...]  Run script with custom inputs
 *   tv-cli delete <id>                   Delete remote script
 *   tv-cli inputs <id|file>              Generate/show inputs YAML
 *   tv-cli compile <file>                Compile script without saving
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const FormData = require('form-data');
const YAML = require('yaml');

// =============================================================================
// Configuration
// =============================================================================

const CONFIG = {
	baseUrl: process.env.PINE_FACADE_BASE_URL || 'https://pine-facade.tradingview.com/pine-facade',
	tvBaseUrl: process.env.TV_BASE_URL || 'https://www.tradingview.com',
	timeoutMs: Number(process.env.TV_TIMEOUT_MS) || 120_000,
	userName: process.env.TV_USER || '',
	sessionId: process.env.SESSION || '',
	signature: process.env.SIGNATURE || '',
	dataDir: process.env.TV_DATA_DIR || '.tv-scripts',
	metaFile: process.env.TV_META_FILE || '.tv-meta.json',
};

function getCookies() {
	if (!CONFIG.sessionId) throw new Error('Missing SESSION env var');
	let cookies = `sessionid=${CONFIG.sessionId}`;
	if (CONFIG.signature) cookies += `; sessionid_sign=${CONFIG.signature}`;
	return cookies;
}

function requireUser() {
	if (!CONFIG.userName) throw new Error('Missing TV_USER env var');
	return CONFIG.userName;
}

// =============================================================================
// Utilities
// =============================================================================

function sha256(text) {
	return crypto.createHash('sha256').update(String(text), 'utf8').digest('hex');
}

function slugify(input) {
	return String(input || '').trim()
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-zA-Z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.toLowerCase() || 'script';
}

function normalizePineId(raw) {
	return String(raw || '').trim().replace(/%3B/gi, ';');
}

function normalizeTimeframe(tf) {
	const t = String(tf || '').trim();
	if (!t) return '5';
	if (/^\d+$/.test(t) || /^[DWM]$/.test(t)) return t;
	// Common TradingView notation: 1D/1W/1M should be normalized to D/W/M
	const m1 = t.match(/^1\s*([DWM])$/i);
	if (m1) return m1[1].toUpperCase();
	const m = t.match(/^(\d+)\s*m$/i);
	if (m) return m[1];
	const h = t.match(/^(\d+)\s*h$/i);
	if (h) return String(Number(h[1]) * 60);
	return t;
}

function compareVersionStrings(a, b) {
	const normalize = (value) => String(value || '').trim();
	const toParts = (value) => normalize(value)
		.split('.')
		.map((chunk) => {
			const n = Number(chunk);
			return Number.isFinite(n) ? n : 0;
		});
	const aParts = toParts(a);
	const bParts = toParts(b);
	const len = Math.max(aParts.length, bParts.length);
	for (let i = 0; i < len; i++) {
		const aVal = aParts[i] ?? 0;
		const bVal = bParts[i] ?? 0;
		if (aVal > bVal) return 1;
		if (aVal < bVal) return -1;
	}
	return 0;
}

function looksLikePineId(s) {
	return /^\s*(USER|PUB|STD|INDIC);/i.test(String(s || ''));
}

function extractPineIdFromResponse(obj) {
	if (!obj) return null;
	if (typeof obj === 'string') {
		const s = normalizePineId(obj);
		if (s.startsWith('{') || s.startsWith('[')) {
			try { return extractPineIdFromResponse(JSON.parse(s)); } catch {}
		}
		const m = s.match(/\b(?:USER|PUB|STD|INDIC);[^\s"'<>]+/i);
		return m ? normalizePineId(m[0]) : null;
	}
	if (Array.isArray(obj)) {
		for (const item of obj) {
			const found = extractPineIdFromResponse(item);
			if (found) return found;
		}
		return null;
	}
	if (typeof obj === 'object') {
		const keys = ['id', 'pineId', 'pine_id', 'scriptIdPart', 'script_id', 'scriptId', 'result', 'data'];
		for (const k of keys) {
			if (Object.prototype.hasOwnProperty.call(obj, k)) {
				const found = extractPineIdFromResponse(obj[k]);
				if (found) return found;
			}
		}
		// Also look inside result.metaInfo
		if (obj.result && obj.result.metaInfo) {
			const part = obj.result.metaInfo.scriptIdPart;
			if (part) {
				if (String(part).includes(';')) return normalizePineId(part);
				return normalizePineId(`USER;${String(part)}`);
			}
		}
	}
	return null;
}

function parseSaveResponse(resp) {
	// resp may be string or object
	if (!resp) return null;
	let data = resp;
	if (typeof resp === 'string') {
		try { data = JSON.parse(resp); } catch { data = { raw: resp }; }
	}
	const pineId = extractPineIdFromResponse(data) || null;
	const version = data?.version || data?.result?.version || data?.result?.metaInfo?.version || null;
	const success = typeof data.success === 'boolean' ? data.success : (data?.result ? true : null);
	const reason = data?.reason || null;
	const errors = data?.reason2?.errors || data?.result?.errors || null;
	return { pineId, version, success, reason, errors, raw: data };
}

function extractPineIdFromSource(source) {
	const m = String(source || '').match(/(?:^|\n)\s*(?:\/\/\s*)?(?:@?pineId\b\s*(?::|=)?\s*)(?:"|')?\s*((?:USER|PUB|STD|INDIC);[^\s"'<>]+)/i);
	return m ? normalizePineId(m[1]) : null;
}

function ensurePineIdInSource(source, pineId) {
	const existing = extractPineIdFromSource(source);
	if (existing) return { updated: false, source, pineId: existing };
	
	const line = `// pineId: ${normalizePineId(pineId)}`;
	const lines = source.split(/\r?\n/);
	const versionIdx = lines.findIndex(l => /^\s*\/\/\s*@version\b/i.test(l));
	lines.splice(versionIdx >= 0 ? versionIdx + 1 : 0, 0, line);
	return { updated: true, source: lines.join('\n'), pineId: normalizePineId(pineId) };
}

function parseArgs(argv) {
	const args = { positional: [], flags: {} };
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a.startsWith('--')) {
			const [key, ...rest] = a.slice(2).split('=');
			args.flags[key] = rest.length ? rest.join('=') : (argv[i + 1] && !argv[i + 1].startsWith('-') ? argv[++i] : true);
		} else if (a.startsWith('-') && a.length === 2) {
			args.flags[a[1]] = argv[i + 1] && !argv[i + 1].startsWith('-') ? argv[++i] : true;
		} else {
			args.positional.push(a);
		}
	}
	return args;
}

function toBool(val, def = false) {
	if (val === undefined) return def;
	if (val === true || val === 'true' || val === '1' || val === 'yes') return true;
	if (val === false || val === 'false' || val === '0' || val === 'no') return false;
	return def;
}

// =============================================================================
// Metadata Store - tracks scripts by numeric ID
// =============================================================================

class MetaStore {
	constructor(baseDir = process.cwd()) {
		this.baseDir = baseDir;
		this.dataDir = path.join(baseDir, CONFIG.dataDir);
		this.metaFile = path.join(baseDir, CONFIG.metaFile);
		this._ensureDirs();
	}
	
	_ensureDirs() {
		fs.mkdirSync(this.dataDir, { recursive: true });
		fs.mkdirSync(path.join(this.dataDir, 'inputs'), { recursive: true });
	}
	
	load() {
		try {
			if (!fs.existsSync(this.metaFile)) return { version: 1, scripts: {} };
			return JSON.parse(fs.readFileSync(this.metaFile, 'utf8'));
		} catch { return { version: 1, scripts: {} }; }
	}
	
	save(meta) {
		fs.writeFileSync(this.metaFile, JSON.stringify(meta, null, 2));
	}
	
	getScript(id) {
		const meta = this.load();
		return meta.scripts[String(id)] || null;
	}
	
	setScript(id, data) {
		const meta = this.load();
		if (!meta.scripts || typeof meta.scripts !== 'object') meta.scripts = {};
		const key = String(id);
		meta.scripts[key] = {
			...(meta.scripts[key] || {}),
			...data,
			updatedAt: new Date().toISOString(),
		};
		this.save(meta);
		return meta.scripts[key];
	}
	
	deleteScript(id) {
		const meta = this.load();
		delete meta.scripts[String(id)];
		this.save(meta);
	}
	
	listScripts() {
		const meta = this.load();
		return Object.entries(meta.scripts || {}).map(([id, entry]) => ({ id, ...entry }));
	}
	
	nextId() {
		const meta = this.load();
		const ids = Object.keys(meta.scripts || {}).map(k => Number(k)).filter(n => !isNaN(n));
		return String(ids.length ? Math.max(...ids) + 1 : 1);
	}
	
	findByPineId(pineId) {
		const meta = this.load();
		const norm = normalizePineId(pineId);
		for (const [id, entry] of Object.entries(meta.scripts || {})) {
			if (entry.pineId && normalizePineId(entry.pineId) === norm) {
				return { id, ...entry };
			}
		}
		return null;
	}
	
	findByLocalPath(filePath) {
		const meta = this.load();
		const abs = path.resolve(this.baseDir, filePath);
		for (const [id, entry] of Object.entries(meta.scripts || {})) {
			if (entry.localPath) {
				const entryAbs = path.resolve(this.baseDir, entry.localPath);
				if (entryAbs === abs) return { id, ...entry };
			}
		}
		return null;
	}
	
	// Convention: inputs file is named <scriptname>_inputs.yaml or <scriptname>_v<version>.yaml
	getInputsPath(id, version = null) {
		const entry = this.getScript(id);
		if (!entry?.localPath) return null;
		const base = path.basename(entry.localPath, path.extname(entry.localPath));
		const inputsDir = path.join(this.dataDir, 'inputs');
		
		// Priority: version-specific > _inputs > base.yaml
		const candidates = version
			? [
					path.join(inputsDir, `${base}_v${version}.yaml`),
					path.join(inputsDir, `${base}_inputs.yaml`),
					path.join(inputsDir, `${base}.yaml`),
				]
			: [
					path.join(inputsDir, `${base}_inputs.yaml`),
					path.join(inputsDir, `${base}.yaml`),
				];
		
		for (const c of candidates) {
			if (fs.existsSync(c)) return c;
		}
		// Return default path for creation
		return path.join(inputsDir, `${base}_inputs.yaml`);
	}
}

// =============================================================================
// TradingView Pine Facade API Client
// =============================================================================

class PineClient {
	constructor() {
		this.http = axios.create({
			baseURL: CONFIG.baseUrl,
			timeout: CONFIG.timeoutMs,
			validateStatus: () => true,
		});
	}
	
	_baseHeaders() {
		return {
			Cookie: getCookies(),
			Origin: CONFIG.tvBaseUrl,
			Referer: CONFIG.tvBaseUrl + '/',
			'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
			'X-Requested-With': 'XMLHttpRequest',
		};
	}
	
	async get(pineId, version = null) {
		const headers = this._baseHeaders();
		let resolvedVersion = version != null ? String(version) : null;
		if (!resolvedVersion || resolvedVersion === '-1') {
			const latest = await this._resolveLatestVersion(pineId);
			if (latest) resolvedVersion = latest;
		}
		const targetVersion = resolvedVersion || 'last';

		if (resolvedVersion) {
			const res = await this._tryGetVersion(pineId, resolvedVersion, headers);
			if (res) return res;
		}

		const url = `/translate/${encodeURIComponent(pineId)}/${encodeURIComponent(targetVersion)}`;
		let res = await this.http.get(url, { headers });
		if (res.status === 200) {
			const data = this._parseResponse(res.data);
			if (data.source) return data;
		}

		throw new Error(`Failed to fetch ${pineId}@${targetVersion}`);
	}

	async _tryGetVersion(pineId, version, headers) {
		let url = `/get/${encodeURIComponent(pineId)}/${encodeURIComponent(version)}`;
		let res = await this.http.get(url, { headers });
		if (res.status === 200) {
			const data = this._parseResponse(res.data);
			if (data.source) return data;
			if (data.meta?.version && data.meta.version !== version) {
				url = `/get/${encodeURIComponent(pineId)}/${encodeURIComponent(data.meta.version)}`;
				res = await this.http.get(url, { headers });
				if (res.status === 200) {
					const d2 = this._parseResponse(res.data);
					if (d2.source) return d2;
				}
			}
		}
		return null;
	}

	async _resolveLatestVersion(pineId) {
		try {
			const headers = this._baseHeaders();
			const url = `/versions/${encodeURIComponent(pineId)}`;
			const res = await this.http.get(url, { headers });
			if (res.status !== 200) return null;
			const entries = this._normalizeVersionEntries(res.data);
			const candidates = entries
				.map((entry) => this._extractVersionFromEntry(entry))
				.filter((v) => v);
			return this._chooseHighestVersion(candidates);
		} catch (err) {
			return null;
		}
	}

	_normalizeVersionEntries(payload) {
		if (!payload) return [];
		if (Array.isArray(payload)) return payload;
		if (Array.isArray(payload.versions)) return payload.versions;
		if (Array.isArray(payload.result?.versions)) return payload.result.versions;
		if (Array.isArray(payload.data)) return payload.data;
		return [];
	}

	_extractVersionFromEntry(entry) {
		if (!entry) return null;
		if (typeof entry === 'string') return entry;
		return (
			entry.version ||
			entry.result?.version ||
			entry.metaInfo?.version ||
			entry.scriptVersion ||
			entry.sourceVersion ||
			null
		);
	}

	_chooseHighestVersion(versions) {
		let best = null;
		for (const candidate of versions) {
			if (!candidate) continue;
			if (!best || compareVersionStrings(candidate, best) > 0) {
				best = candidate;
			}
		}
		return best;
	}
	
	_parseResponse(payload) {
		if (typeof payload === 'string') {
			try { payload = JSON.parse(payload); } catch {}
		}
		if (typeof payload === 'object' && payload) {
			return {
				source: payload.source || null,
				meta: {
					scriptName: payload.scriptName || payload.scriptTitle || null,
					version: payload.version || null,
					created: payload.created || null,
					updated: payload.updated || null,
				},
			};
		}
		return { source: typeof payload === 'string' ? payload : null, meta: null };
	}
	
	async listSaved() {
		const headers = this._baseHeaders();
		const res = await this.http.get('/list?filter=saved', { headers });
		if (res.status !== 200) throw new Error(`Failed to list saved scripts: ${res.status}`);
		return res.data;
	}
	
	async compile(source) {
		const headers = this._baseHeaders();
		const user = requireUser();
		const form = new FormData();
		form.append('source', source);
		
		const res = await this.http.post(
			`/translate_light?user_name=${encodeURIComponent(user)}&v=3`,
			form,
			{ headers: { ...form.getHeaders(), ...headers } }
		);
		
		if (res.status !== 200) throw new Error(`Compile failed: ${res.status}`);
		return res.data;
	}
	
	async saveNew(source, name) {
		const headers = this._baseHeaders();
		const user = requireUser();
		const form = new FormData();
		form.append('source', source);
		
		const res = await this.http.post(
			`/save/new?name=${encodeURIComponent(name)}&user_name=${encodeURIComponent(user)}&allow_overwrite=true`,
			form,
			{ headers: { ...form.getHeaders(), ...headers } }
		);
		
		if (res.status === 401 || res.status === 403) {
			throw new Error(`Unauthorized: status=${res.status}. Ensure SESSION/SIGNATURE and TV_USER are valid and have access.`);
		}
		if (res.status !== 200) throw new Error(`Save new failed: ${res.status}`);
		// Return raw body even when success === false so caller can inspect compilation errors
		return res.data;
	}
	
	async saveNext(pineId, source) {
		const headers = this._baseHeaders();
		const user = requireUser();
		const form = new FormData();
		form.append('source', source);
		
		const res = await this.http.post(
			`/save/next/${encodeURIComponent(pineId)}?user_name=${encodeURIComponent(user)}`,
			form,
			{ headers: { ...form.getHeaders(), ...headers } }
		);
		
		if (res.status === 401 || res.status === 403) {
			throw new Error(`Unauthorized: status=${res.status}. Ensure SESSION/SIGNATURE and TV_USER are valid and have access.`);
		}
		if (res.status !== 200) throw new Error(`Save next failed: ${res.status}`);
		return res.data;
	}
	
	async delete(pineId) {
		const headers = this._baseHeaders();
		const user = requireUser();
		
		const res = await this.http.post(
			`/delete/${encodeURIComponent(pineId)}?user_name=${encodeURIComponent(user)}`,
			null,
			{ headers }
		);
		
		if (res.status !== 200) throw new Error(`Delete failed: ${res.status}`);
		return res.data;
	}
}

// =============================================================================
// Input YAML Management
// =============================================================================

function parseInputsFromSource(source) {
	const inputs = [];
	const assignmentRegex = /([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(input(?:\.[A-Za-z_][A-Za-z0-9_]*)?)/g;
	let m;
	
	while ((m = assignmentRegex.exec(source)) !== null) {
		try {
			const varName = m[1];
			const funcName = m[2];
			const startPos = assignmentRegex.lastIndex;
			
			const parenIndex = source.indexOf('(', startPos);
			if (parenIndex < 0) continue;
			
			let depth = 1, i = parenIndex + 1;
			for (; i < source.length && depth > 0; i++) {
				if (source[i] === '(') depth++;
				else if (source[i] === ')') depth--;
			}
			if (depth !== 0) continue;
			
			const inner = source.slice(parenIndex + 1, i - 1);
			const parsed = parseInputArgs(inner);
			
			let type = null;
			const fnMatch = funcName.match(/input\.([A-Za-z_][A-Za-z0-9_]*)/);
			if (fnMatch) type = fnMatch[1];
			
			inputs.push({
				id: varName,
				title: parsed.title || varName,
				type,
				default: parsed.defval,
				min: parsed.minval,
				max: parsed.maxval,
				step: parsed.step,
				options: parsed.options,
			});
			
			assignmentRegex.lastIndex = i;
		} catch {}
	}
	
	return inputs;
}

function parseInputArgs(argsStr) {
	const result = { defval: undefined, title: null, minval: null, maxval: null, step: null, options: null };
	const tokens = tokenizeArgs(argsStr);
	
	let positionalIndex = 0;
	for (const token of tokens) {
		if (token.includes('=')) {
			const [key, ...rest] = token.split('=');
			const val = rest.join('=').trim();
			const k = key.trim();
			if (k === 'defval') result.defval = parseValue(val);
			else if (k === 'title') result.title = parseValue(val);
			else if (k === 'minval') result.minval = parseValue(val);
			else if (k === 'maxval') result.maxval = parseValue(val);
			else if (k === 'step') result.step = parseValue(val);
			else if (k === 'options') result.options = parseValue(val);
		} else {
			// Pine input() convention: first positional is defval, second is title
			if (positionalIndex === 0) result.defval = parseValue(token);
			else if (positionalIndex === 1 && result.title == null) result.title = parseValue(token);
			positionalIndex++;
		}
	}
	
	return result;
}

function tokenizeArgs(str) {
	const tokens = [];
	let cur = '', depth = 0, inString = null;
	
	for (let i = 0; i < str.length; i++) {
		const c = str[i];
		if (!inString && (c === '"' || c === "'")) inString = c;
		else if (inString === c) inString = null;
		else if (!inString && (c === '(' || c === '[')) depth++;
		else if (!inString && (c === ')' || c === ']')) depth--;
		else if (!inString && depth === 0 && c === ',') {
			if (cur.trim()) tokens.push(cur.trim());
			cur = '';
			continue;
		}
		cur += c;
	}
	if (cur.trim()) tokens.push(cur.trim());
	return tokens;
}

function parseValue(v) {
	if (v == null) return undefined;
	const s = String(v).trim();
	if (/^(true|false)$/i.test(s)) return s.toLowerCase() === 'true';
	if (/^[+-]?\d+(?:\.\d+)?$/.test(s)) return Number(s);
	if (/^["'].*["']$/.test(s)) return s.slice(1, -1);
	if (/^\[.*\]$/.test(s)) {
		try {
			return JSON.parse(s.replace(/'/g, '"'));
		} catch { return s; }
	}
	return s;
}

function generateInputsYaml(source, scriptName, pineId = null) {
	const inputs = parseInputsFromSource(source);
	
	const doc = {
		script: scriptName,
		pineId: pineId,
		version: '1.0',
		inputs: {},
		options: {
			symbol: 'OANDA:XAUUSD',
			timeframe: '5m',
			range: 500,
		},
	};
	
	for (const inp of inputs) {
		const entry = { title: inp.title, type: inp.type };
		if (inp.default !== undefined) entry.default = inp.default;
		if (inp.min !== null) entry.min = inp.min;
		if (inp.max !== null) entry.max = inp.max;
		if (inp.step !== null) entry.step = inp.step;
		if (inp.options) entry.options = inp.options;
		doc.inputs[inp.id] = entry;
	}
	
	return YAML.stringify(doc);
}

function loadInputsYaml(filePath) {
	if (!filePath || !fs.existsSync(filePath)) return null;
	try {
		return YAML.parse(fs.readFileSync(filePath, 'utf8'));
	} catch { return null; }
}

// =============================================================================
// Commands
// =============================================================================

async function cmdList(store, client, args) {
	const showRemote = args?.flags?.r || args?.flags?.remote || false;
	if (showRemote) {
		// list remote saved scripts
		let items;
		try {
			const res = await client.listSaved();
			// normalize: some responses have items/scripts property
			if (Array.isArray(res)) items = res;
			else if (Array.isArray(res.items)) items = res.items;
			else if (Array.isArray(res.scripts)) items = res.scripts;
			else items = Array.isArray(res?.data) ? res.data : [];
		} catch (e) {
			console.error('Failed to list remote scripts:', e.message);
			return;
		}
		if (!items || items.length === 0) {
			console.log('No remote saved scripts found.');
			return;
		}
		console.log('\nRemote Saved Scripts:');
		console.log('======================');
		items.forEach((it, i) => {
			const id = extractPineIdFromResponse(it) || it.id || it.scriptIdPart || it.pineId || '(unknown)';
			const name = it.name || it.scriptName || it.scriptTitle || (it.result && it.result.metaInfo && it.result.metaInfo.name) || '(unnamed)';
			const version = it.version || it.result?.version || it.result?.metaInfo?.version || it.meta?.version || '';
			const access = it.access || it.type || '';
			console.log(`  [${String(i).padStart(3)}] ${name} | ${id} ${version ? `@${version}` : ''} ${access ? `(${access})` : ''}`);
		});
		return;
	}

	// local list (default)
	const scripts = store.listScripts();
	
	if (scripts.length === 0) {
		console.log('No scripts tracked. Use "create" to add one.');
		return;
	}
	
	console.log('\nTracked Scripts:');
	console.log('================');
	for (const s of scripts) {
		const status = s.remoteHash === s.localHash ? '✓' : '!';
		console.log(`  ${status} #${s.id.padStart(3)} | ${s.name || '(unnamed)'}`);
		console.log(`         pineId: ${s.pineId || '(none)'}`);
		if (s.localPath) console.log(`         local:  ${s.localPath}`);
		if (s.remoteVersion) console.log(`         version: ${s.remoteVersion}`);
		console.log('');
	}
}

async function cmdCreate(store, client, args) {
	const filePath = args.positional[0];
	if (!filePath) throw new Error('Usage: create <file.pine> [--name "Script Name"]');
	
	const absPath = path.resolve(store.baseDir, filePath);
	if (!fs.existsSync(absPath)) throw new Error(`File not found: ${filePath}`);
	
	const source = fs.readFileSync(absPath, 'utf8');
	const localHash = sha256(source);
	
	// Check if already tracked by path
	const existing = store.findByLocalPath(absPath);
	if (existing) {
		console.log(`Script already tracked as #${existing.id}. Use "push" to update.`);
		return;
	}
	
	// Check if source has a pineId comment - maybe it's already on remote
	const sourcePineId = extractPineIdFromSource(source);
	if (sourcePineId) {
		const byPine = store.findByPineId(sourcePineId);
		if (byPine) {
			console.log(`Script already tracked as #${byPine.id} (pineId: ${sourcePineId}). Use "push" to update.`);
			return;
		}
	}
	
	// Compile first
	console.log('Compiling...');
	const compileRes = await client.compile(source);
	if (compileRes.success === false) {
		const errors = compileRes.result?.errors || [];
		console.error('Compilation failed:');
		errors.slice(0, 5).forEach(e => console.error(`  Line ${e.start?.line || '?'}: ${e.message}`));
		throw new Error('Fix compilation errors before creating.');
	}
	console.log('✓ Compiled');
	
	// Create on remote
	const name = args.flags.name || path.basename(absPath, '.pine').replace(/^\d+[-_]+/, '');
	console.log(`Creating remote script: ${name}`);
	const createRes = await client.saveNew(source, name);
	
	const parsed = parseSaveResponse(createRes);
	if (!parsed.pineId) {
		console.error('Create response did not contain a pineId. Response (snippet):');
		console.error(JSON.stringify(parsed.raw, null, 2).slice(0, 2000));
		if (parsed.success === false) {
			console.error('Reason:', parsed.reason);
			if (Array.isArray(parsed.errors) && parsed.errors.length) {
				console.error('Errors:');
				parsed.errors.slice(0, 10).forEach(e => console.error(`  - line ${e.start?.line || '?'}: ${e.message || JSON.stringify(e)}`));
			}
		}
		throw new Error('Could not extract pineId from create response; see diagnostics above');
	}
	let pineId = parsed.pineId;
	// guard against accidental double-prefix like USER;USER;...
	if (pineId && /^USER;USER;/.test(pineId)) {
		pineId = pineId.replace(/^USER;USER;/, 'USER;');
	}
	console.log(`✓ Created: ${pineId} (version: ${parsed.version || 'unknown'})`);
	
	// Update source file with pineId comment
	const updated = ensurePineIdInSource(source, pineId);
	if (updated.updated) {
		fs.writeFileSync(absPath, updated.source, 'utf8');
		console.log('✓ Added pineId comment to source');
	}

	// Track locally
	const id = store.nextId();
	store.setScript(id, {
		name,
		pineId,
		localPath: path.relative(store.baseDir, absPath),
		localHash: sha256(updated.source),
		remoteHash: sha256(updated.source),
		remoteVersion: parsed.version || '1.0',
	});
	
	// Generate inputs YAML
	try {
		const inputsPath = store.getInputsPath(id);
		const yaml = generateInputsYaml(updated.source, name, pineId);
		fs.writeFileSync(inputsPath, yaml);
		console.log(`✓ Generated: ${path.relative(store.baseDir, inputsPath)}`);
	} catch (e) {
		console.error('Warning: failed to generate inputs YAML:', e && e.message ? e.message : e);
		console.error((e && e.stack) ? e.stack.split('\n').slice(0,5).join('\n') : '');
	}
	console.log(`\n✓ Created script #${id}`);
}

async function cmdPull(store, client, args) {
	let target = args.positional[0];
	// If no target provided, do interactive remote selection
	if (!target) {
		console.log('No target given. Fetching remote saved scripts for selection...');
		let items;
		try {
			const res = await client.listSaved();
			if (Array.isArray(res)) items = res;
			else if (Array.isArray(res.items)) items = res.items;
			else if (Array.isArray(res.scripts)) items = res.scripts;
			else items = Array.isArray(res?.data) ? res.data : [];
		} catch (e) {
			throw new Error(`Failed to list remote scripts: ${e.message}`);
		}
		if (!items || !items.length) {
			console.log('No remote scripts found.');
			return;
		}
		// Print and prompt
		items.forEach((it, i) => {
			const id = extractPineIdFromResponse(it) || it.id || it.pineId || '(unknown)';
			const name = it.name || it.scriptName || it.scriptTitle || '(unnamed)';
			const version = it.version || it.result?.version || it.result?.metaInfo?.version || '';
			console.log(`  [${String(i).padStart(3)}] ${name} | ${id} ${version ? `@${version}` : ''}`);
		});
		const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout, terminal: true });
		const answer = await new Promise((resolve) => rl.question('Choose number to pull (q to cancel): ', resolve));
		rl.close();
		if (!answer || answer.trim().toLowerCase() === 'q') return;
		const idx = Number(answer.trim());
		if (!Number.isFinite(idx) || idx < 0 || idx >= items.length) throw new Error('Invalid selection');
		target = extractPineIdFromResponse(items[idx]) || items[idx].id || items[idx].pineId;
		if (!target) throw new Error('Selected item has no pineId');
	}
	
	let pineId, localPath, scriptName;
	
	if (/^\d+$/.test(target)) {
		// Numeric ID
		const entry = store.getScript(target);
		if (!entry?.pineId) throw new Error(`No pineId for #${target}. Cannot pull.`);
		pineId = entry.pineId;
		localPath = entry.localPath;
		scriptName = entry.name;
	} else if (looksLikePineId(target)) {
		// Direct pineId
		pineId = normalizePineId(target);
		const existing = store.findByPineId(pineId);
		if (existing) {
			localPath = existing.localPath;
			scriptName = existing.name;
		}
	} else {
		throw new Error(`Unknown target: ${target}. Use numeric ID or pineId.`);
	}
	
	console.log(`Pulling ${pineId}...`);
	let source, meta;
	try {
		({ source, meta } = await client.get(pineId));
	} catch (e) {
		// Fallback: try listing saved items and find a matching entry
		try {
			const list = await client.listSaved();
			const items = Array.isArray(list) ? list : (Array.isArray(list.items) ? list.items : (Array.isArray(list.scripts) ? list.scripts : []));
			const found = items.find((it) => {
				const idCandidate = extractPineIdFromResponse(it) || it.id || it.scriptIdPart || it.pineId;
				return idCandidate && normalizePineId(idCandidate) === normalizePineId(pineId);
			});
			if (found) {
				const parsed = (typeof found === 'string') ? { source: found } : (found.scriptSource ? { source: found.scriptSource, meta: found } : (found.source ? { source: found.source, meta: found } : null));
				if (parsed && parsed.source) {
					source = parsed.source;
					meta = parsed.meta || found;
				}
			}
		} catch (e2) {
			// ignore
		}
		if (!source) throw new Error(`Failed to fetch ${pineId}`);
	}
	
	if (!source || !source.trim()) {
		throw new Error('Pulled empty source. Check if script is accessible.');
	}
	
	const remoteHash = sha256(source);
	scriptName = scriptName || meta?.scriptName || 'script';
	
	// Determine output path
	if (!localPath) {
		const id = store.nextId();
		const fileName = `${String(id).padStart(3, '0')}--${slugify(scriptName)}.pine`;
		localPath = path.join(CONFIG.dataDir, fileName);
		
		store.setScript(id, {
			name: scriptName,
			pineId,
			localPath,
			localHash: remoteHash,
			remoteHash,
			remoteVersion: meta?.version,
		});
		
		console.log(`✓ Tracked as #${id}`);
	} else {
		// Update existing entry
		const entry = store.findByLocalPath(localPath) || store.findByPineId(pineId);
		if (entry) {
			store.setScript(entry.id, {
				remoteHash,
				remoteVersion: meta?.version,
			});
		}
	}
	
	const absPath = path.resolve(store.baseDir, localPath);
	fs.mkdirSync(path.dirname(absPath), { recursive: true });
	fs.writeFileSync(absPath, source, 'utf8');
	
	console.log(`✓ Saved: ${localPath}`);
}

async function cmdPush(store, client, args) {
	const target = args.positional[0];
	if (!target) throw new Error('Usage: push <id|file> [--force]');
	
	const force = toBool(args.flags.force, false);
	let id, entry, localPath, source;
	
	if (/^\d+$/.test(target)) {
		id = target;
		entry = store.getScript(id);
		if (!entry) throw new Error(`No script #${id}`);
		if (!entry.localPath) throw new Error(`No local file for #${id}`);
		localPath = path.resolve(store.baseDir, entry.localPath);
	} else {
		localPath = path.resolve(store.baseDir, target);
		entry = store.findByLocalPath(localPath);
		id = entry?.id;
	}
	
	if (!fs.existsSync(localPath)) throw new Error(`File not found: ${localPath}`);
	source = fs.readFileSync(localPath, 'utf8');
	const localHash = sha256(source);
	
	// Infer pineId if not in metadata
	let pineId = entry?.pineId || extractPineIdFromSource(source);
	
	if (!pineId) {
		throw new Error('No pineId found. Use "create" first or add a // pineId: USER;... comment.');
	}
	
	// Check if push is needed
	if (!force && entry?.remoteHash === localHash) {
		console.log('No changes to push (local hash matches remote). Use --force to push anyway.');
		return;
	}
	
	// Pull remote first to compare (avoid unnecessary versions)
	if (!force) {
		console.log('Checking remote...');
		try {
			const { source: remoteSource } = await client.get(pineId);
			const remoteHash = sha256(remoteSource || '');
			
			if (remoteHash === localHash) {
				console.log('Local matches remote. No push needed.');
				if (id) {
					store.setScript(id, { localHash, remoteHash });
				}
				return;
			}
		} catch (e) {
			console.log('Could not pull remote for comparison. Proceeding with push...');
		}
	}
	
	// Compile
	console.log('Compiling...');
	const compileRes = await client.compile(source);
	if (compileRes.success === false) {
		const errors = compileRes.result?.errors || [];
		console.error('Compilation failed:');
		errors.slice(0, 5).forEach(e => console.error(`  Line ${e.start?.line || '?'}: ${e.message}`));
		throw new Error('Fix compilation errors before pushing.');
	}
	console.log('✓ Compiled');
	
	// Push
	console.log('Pushing...');
	const pushRes = await client.saveNext(pineId, source);
	const parsed = parseSaveResponse(pushRes);
	if (parsed.success === false) {
		console.error('Push response:', JSON.stringify(parsed.raw, null, 2).slice(0, 2000));
		throw new Error(`Push reported failure: ${parsed.reason || 'unknown'}`);
	}
	let pushedPine = parsed.pineId || pineId;
	if (pushedPine && /^USER;USER;/.test(pushedPine)) pushedPine = pushedPine.replace(/^USER;USER;/, 'USER;');
	console.log(`✓ Pushed: ${pushedPine} (version: ${parsed.version || 'unknown'})`);
	// Update metadata
	if (id) {
		store.setScript(id, {
			pineId: pushedPine,
			localHash,
			remoteHash: localHash,
			remoteVersion: parsed.version || (store.getScript(id)?.remoteVersion || null),
		});
	}
}

async function cmdDelete(store, client, args) {
	const target = args.positional[0];
	if (!target) throw new Error('Usage: delete <id>');
	
	if (!/^\d+$/.test(target)) throw new Error('Please use numeric ID to delete.');
	
	const entry = store.getScript(target);
	if (!entry) throw new Error(`No script #${target}`);
	
	const confirm = args.flags.yes || args.flags.y;
	if (!confirm) {
		console.log(`This will delete remote script: ${entry.pineId}`);
		console.log('Run with --yes to confirm.');
		return;
	}
	
	if (entry.pineId) {
		console.log(`Deleting remote: ${entry.pineId}...`);
		try {
			await client.delete(entry.pineId);
			console.log('✓ Deleted from remote');
		} catch (e) {
			console.log(`Warning: Could not delete from remote: ${e.message}`);
		}
	}
	
	store.deleteScript(target);
	console.log(`✓ Removed #${target} from tracking`);
}

async function cmdCompile(client, args) {
	const filePath = args.positional[0];
	if (!filePath) throw new Error('Usage: compile <file.pine>');
	
	const absPath = path.resolve(process.cwd(), filePath);
	if (!fs.existsSync(absPath)) throw new Error(`File not found: ${filePath}`);
	
	const source = fs.readFileSync(absPath, 'utf8');
	console.log('Compiling...');
	
	const res = await client.compile(source);
	
	if (res.success === false) {
		console.error('❌ Compilation failed');
		const errors = res.result?.errors || [];
		errors.forEach(e => {
			console.error(`  Line ${e.start?.line || '?'}, Col ${e.start?.column || '?'}: ${e.message}`);
		});
		process.exitCode = 1;
	} else {
		console.log('✓ Compilation successful');
		if (res.warnings?.length) {
			console.log(`  Warnings: ${res.warnings.length}`);
			res.warnings.slice(0, 5).forEach(w => console.log(`    - ${w}`));
		}
	}
}

async function cmdInputs(store, args) {
	const target = args.positional[0];
	if (!target) throw new Error('Usage: inputs <id|file>');
	
	let localPath, scriptName, pineId, id;
	
	if (/^\d+$/.test(target)) {
		id = target;
		const entry = store.getScript(id);
		if (!entry?.localPath) throw new Error(`No local file for #${id}`);
		localPath = path.resolve(store.baseDir, entry.localPath);
		scriptName = entry.name;
		pineId = entry.pineId;
	} else {
		localPath = path.resolve(store.baseDir, target);
		const entry = store.findByLocalPath(localPath);
		id = entry?.id;
		scriptName = entry?.name || path.basename(localPath, '.pine');
		pineId = entry?.pineId || extractPineIdFromSource(fs.readFileSync(localPath, 'utf8'));
	}
	
	if (!fs.existsSync(localPath)) throw new Error(`File not found: ${localPath}`);
	
	const source = fs.readFileSync(localPath, 'utf8');
	const yaml = generateInputsYaml(source, scriptName, pineId);
	
	const outPath = args.flags.out
		? path.resolve(store.baseDir, args.flags.out)
		: (id ? store.getInputsPath(id) : path.join(store.dataDir, 'inputs', `${slugify(scriptName)}_inputs.yaml`));
	
	fs.mkdirSync(path.dirname(outPath), { recursive: true });
	fs.writeFileSync(outPath, yaml);
	
	console.log(`✓ Generated: ${path.relative(store.baseDir, outPath)}`);
}

async function cmdRun(store, client, args) {
	// Requires @mathieuc/tradingview for chart session
	let TradingView;
	try {
		TradingView = require('@mathieuc/tradingview');
	} catch {
		throw new Error('Run requires @mathieuc/tradingview package. Install with: npm install @mathieuc/tradingview');
	}
	
	const target = args.positional[0];
	if (!target) throw new Error('Usage: run <id|file> [--symbol X] [--tf 5m] [--inputs file.yaml] [--in_0 50]');
	
	let pineId, id, inputsPath;
	
	if (/^\d+$/.test(target)) {
		id = target;
		const entry = store.getScript(id);
		if (!entry?.pineId) throw new Error(`No pineId for #${id}`);
		pineId = entry.pineId;
		inputsPath = args.flags.inputs ? path.resolve(store.baseDir, args.flags.inputs) : store.getInputsPath(id);
	} else if (looksLikePineId(target)) {
		pineId = normalizePineId(target);
	} else {
		const localPath = path.resolve(store.baseDir, target);
		const entry = store.findByLocalPath(localPath);
		if (entry?.pineId) {
			pineId = entry.pineId;
			id = entry.id;
			inputsPath = args.flags.inputs ? path.resolve(store.baseDir, args.flags.inputs) : store.getInputsPath(id);
		} else if (fs.existsSync(localPath)) {
			pineId = extractPineIdFromSource(fs.readFileSync(localPath, 'utf8'));
			if (!pineId) throw new Error('No pineId found. Use "create" or "push" first.');
		} else {
			throw new Error(`Unknown target: ${target}`);
		}
	}
	
	// Load inputs
	let inputsDoc = loadInputsYaml(inputsPath) || { inputs: {}, options: {} };
	
	// Merge CLI overrides
	const inputs = { ...(inputsDoc.inputs || {}) };
	const skipKeys = ['symbol', 'timeframe', 'tf', 'range', 'inputs', 'timeout', 'json', 'out'];
	for (const [key, val] of Object.entries(args.flags)) {
		if (skipKeys.includes(key)) continue;
		if (inputs[key]) {
			inputs[key] = { ...inputs[key], value: parseValue(val) };
		} else {
			inputs[key] = { value: parseValue(val) };
		}
	}
	
	const symbol = args.flags.symbol || inputsDoc.options?.symbol || 'OANDA:XAUUSD';
	const timeframe = normalizeTimeframe(args.flags.timeframe || args.flags.tf || inputsDoc.options?.timeframe || '5m');
	const range = Number(args.flags.range || inputsDoc.options?.range || 500);
	const timeoutMs = Number(args.flags.timeout || 60000);
	const maxRetries = Number(args.flags.retries || process.env.TV_RUN_RETRIES || 2);
	const retryDelayMs = Number(args.flags.retryDelayMs || args.flags.retryDelay || process.env.TV_RUN_RETRY_DELAY_MS || 4000);
	
	console.log(`Running ${pineId}`);
	console.log(`  Symbol: ${symbol} @ ${timeframe}, range=${range}`);

	const sleep = (ms) => new Promise(r => setTimeout(r, ms));
	const isRetryable = (err) => {
		const msg = String(err?.message || err || '');
		return (
			msg.includes('Timeout after') ||
			msg.includes('connect timeout') ||
			msg.toLowerCase().includes('disconnected')
		);
	};

	let lastErr = null;
	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		if (attempt > 0) {
			const jitter = Math.floor(Math.random() * 1000); // keep it small
			const waitMs = Math.min(5000, Math.max(3000, retryDelayMs + jitter));
			console.warn(`⚠️ Retry ${attempt}/${maxRetries} after ${waitMs}ms...`);
			await sleep(waitMs);
		}

		// Create chart session
		if (!CONFIG.sessionId || !CONFIG.signature) {
			throw new Error('Missing SESSION/SIGNATURE for chart session');
		}

		const tvClient = new TradingView.Client({
			token: CONFIG.sessionId,
			signature: CONFIG.signature,
			DEBUG: process.env.TW_DEBUG === '1',
		});

		// Wait for websocket connection (prevents silent hangs where no chart/study events fire)
		const waitForConnected = (client, waitMs = 15000) => new Promise((resolve, reject) => {
			let done = false;
			const t = setTimeout(() => {
				if (done) return;
				done = true;
				reject(new Error(`TradingView client connect timeout after ${waitMs}ms`));
			}, waitMs);
			try {
				client.onConnected?.(() => {
					if (done) return;
					done = true;
					clearTimeout(t);
					resolve();
				});
			} catch {
				// If client doesn't expose onConnected in this version, wait briefly
				setTimeout(() => {
					if (done) return;
					done = true;
					clearTimeout(t);
					resolve();
				}, 250);
			}
		});

		const chart = new tvClient.Session.Chart();

		let result;
		try {
			await waitForConnected(tvClient, Math.min(20000, Math.max(2000, Math.floor(timeoutMs / 2))));

			result = await new Promise(async (resolve, reject) => {
				let settled = false;
				const finish = (value) => {
					if (settled) return;
					settled = true;
					clearTimeout(timer);
					resolve(value);
				};
				const fail = (err) => {
					if (settled) return;
					settled = true;
					clearTimeout(timer);
					reject(err);
				};

				const timer = setTimeout(() => {
					fail(new Error(`Timeout after ${timeoutMs}ms (no study update received)`));
				}, timeoutMs);

				chart.onError?.((...err) => {
					console.error('Chart error:', err);
					const errorMessage = err[0] && typeof err[0] === 'object' ? JSON.stringify(err[0]) : String(err[0]);
					fail(new Error(`Chart error: ${errorMessage}`));
				});

				if (process.env.TW_DEBUG === '1') {
					try {
						tvClient.onError?.((...err) => console.error('Client error:', err));
						tvClient.onDisconnected?.(() => console.error('Client disconnected'));
					} catch {}
				}

				// Register chart listeners BEFORE setMarket to avoid missing the first update.
				let lastChartPeriodsCount = 0;
				chart.onUpdate?.((changes) => {
					lastChartPeriodsCount = chart.periods?.length || 0;
					if (process.env.TW_DEBUG === '1') console.log('Chart update:', changes, 'periods=', lastChartPeriodsCount);
				});
				chart.onSymbolLoaded?.(() => {
					if (process.env.TW_DEBUG === '1') console.log('Symbol loaded:', chart.infos?.description || '(unknown)');
				});

				// Start market subscription
				chart.setMarket(symbol, { timeframe, range });

				// Load indicator AFTER chart subscription, as per upstream examples.
				console.log('Loading indicator...');
				let indic;
				try {
					indic = await TradingView.getIndicator(pineId, 'last', CONFIG.sessionId, CONFIG.signature);
				} catch (e) {
					fail(e);
					return;
				}

				// Apply inputs
				// NOTE: TradingView runtime indicators expose inputs as in_0, in_1, ...
				// so we map YAML keys/titles (from Pine source) to those runtime ids.
				const normalize = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
				const runtimeInputs = indic.inputs && typeof indic.inputs === 'object' ? indic.inputs : {};
				const runtimeEntries = Object.entries(runtimeInputs);
				const runtimeIndex = new Map();
				for (const [rid, info] of runtimeEntries) {
					const names = [rid, info?.inline, info?.internalID, info?.name].filter(Boolean);
					for (const n of names) runtimeIndex.set(normalize(n), rid);
				}

				let appliedCount = 0;
				for (const [key, meta] of Object.entries(inputs)) {
					if (meta?.value === undefined) continue;
					const candidates = [key, meta?.title].filter(Boolean);
					let runtimeId = null;
					for (const c of candidates) {
						const hit = runtimeIndex.get(normalize(c));
						if (hit) { runtimeId = hit; break; }
					}
					// If YAML key is already a runtime id (e.g. in_0), allow direct set
					if (!runtimeId && Object.prototype.hasOwnProperty.call(runtimeInputs, key)) runtimeId = key;

					if (!runtimeId) continue;
					try {
						indic.setOption(runtimeId, meta.value);
						appliedCount++;
					} catch (e) {
						// Don't fail run if one input doesn't apply
						if (process.env.TW_DEBUG === '1') {
							console.warn(`Failed to apply input ${key} -> ${runtimeId}: ${e.message}`);
						}
					}
				}
				console.log(`Applied ${appliedCount} input(s)`);

				let study = null;
				let studyCreated = false;
				const maybeCreateStudy = () => {
					if (studyCreated) return;
					if (!chart.periods || !chart.periods[0]) return;
					studyCreated = true;
					study = new chart.Study(indic);

					study.onError?.((...err) => {
						console.error('Study error:', err);
						const errorMessage = err[0] && typeof err[0] === 'object' ? JSON.stringify(err[0]) : String(err[0]);
						fail(new Error(`Study error: ${errorMessage}`));
					});

					study.onReady?.(() => {
						if (process.env.TW_DEBUG === '1') console.log('Study ready');
					});

					study.onUpdate?.((changes) => {
						if (process.env.TW_DEBUG === '1') console.log('Study update:', changes);
						finish({
							periods: study.periods?.slice(0, 10) || [],
							periodsCount: study.periods?.length || 0,
							strategyReport: study.strategyReport || null,
						});
					});

					// Fallback: poll study.periods in case onUpdate doesn't fire (seen with some strategies)
					const studyPoll = setInterval(() => {
						if (settled) { clearInterval(studyPoll); return; }
						const n = study?.periods?.length || 0;
						if (n > 0) {
							clearInterval(studyPoll);
							finish({
								periods: study.periods?.slice(0, 10) || [],
								periodsCount: n,
								strategyReport: study.strategyReport || null,
							});
						}
					}, 500);
					try { studyPoll.unref?.(); } catch {}

				};

				// Fallback: poll until chart has periods, then create study.
				const pollEveryMs = 250;
				const poll = setInterval(() => {
					if (settled) {
						clearInterval(poll);
						return;
					}
					if (studyCreated) {
						clearInterval(poll);
						return;
					}
					const n = chart.periods?.length || 0;
					if (n !== lastChartPeriodsCount) {
						lastChartPeriodsCount = n;
						if (process.env.TW_DEBUG === '1') console.log('Chart periods now:', n);
					}
					if (chart.periods && chart.periods[0]) {
						maybeCreateStudy();
						clearInterval(poll);
					}
				}, pollEveryMs);

				// In case we already have periods by the time indicator finishes loading.
				maybeCreateStudy();
			});

			console.log(`✓ Ran: ${result.periodsCount} period(s)`);
			lastErr = null;
			break; // success
		} catch (err) {
			lastErr = err;
			if (attempt >= maxRetries || !isRetryable(err)) {
				throw err;
			}
		} finally {
			try { chart.delete?.(); } catch {}
			try { tvClient.end?.(); } catch {}
		}
	}

	if (lastErr) throw lastErr;

	
	if (result.strategyReport?.performance) {
		const perf = result.strategyReport.performance.all || result.strategyReport.performance;
		console.log('\nStrategy Report:');
		if (perf.netProfit !== undefined) console.log(`  Net Profit: ${perf.netProfit}`);
		if (perf.percentProfitable !== undefined) console.log(`  Win Rate: ${perf.percentProfitable}%`);
		if (perf.profitFactor !== undefined) console.log(`  Profit Factor: ${perf.profitFactor}`);
		if (perf.totalTrades !== undefined) console.log(`  Total Trades: ${perf.totalTrades}`);
	}
	
	if (args.flags.json) {
		console.log('\nJSON Output:');
		console.log(JSON.stringify(result, null, 2));
	}
	
	if (args.flags.out) {
		const outPath = path.resolve(store.baseDir, args.flags.out);
		fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
		console.log(`\n✓ Saved: ${path.relative(store.baseDir, outPath)}`);
	}
}

function printHelp() {
	console.log(`
TradingView Pine Script Manager

Usage: tv-cli <command> [options]

Commands:
  list                          List all tracked scripts
    -r, --remote                 List remote saved scripts instead
  create <file.pine>            Create new remote script from local file
    --name "Name"               Script name (default: filename)
  
  pull <id|pineId>              Pull remote script to local (interactive if omitted)
  
  push <id|file>                Push local changes to remote
    --force                     Push even if hashes match
  
  delete <id>                   Delete script from remote and tracking
    --yes                       Confirm deletion
  
  compile <file.pine>           Compile script (check for errors)
  
  inputs <id|file>              Generate inputs YAML from script
    --out <path>                Output path
  
  run <id|pineId|file>          Run script with TradingView chart session
    --symbol OANDA:XAUUSD       Market symbol
    --tf 5m                     Timeframe
    --range 500                 Number of bars
    --inputs <file.yaml>        Inputs file
    --<input_id> <value>        Override specific input
    --timeout 60000             Run timeout in ms
    --retries 2                 Retry count on timeout/disconnect
    --retryDelay 4000           Delay between retries in ms (actual delay is clamped 3000-5000ms)
    --json                      Show JSON output
    --out <file.json>           Save output to file

Environment Variables:
  TV_USER       TradingView username (required for write operations)
  SESSION       TradingView session cookie
  SIGNATURE     TradingView session signature cookie
  TV_DATA_DIR   Data directory (default: .tv-scripts)
  TV_META_FILE  Metadata file (default: .tv-meta.json)

Examples:
  tv-cli create strategy.pine --name "My Strategy"
  tv-cli list
  tv-cli list --remote
  tv-cli pull (interactive remote selection)
  tv-cli push 1
  tv-cli run 1 --tf 15m --in_0 50
  tv-cli inputs 1
`);
}

// =============================================================================
// Main
// =============================================================================

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const cmd = args.positional.shift() || 'help';
	
	const store = new MetaStore(process.cwd());
	const client = new PineClient();
	
	try {
		switch (cmd) {
			case 'list':
			case 'ls':
				await cmdList(store, client, args);
				break;
			
			case 'create':
			case 'new':
				await cmdCreate(store, client, args);
				break;
			
			case 'pull':
				await cmdPull(store, client, args);
				break;
			
			case 'push':
				await cmdPush(store, client, args);
				break;
			
			case 'delete':
			case 'rm':
				await cmdDelete(store, client, args);
				break;
			
			case 'compile':
			case 'check':
				await cmdCompile(client, args);
				break;
			
			case 'inputs':
				await cmdInputs(store, args);
				break;
			
			case 'run':
				await cmdRun(store, client, args);
				break;
			
			case 'help':
			case '--help':
			case '-h':
				printHelp();
				break;
			
			default:
				console.error(`Unknown command: ${cmd}`);
				printHelp();
				process.exitCode = 1;
		}
	} catch (e) {
		console.error(`Error: ${e.message}`);
		if (process.env.DEBUG) console.error(e.stack);
		process.exitCode = 1;
	}
}

main();
