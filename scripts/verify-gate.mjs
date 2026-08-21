#!/usr/bin/env node
/**
 * verify-gate — AC2 enforcement. Fails the PRODUCTION build while any
 * projectData fact bound to visible copy (src/data/bindings.ts) is still
 * `verified:false`.
 *
 * Parsing is intentionally structural, not an import: the gate must work
 * without a TS toolchain and must not execute app code. It extracts each
 * bound path's object-literal and checks its `verified:` flag.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataSrc = readFileSync(resolve(root, 'src/data/projectData.ts'), 'utf8');
const bindingsSrc = readFileSync(resolve(root, 'src/data/bindings.ts'), 'utf8');

const boundPaths = [...bindingsSrc.matchAll(/'([a-zA-Z0-9_.]+)'/g)].map((m) => m[1]);
if (boundPaths.length === 0) {
  console.error('verify-gate: no bound paths found in bindings.ts — refusing to pass an empty audit.');
  process.exit(1);
}

/** Find `key: fact(value, verifiedFlag, ...)` or `key: { ..., verified: bool }`
 *  under the section named by the path's first segment. */
function verifiedFor(path) {
  const [section, key] = path.split('.');
  const sectionStart = dataSrc.indexOf(`${section}: {`);
  if (sectionStart === -1) return { found: false };
  // crude but reliable for this file shape: scan to the matching close of the section
  let depth = 0;
  let end = sectionStart;
  for (let i = dataSrc.indexOf('{', sectionStart); i < dataSrc.length; i++) {
    if (dataSrc[i] === '{') depth++;
    if (dataSrc[i] === '}') depth--;
    if (depth === 0) {
      end = i;
      break;
    }
  }
  const body = dataSrc.slice(sectionStart, end);
  const factCall = body.match(new RegExp(`${key}:\\s*fact\\(([^)]*)\\)`));
  if (factCall) {
    const args = factCall[1];
    // fact(value) → verified defaults to false; fact(value, true/false, ...)
    const m = args.match(/,\s*(true|false)/);
    return { found: true, verified: m ? m[1] === 'true' : false };
  }
  const literal = body.match(new RegExp(`${key}:\\s*\\{[^}]*verified:\\s*(true|false)`));
  if (literal) return { found: true, verified: literal[1] === 'true' };
  return { found: false };
}

const failures = [];
for (const p of boundPaths) {
  const r = verifiedFor(p);
  if (!r.found) failures.push(`${p} — NOT FOUND in projectData.ts (typo in bindings?)`);
  else if (!r.verified) failures.push(`${p} — verified:false`);
}

if (failures.length > 0) {
  console.error('\n✖ verify-gate: PRODUCTION BUILD BLOCKED (PRD AC2).');
  console.error(`  ${failures.length}/${boundPaths.length} bound facts are unverified:\n`);
  for (const f of failures) console.error(`    · ${f}`);
  console.error(
    '\n  Resolve against the PRD §0 priority sources (MSRDC, CMO/PIB, NBM&CW, trade press),'
  );
  console.error('  set verified:true + source URL in src/data/projectData.ts, and rebuild.');
  console.error('  For staging/QA builds use: npm run build:staging\n');
  process.exit(1);
}
console.log(`✓ verify-gate: all ${boundPaths.length} bound facts verified. Production build may proceed.`);
