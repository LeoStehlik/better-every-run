#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
cd "$WORK"

say() {
  sleep 0.8
  printf '\n# %s\n' "$*"
  sleep 1.4
}

ber() {
  sleep 0.5
  printf '\n$ ber %s\n' "$*"
  sleep 0.8
  node "$ROOT/scripts/ber.js" "$@"
  sleep 1.1
}

show_fixture() {
  sleep 0.5
  printf '\n$ node -e "print eval fixture"\n'
  sleep 0.8
  node -e 'const fs=require("fs"); const rows=JSON.parse(fs.readFileSync("evals/ber-regressions.json","utf8")); console.log(JSON.stringify(rows[0], null, 2));'
  sleep 1.1
}

lesson_id() {
  node -e 'const fs=require("fs"); const rows=fs.readFileSync(".better-every-run/lessons.jsonl","utf8").trim().split(/\n+/).map(JSON.parse); console.log(rows.find((r)=>r.text.includes(process.argv[1])).id)' "$1"
}

say "Better Every Run: correction intake, not note hoarding"
ber init

say "1. Capture a human correction with the tiny /ber-shaped surface"
ber fix \
  "agent says done without proof -> agent shows exact verification output" \
  --scope eval \
  --tags proof,regression
LESSON_ID="$(lesson_id "done without proof")"

say "2. Report shows the lesson and where it should go"
ber report --today

say "3. Write a lesson card before touching a durable file"
printf '# Eval target\n' > eval-target.md
ber card "$LESSON_ID" --to eval --target eval-target.md

say "4. Stale target protection: change the file after the card"
printf 'changed after card\n' >> eval-target.md
sleep 0.5
printf '\n$ ber promote %s --to eval --target eval-target.md --require-card\n' "$LESSON_ID"
sleep 0.8
if node "$ROOT/scripts/ber.js" promote "$LESSON_ID" --to eval --target eval-target.md --require-card >/tmp/ber-stale-demo.out 2>&1; then
  cat /tmp/ber-stale-demo.out
else
  cat /tmp/ber-stale-demo.out
fi
sleep 1.1

say "5. Re-card and promote after review"
ber card "$LESSON_ID" --to eval --target eval-target.md
ber promote "$LESSON_ID" --to eval --target eval-target.md --require-card

say "6. Generate a regression fixture from the correction"
ber eval-fixture "$LESSON_ID" --target evals/ber-regressions.json --name "agent must show verification proof"
show_fixture

say "7. Quarantine one-off lessons instead of preserving bad policy"
ber remember --note "This one-off deployment workaround should not become policy." --scope project --tags lifecycle
QUARANTINE_ID="$(lesson_id "one-off deployment workaround")"
ber quarantine "$QUARANTINE_ID" --reason "one-off workaround"

say "8. Supersede stale lessons when a better rule appears"
ber remember --note "Use the old deploy checklist." --scope skill --tags lifecycle
OLD_ID="$(lesson_id "old deploy checklist")"
ber remember --note "Use the deploy checklist with verification proof." --scope skill --tags lifecycle
NEW_ID="$(lesson_id "verification proof")"
ber supersede "$OLD_ID" --by "$NEW_ID" --reason "new rule includes verification"

say "Final report: BER routes corrections into memory, skill behavior, evals, quarantine, supersession, or nothing"
ber report --today

say "Demo complete"
