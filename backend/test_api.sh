#!/usr/bin/env bash
# Smoke-test the API end to end against a running backend.
#
#   BASE_URL=http://localhost:8000 ADMIN_KEY=... ./test_api.sh
#
# Requires: curl, python3 (for pretty-printing / date math). Exits non-zero on the
# first failed assertion so it is usable in CI.
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8000}"
ADMIN_KEY="${ADMIN_KEY:?set ADMIN_KEY to match the backend ADMIN_KEY}"

say() { printf '\n=== %s ===\n' "$1"; }
today() { python3 -c 'import datetime,os;print(datetime.date.today().isoformat())'; }

say "health"
curl -fsS "$BASE_URL/" | python3 -m json.tool

say "create user (admin)"
NAME="tester-$RANDOM"
TOKEN=$(curl -fsS -X POST "$BASE_URL/users" \
  -H "X-Admin-Key: $ADMIN_KEY" -H "Content-Type: application/json" \
  -d "{\"name\":\"$NAME\"}" | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
echo "token: ${TOKEN:0:8}…"

D=$(today)
say "submit steps for today ($D) = 5000"
curl -fsS -X POST "$BASE_URL/steps" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"date\":\"$D\",\"steps\":5000,\"source\":\"manual\"}" | python3 -m json.tool

say "re-submit same day = 9000 (must UPSERT, not duplicate)"
curl -fsS -X POST "$BASE_URL/steps" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"date\":\"$D\",\"steps\":9000,\"source\":\"shortcut\"}" | python3 -m json.tool

say "GET /me — expect exactly ONE entry, steps=9000"
curl -fsS "$BASE_URL/me" -H "Authorization: Bearer $TOKEN" | python3 -c '
import sys,json
rows=json.load(sys.stdin)
assert len(rows)==1, f"expected 1 entry, got {len(rows)}"
assert rows[0]["steps"]==9000, rows
print("OK:", rows)
'

say "reject bad steps (999999)"
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/steps" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"date\":\"$D\",\"steps\":999999}")
[ "$code" = "422" ] && echo "OK: rejected with 422" || { echo "FAIL: got $code"; exit 1; }

say "reject bad date (2026-13-45)"
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/steps" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"date\":\"2026-13-45\",\"steps\":100}")
[ "$code" = "422" ] && echo "OK: rejected with 422" || { echo "FAIL: got $code"; exit 1; }

say "reject missing token"
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/me")
[ "$code" = "401" ] && echo "OK: 401" || { echo "FAIL: got $code"; exit 1; }

say "leaderboard (day) — tester should be present with 9000"
curl -fsS "$BASE_URL/leaderboard?period=day" | python3 -c '
import sys,json
rows=json.load(sys.stdin)
print(json.dumps(rows, indent=2))
assert any(r["steps"]==9000 for r in rows), "tester total missing from leaderboard"
print("OK")
'

say "ALL CHECKS PASSED"
