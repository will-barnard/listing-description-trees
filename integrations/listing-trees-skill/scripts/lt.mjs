#!/usr/bin/env node
// Thin CLI wrapper around the Listing Trees REST API.
// Auth + base URL come from env (LISTING_TREES_URL / LISTING_TREES_TOKEN) or
// from a config.json sitting next to the skill. Requires Node 18+ (global fetch).

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadConfig() {
  let cfg = {};
  const cfgPath = join(__dirname, '..', 'config.json');
  if (existsSync(cfgPath)) {
    try {
      cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
    } catch {
      die(`Could not parse ${cfgPath} as JSON`);
    }
  }
  const url = process.env.LISTING_TREES_URL || cfg.LISTING_TREES_URL;
  const token = process.env.LISTING_TREES_TOKEN || cfg.LISTING_TREES_TOKEN;
  if (!url || !token) {
    die('Missing config. Set LISTING_TREES_URL and LISTING_TREES_TOKEN as env vars, or copy config.example.json to config.json and fill it in.');
  }
  return { url: url.replace(/\/+$/, ''), token };
}

function die(msg) {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

const { url: BASE, token: TOKEN } = loadConfig();

async function api(method, path, body) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    die(`${method} ${path} -> ${res.status} ${JSON.stringify(data)}`);
  }
  return data;
}

function out(data) {
  console.log(JSON.stringify(data, null, 2));
}

// Minimal --flag parser: returns { _: [positional...], flag: value }
function parseFlags(argv) {
  const flags = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) { flags[key] = true; }
      else { flags[key] = next; i++; }
    } else {
      flags._.push(a);
    }
  }
  return flags;
}

const [cmd, ...rest] = process.argv.slice(2);
const f = parseFlags(rest);

const commands = {
  async trees() { out(await api('GET', '/trees')); },

  async tree() {
    const id = f._[0];
    if (!id) die('usage: tree <treeId>');
    out(await api('GET', `/trees/${id}`));
  },

  async import() {
    const file = f._[0];
    if (!file) die('usage: import <file.json>');
    const body = JSON.parse(readFileSync(resolve(file), 'utf8'));
    out(await api('POST', '/trees/import', body));
  },

  async 'create-tree'() {
    if (!f.name) die('usage: create-tree --name "..." [--description "..."]');
    out(await api('POST', '/trees', { name: f.name, description: f.description }));
  },

  async node() {
    const id = f._[0];
    if (!id) die('usage: node <nodeId>');
    out(await api('GET', `/nodes/${id}`));
  },

  async children() {
    if (!f.tree) die('usage: children --tree <treeId> [--parent <nodeId>]');
    const qs = new URLSearchParams({ tree_id: String(f.tree) });
    if (f.parent) qs.set('parent_id', String(f.parent));
    out(await api('GET', `/nodes/children?${qs.toString()}`));
  },

  async 'create-node'() {
    if (!f.tree || !f.label) die('usage: create-node --tree <id> [--parent <id>] --label "..." [--copy "..."]');
    out(await api('POST', '/nodes', {
      tree_id: Number(f.tree),
      parent_id: f.parent ? Number(f.parent) : null,
      label: f.label,
      copy: f.copy
    }));
  },

  async 'update-node'() {
    const id = f._[0];
    if (!id) die('usage: update-node <nodeId> [--label "..."] [--copy "..."] [--sort <n>]');
    const body = {};
    if (f.label !== undefined) body.label = f.label;
    if (f.copy !== undefined) body.copy = f.copy;
    if (f.sort !== undefined) body.sort_order = Number(f.sort);
    if (Object.keys(body).length === 0) die('nothing to update; pass --copy and/or --label');
    out(await api('PUT', `/nodes/${id}`, body));
  },

  async 'delete-node'() {
    const id = f._[0];
    if (!id) die('usage: delete-node <nodeId>  (cascades to children)');
    out(await api('DELETE', `/nodes/${id}`));
  },

  async templates() { out(await api('GET', '/templates')); },

  async 'restoration-disclaimer'() { out(await api('GET', '/restoration-disclaimer')); },

  async 'set-restoration-disclaimer'() {
    if (f.text === undefined) die('usage: set-restoration-disclaimer --text "..."');
    out(await api('PUT', '/restoration-disclaimer', { restorationDisclaimer: f.text }));
  },

  async health() { out(await api('GET', '/health')); }
};

if (!cmd || !commands[cmd]) {
  console.error('Listing Trees CLI — commands:');
  console.error('  trees | tree <id> | import <file.json> | create-tree --name ...');
  console.error('  node <id> | children --tree <id> [--parent <id>]');
  console.error('  create-node --tree <id> [--parent <id>] --label ... [--copy ...]');
  console.error('  update-node <id> [--label ...] [--copy ...] [--sort n]');
  console.error('  delete-node <id> | templates | health');
  console.error('  restoration-disclaimer | set-restoration-disclaimer --text "..."');
  process.exit(cmd ? 1 : 0);
}

commands[cmd]().catch(err => die(err.message || String(err)));
