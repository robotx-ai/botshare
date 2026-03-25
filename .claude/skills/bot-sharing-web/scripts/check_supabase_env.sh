#!/usr/bin/env bash
set -euo pipefail

REPO_PATH="${1:-$(pwd)}"
ENV_FILE="$REPO_PATH/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "error: missing .env at $ENV_FILE" >&2
  exit 2
fi

required=(
  SUPABASE_PROJECT_REF
  SUPABASE_ACCESS_TOKEN
  SUPABASE_DB_PASSWORD
  SUPABASE_SERVICE_ROLE_KEY
)

status=0
for key in "${required[@]}"; do
  if rg -q "^${key}=" "$ENV_FILE"; then
    val="$(awk -F= -v k="$key" '$1==k{print $2}' "$ENV_FILE" | tail -n1 | tr -d '"' | xargs)"
    if [[ -n "$val" ]]; then
      echo "$key=set"
    else
      echo "$key=empty"
      status=1
    fi
  else
    echo "$key=missing"
    status=1
  fi
done

# URL can be private SUPABASE_URL or public NEXT_PUBLIC_SUPABASE_URL.
if rg -q '^SUPABASE_URL=' "$ENV_FILE"; then
  val="$(awk -F= '$1=="SUPABASE_URL"{print $2}' "$ENV_FILE" | tail -n1 | tr -d '"' | xargs)"
  if [[ -n "$val" ]]; then
    echo "SUPABASE_URL=set"
  else
    echo "SUPABASE_URL=empty"
    status=1
  fi
elif rg -q '^NEXT_PUBLIC_SUPABASE_URL=' "$ENV_FILE"; then
  val="$(awk -F= '$1=="NEXT_PUBLIC_SUPABASE_URL"{print $2}' "$ENV_FILE" | tail -n1 | tr -d '"' | xargs)"
  if [[ -n "$val" ]]; then
    echo "SUPABASE_URL=fallback:NEXT_PUBLIC_SUPABASE_URL"
  else
    echo "NEXT_PUBLIC_SUPABASE_URL=empty"
    status=1
  fi
else
  echo "SUPABASE_URL=missing"
  echo "NEXT_PUBLIC_SUPABASE_URL=missing"
  status=1
fi

if [[ $status -eq 0 ]]; then
  echo "supabase-env: ready"
else
  echo "supabase-env: not-ready"
fi

exit $status
