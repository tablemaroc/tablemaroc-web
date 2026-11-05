#!/usr/bin/env node
// Busca secretos evidentes antes de hacer commit o empaquetar.
// Uso: node codigo/security/scan-secrets.mjs [directorio]   → todo el directorio (antes de empaquetar un ZIP)
//      node codigo/security/scan-secrets.mjs --git           → solo lo que entraría en Git (antes de un commit)
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';

const PATTERNS = [
  ['clave privada', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ['JWT', /eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}/],
  ['clave AWS', /AKIA[0-9A-Z]{16}/],
  ['clave Google API', /AIza[0-9A-Za-z_-]{35}/],
  ['asignación de secreto', /(?:SECRET|TOKEN|PASSWORD|PASSWD|API_KEY|SERVICE_ROLE_KEY|PRIVATE_KEY)\w*\s*[=:]\s*(?!(?:process\.)?env\.)['"]?[A-Za-z0-9/+_.\-]{16,}/i],   // leer de env. no es un secreto escrito
];
const SKIP_DIRS = new Set(['node_modules', '.git', '.next']);
const hits = [];

function scanFile(p, st) {
  if (/^\.env(\..+)?$/.test(basename(p)) && !/\.(example|template)$/.test(basename(p))) hits.push([p, 'archivo .env real']);
  if (st.size > 2_000_000) return;
  let text; try { text = readFileSync(p, 'utf8'); } catch { return; }
  if (text.includes('\u0000')) return;
  text.split('\n').forEach((line, i) => {
    for (const [label, re] of PATTERNS) if (re.test(line) && !/scan-secrets-ignore/.test(line)) hits.push([`${p}:${i + 1}`, label]);
  });
}

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) { if (!SKIP_DIRS.has(name)) walk(p); continue; }
    scanFile(p, st);
  }
}

if (process.argv[2] === '--git') {
  // Archivos versionados y nuevos no ignorados: exactamente lo que `git add -A` subiría.
  const files = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard']).toString().split('\0').filter(Boolean);
  for (const p of files) { let st; try { st = statSync(p); } catch { continue; } scanFile(p, st); }
} else {
  walk(process.argv[2] ?? '.');
}
if (hits.length) { for (const [w, l] of hits) console.error(`POSIBLE SECRETO (${l}): ${w}`); process.exit(1); }
console.log('Sin secretos evidentes.');
