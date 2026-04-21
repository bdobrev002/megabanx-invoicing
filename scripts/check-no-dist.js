#!/usr/bin/env node
/**
 * Pre-commit guard for MegaBanx v2.
 *
 * Rejects staged files that violate .agents/RULES.md §1.1, §1.4, §1.5:
 *   - anything under frontend-v2/dist/ or backend-v2/dist/ (build output)
 *   - legacy patch-style files: patch_*.py, patch_*.js, *.patch, *.inject.js
 *   - inline <script> injection helpers: *.inject.html
 *
 * Exits non-zero on any violation so git aborts the commit.
 */

import { execSync } from 'node:child_process'

const FORBIDDEN_PATHS = [
  /^frontend-v2\/dist(\/|$)/,
  /^backend-v2\/dist(\/|$)/,
  /^dist(\/|$)/,
  /^frontend\/dist(\/|$)/,
]

const FORBIDDEN_NAMES = [
  /(^|\/)patch_.+\.(py|js|ts|tsx|mjs|cjs)$/,
  /\.patch$/,
  /\.inject\.(js|ts|tsx|html|mjs|cjs)$/,
]

function stagedFiles() {
  const out = execSync('git diff --cached --name-only --diff-filter=ACMR', {
    encoding: 'utf8',
  })
  return out.split('\n').map((s) => s.trim()).filter(Boolean)
}

const violations = []

for (const file of stagedFiles()) {
  for (const rx of FORBIDDEN_PATHS) {
    if (rx.test(file)) {
      violations.push({ file, reason: 'build-output directory (dist/)' })
    }
  }
  for (const rx of FORBIDDEN_NAMES) {
    if (rx.test(file)) {
      violations.push({ file, reason: 'legacy patch-style file name' })
    }
  }
}

if (violations.length > 0) {
  console.error('\n[check-no-dist] Commit rejected — MegaBanx v2 RULES.md §1:\n')
  for (const v of violations) {
    console.error(`  × ${v.file}  (${v.reason})`)
  }
  console.error('\nBuild output is never committed; patches are forbidden.')
  console.error('If you truly need this path, edit .agents/RULES.md in a separate PR first.\n')
  process.exit(1)
}
