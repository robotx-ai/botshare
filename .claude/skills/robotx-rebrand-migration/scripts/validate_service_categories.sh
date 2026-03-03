#!/usr/bin/env bash
set -euo pipefail

REPO_PATH="${1:-$(pwd)}"
CATEGORIES_FILE="$REPO_PATH/components/navbar/Categories.tsx"
CONSTANTS_FILE="$REPO_PATH/lib/robotxServiceCategories.ts"
SCHEMA_FILE="$REPO_PATH/prisma/schema.prisma"

if ! command -v rg >/dev/null 2>&1; then
  echo "error: ripgrep (rg) is required" >&2
  exit 2
fi

for f in "$CATEGORIES_FILE" "$CONSTANTS_FILE" "$SCHEMA_FILE"; do
  if [[ ! -f "$f" ]]; then
    echo "error: missing file: $f" >&2
    exit 2
  fi
done

EXPECTED=$'Showcase & Performance\nCleaning\nWarehouse\nRestaurant'

# Extract canonical labels from the constants file (the source of truth)
ACTUAL="$(rg --no-filename -o '"[^"]+"' "$CONSTANTS_FILE" | sed 's/"//g' | head -n 4 || true)"

if [[ -z "$ACTUAL" ]]; then
  echo "error: no category labels found in $CONSTANTS_FILE" >&2
  exit 1
fi

if [[ "$ACTUAL" != "$EXPECTED" ]]; then
  echo "error: categories do not match canonical RobotX taxonomy" >&2
  echo "expected:" >&2
  echo "$EXPECTED" >&2
  echo "actual:" >&2
  echo "$ACTUAL" >&2
  exit 1
fi

# Verify Categories.tsx imports from the constants file
if ! rg -q 'ROBOTX_SERVICE_CATEGORIES' "$CATEGORIES_FILE"; then
  echo "error: Categories.tsx does not use ROBOTX_SERVICE_CATEGORIES constant" >&2
  exit 1
fi

# Verify Prisma schema keeps category as String
if ! rg -n 'category\s+String' "$SCHEMA_FILE" >/dev/null; then
  echo "error: expected Listing.category to remain String in MVP" >&2
  exit 1
fi

echo "service-categories: valid"
