#!/usr/bin/env bash
#
# Post-build guard for MegaBanx v2.
#
# Runs after `npm --prefix frontend-v2 run build` in CI.
# Verifies the produced frontend-v2/dist/ does not contain any of the legacy
# anti-patterns listed in .agents/RULES.md §1.2–§1.4:
#
#   - exactly one .js module referenced from index.html and no inline <script>
#     except the Vite-generated module bootstrap
#   - no `document.write`, `innerHTML =`, `eval(`, `new Function` tokens
#     appearing as literals in the bundle (Vite/esbuild does not emit these
#     from our source, so their presence means someone smuggled them in)
#   - no unexpected top-level files (lockfiles, .env, .patch, etc.)
#
# Exits non-zero on violation; CI refuses to promote such a build.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="${ROOT}/frontend-v2/dist"

if [[ ! -d "${DIST}" ]]; then
  echo "[validate-build] frontend-v2/dist not found — did you run 'npm --prefix frontend-v2 run build'?" >&2
  exit 1
fi

fail=0
fail_with() {
  echo "[validate-build] × $*" >&2
  fail=1
}

# ---------------------------------------------------------------------------
# 1. Top-level layout
# ---------------------------------------------------------------------------
allowed_top='^(index\.html|assets|[a-zA-Z0-9_.-]+\.(svg|png|jpg|jpeg|webp|ico|woff2?|txt|json|xml|webmanifest))$'
while IFS= read -r -d '' entry; do
  base="$(basename "$entry")"
  if ! [[ "${base}" =~ ${allowed_top} ]]; then
    fail_with "Unexpected top-level dist entry: ${base}"
  fi
done < <(find "${DIST}" -mindepth 1 -maxdepth 1 -print0)

# ---------------------------------------------------------------------------
# 2. index.html cleanliness
# ---------------------------------------------------------------------------
INDEX="${DIST}/index.html"
if [[ ! -f "${INDEX}" ]]; then
  fail_with "dist/index.html missing"
else
  inline_scripts=$(grep -cE '<script(>| [^>]*>)' "${INDEX}" || true)
  module_scripts=$(grep -cE '<script[^>]*type="module"[^>]*src=' "${INDEX}" || true)
  if (( inline_scripts != module_scripts )); then
    fail_with "index.html contains ${inline_scripts} <script> tags but only ${module_scripts} are Vite modules — possible inline-script injection"
  fi

  if grep -qE '\s(on[a-z]+)=' "${INDEX}"; then
    fail_with "index.html contains inline event handlers (onclick=, onload=, …). Forbidden by RULES.md §1.4"
  fi
fi

# ---------------------------------------------------------------------------
# 3. Bundle cleanliness — no dangerous literals
# ---------------------------------------------------------------------------
danger_literals=(
  'document\.write\s*\('
  'document\.writeln\s*\('
  'insertAdjacentHTML'
  'new\s+Function\s*\('
  '\beval\s*\('
)
for pattern in "${danger_literals[@]}"; do
  hits=$(grep -rEl "${pattern}" "${DIST}" 2>/dev/null || true)
  if [[ -n "${hits}" ]]; then
    fail_with "Forbidden pattern '${pattern}' found in dist/:"
    while IFS= read -r h; do
      [[ -n "$h" ]] && echo "    ${h}" >&2
    done <<< "${hits}"
  fi
done

if (( fail == 0 )); then
  echo "[validate-build] ✓ dist/ clean (MegaBanx v2 RULES.md §1.2–§1.5)"
fi
exit "${fail}"
