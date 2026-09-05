#!/usr/bin/env node
// floor-guard.mjs — diff-scoped enforcement of the CONSTRAINTS.md floor.
// Usage: node scripts/floor-guard.mjs [--base <ref>]   (default base: origin/main or HEAD)
import { execFileSync } from 'node:child_process';

const base = (() => {
  const i = process.argv.indexOf('--base');
  return i > -1 ? process.argv[i + 1] : 'origin/main';
})();

const git = (args) => {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (err) {
    if (err.stdout) return err.stdout.toString();
    return null;
  }
};

// Merge base; fallback to HEAD if origin/main is unreachable or on detached head
let mergeBase = git(['merge-base', base, 'HEAD'])?.trim();
if (!mergeBase) {
  mergeBase = git(['rev-parse', 'HEAD'])?.trim();
}
if (!mergeBase) {
  console.error('floor-guard: could not determine git base');
  process.exit(2);
}

// Unified diff plus untracked files (git diff alone cannot see new files)
const tracked = git(['diff', '--unified=0', mergeBase, '--']) ?? '';
const untrackedFiles = (git(['ls-files', '--others', '--exclude-standard']) ?? '')
  .split('\n')
  .map((s) => s.trim())
  .filter(Boolean)
  .filter((f) => !f.startsWith('.agents/') && !f.startsWith('node_modules/') && !f.includes('package-lock.json'));

let untracked = '';
for (const f of untrackedFiles) {
  const diffOutput = git(['diff', '--no-index', '--unified=0', '/dev/null', f]) ?? '';
  untracked += diffOutput + '\n';
}

const diff = tracked + '\n' + untracked;

const added = [], removed = [];
let file = '';
for (const line of diff.split('\n')) {
  if (line.startsWith('+++ ')) {
    const rawFile = line.slice(4).trim();
    file = rawFile.replace(/^[ab]\//, '');
  } else if (line.startsWith('+') && !line.startsWith('+++')) {
    added.push({ file, text: line.slice(1) });
  } else if (line.startsWith('-') && !line.startsWith('---')) {
    removed.push({ file, text: line.slice(1) });
  }
}

const findings = [];
const flag = (rule, f, text) => findings.push({ rule, file: f, text: text.trim().slice(0, 120) });

// Patterns for floor checks
const SUPPRESSIONS = /@ts-ignore|@ts-nocheck|eslint-disable|biome-ignore|# *noqa|# *type: *ignore|istanbul ignore|nosemgrep|gitleaks:allow|Stryker disable/;
const STUBS = /throw new (Error|NotImplemented).*[Nn]ot implemented|catch\s*\(\w*\)\s*\{\s*\}|catch\s*\{\s*\}|\bTODO\b|\bpass\s*# *stub/;
const SKIPS = /\.(skip|todo)\b|\bxit\(|\bxdescribe\(|@pytest\.mark\.skip|t\.Skip\(/;

// Helper to ignore certain files or documentation / tests for the checker itself
const isCheckExempt = (f) => {
  if (!f) return true;
  if (f.includes('floor-guard') || f.includes('.agents/') || f.includes('SKILL.md')) return true;
  return false;
};

for (const { file, text } of added) {
  if (isCheckExempt(file)) continue;
  if (/CONSTRAINTS\.md$/.test(file)) {
    if (/^\| *(W|E)\d+ *\|/.test(text)) flag('new-exception', file, text);
    continue;
  }
  if (SUPPRESSIONS.test(text)) flag('silenced-checker', file, text);
  if (STUBS.test(text)) flag('unfinished-work', file, text);
  if (SKIPS.test(text)) flag('test-made-easier', file, text);
}

// 2b. Assertion removed from a test file that still exists.
for (const { file, text } of removed) {
  if (isCheckExempt(file)) continue;
  if (/\.(test|spec)\.|_test\.|test_/.test(file) && /\b(expect|assert|should)\b/.test(text)) {
    flag('assertion-removed', file, text);
  }
}

// 1b/2c. Weakened threshold: a number in CONSTRAINTS.md that went down, or a floor bullet deleted.
const nums = (s) => (s.match(/\d+(\.\d+)?/g) || []).map(Number);
const removedConstraints = removed.filter((l) => /CONSTRAINTS\.md$/.test(l.file));
const addedConstraints = added.filter((l) => /CONSTRAINTS\.md$/.test(l.file));
for (const r of removedConstraints) {
  const a = addedConstraints.find((x) => x.text.split(/[|:]/)[0] === r.text.split(/[|:]/)[0]);
  if (a && nums(a.text).some((n, i) => nums(r.text)[i] !== undefined && n < nums(r.text)[i])) {
    flag('threshold-lowered', r.file, r.text + '  ->  ' + a.text);
  }
}

if (findings.length === 0) {
  console.log('floor-guard: clean (no floor violations)');
  process.exit(0);
}

console.error(`floor-guard: ${findings.length} floor violation(s):`);
for (const f of findings) {
  console.error(`  [${f.rule}] ${f.file}: ${f.text}`);
}
console.error('\nEach is a move that lowers the bar. Fix the code or route through tracked exceptions in CONSTRAINTS.md.');
process.exit(1);
