#!/usr/bin/env bash
set -euo pipefail

REPO_PATH="${1:-$(pwd)}"

if ! command -v rg >/dev/null 2>&1; then
  echo "error: ripgrep (rg) is required" >&2
  exit 2
fi

if [[ ! -d "$REPO_PATH" ]]; then
  echo "error: repo path does not exist: $REPO_PATH" >&2
  exit 2
fi

PATTERN='\b(airbnb|aircover|host|guest|property|per night|your home)\b'

echo "Scanning code files for legacy terms in: $REPO_PATH"
set +e
rg -n --ignore-case \
  --glob '!node_modules' \
  --glob '!.next' \
  --glob '!.git' \
  --glob '!dist' \
  --glob '!build' \
  --glob '*.ts' \
  --glob '*.tsx' \
  --glob '*.js' \
  --glob '*.jsx' \
  "$PATTERN" "$REPO_PATH"
STATUS=$?
set -e

if [[ $STATUS -eq 0 ]]; then
  echo
  echo "legacy-terms: found matches"
  exit 1
fi

if [[ $STATUS -eq 1 ]]; then
  echo "legacy-terms: clean"
  exit 0
fi

echo "error: rg execution failed" >&2
exit $STATUS
