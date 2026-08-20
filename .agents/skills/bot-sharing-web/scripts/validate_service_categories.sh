#!/usr/bin/env bash
set -euo pipefail

REPO_PATH="${1:-$(pwd)}"
CHIPS_FILE="$REPO_PATH/components/services/CategoryChips.tsx"
CONSTANTS_FILE="$REPO_PATH/lib/serviceCategories.ts"
SCHEMA_FILE="$REPO_PATH/prisma/schema.prisma"

if ! command -v rg >/dev/null 2>&1; then
  echo "error: ripgrep (rg) is required" >&2
  exit 2
fi

for f in "$CHIPS_FILE" "$CONSTANTS_FILE" "$SCHEMA_FILE"; do
  if [[ ! -f "$f" ]]; then
    echo "error: missing file: $f" >&2
    exit 2
  fi
done

EXPECTED=$'Private Events\nCommercial Events\nSchools & Universities\nEntertainment\nRestaurants\nHotels\nShopping Centers\nWarehouses'

# Extract canonical labels from the SERVICE_CATEGORIES array (the source of truth)
ACTUAL="$(
  sed -n '/export const SERVICE_CATEGORIES = \[/,/\] as const;/p' "$CONSTANTS_FILE" |
    rg --no-filename -o '"[^"]+"' | sed 's/"//g' || true
)"

if [[ -z "$ACTUAL" ]]; then
  echo "error: no category labels found in $CONSTANTS_FILE" >&2
  exit 1
fi

if [[ "$ACTUAL" != "$EXPECTED" ]]; then
  echo "error: categories do not match canonical Hifivebot taxonomy" >&2
  echo "expected:" >&2
  echo "$EXPECTED" >&2
  echo "actual:" >&2
  echo "$ACTUAL" >&2
  exit 1
fi

# Verify the category chips render from the constants file
if ! rg -q 'SERVICE_CATEGORY_META' "$CHIPS_FILE"; then
  echo "error: CategoryChips.tsx does not use SERVICE_CATEGORY_META constant" >&2
  exit 1
fi

# Verify Prisma schema keeps category as String
if ! rg -n 'category\s+String' "$SCHEMA_FILE" >/dev/null; then
  echo "error: expected Listing.category to remain String in MVP" >&2
  exit 1
fi

echo "service-categories: valid"
