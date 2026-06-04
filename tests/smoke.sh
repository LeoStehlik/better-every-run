#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cd "$TMP"

node "$ROOT/scripts/ber.js" init >/tmp/ber-init.out
node "$ROOT/scripts/ber.js" capture --type correction --note "Use the durable session manager for long jobs." --scope workspace --expires never --tags remote,ops >/tmp/ber-capture.out
node "$ROOT/scripts/ber.js" list --today >/tmp/ber-list.out
node "$ROOT/scripts/ber.js" propose --today >/tmp/ber-propose.out
node "$ROOT/scripts/ber.js" report --today >/tmp/ber-report.out

test -s .better-every-run/events.jsonl
test -s .better-every-run/lessons.jsonl
grep -q "durable session manager" /tmp/ber-list.out
grep -q "scope=workspace" /tmp/ber-list.out
grep -q "Proposed lessons" /tmp/ber-propose.out
grep -q "Promote:" /tmp/ber-propose.out
grep -q "Better Every Run report" /tmp/ber-report.out
grep -q "Promotion suggestions" /tmp/ber-report.out

LESSON_ID="$(node -e 'const fs=require("fs"); const row=JSON.parse(fs.readFileSync(".better-every-run/lessons.jsonl","utf8").trim().split(/\n+/)[0]); console.log(row.id)')"
node "$ROOT/scripts/ber.js" accept "$LESSON_ID" >/tmp/ber-accept.out
grep -q '"status":"accepted"' .better-every-run/lessons.jsonl
node "$ROOT/scripts/ber.js" export-memory-patch >/tmp/ber-export.out
grep -q "Better Every Run accepted lessons" /tmp/ber-export.out
printf "# Test Memory\n" > memory.md
node "$ROOT/scripts/ber.js" apply-memory-patch --target memory.md >/tmp/ber-apply.out
grep -q "durable session manager" memory.md
grep -q "scope workspace" memory.md
grep -q '"exportedTo":"memory.md"' .better-every-run/lessons.jsonl
printf "# One Step Memory\n" > one-step.md
node "$ROOT/scripts/ber.js" remember --note "Keep human usage to one command." --scope skill --target one-step.md --tags ux >/tmp/ber-remember.out
grep -q "Keep human usage to one command" one-step.md
grep -q "Remembered" /tmp/ber-remember.out
PROMOTE_ID="$(node -e 'const fs=require("fs"); const rows=fs.readFileSync(".better-every-run/lessons.jsonl","utf8").trim().split(/\n+/).map(JSON.parse); console.log(rows.find((r)=>r.text.includes("Keep human usage")).id)')"
printf "# Skill Notes\n" > skill.md
node "$ROOT/scripts/ber.js" promote "$PROMOTE_ID" --to skill --target skill.md --note "promote into skill behavior" >/tmp/ber-promote.out
grep -q "Lesson promoted" /tmp/ber-promote.out
grep -q "Skill behavior to preserve" skill.md
grep -q '"status":"promoted"' .better-every-run/lessons.jsonl
printf "# Fix Memory\n" > fix.md
node "$ROOT/scripts/ber.js" fix "agent exposes ledger workflow -> agent gives one human command" --scope skill --target fix.md --tags ux >/tmp/ber-fix.out
grep -q "agent exposes ledger workflow" fix.md
grep -q "agent gives one human command" fix.md
grep -q "Fixed" /tmp/ber-fix.out
printf "# Facade Memory\n" > facade.md
node "$ROOT/scripts/ber" fix "human sees helper internals -> human sees /ber fix" --target facade.md --tags ux >/tmp/ber-facade-fix.out
grep -q "human sees /ber fix" facade.md
node "$ROOT/scripts/ber" remember "Human command hides the ledger machinery." --target facade.md --tags ux >/tmp/ber-facade-remember.out
grep -q "Human command hides the ledger machinery" facade.md
node "$ROOT/scripts/ber" report --today >/tmp/ber-facade-report.out
grep -q "Better Every Run report" /tmp/ber-facade-report.out

echo "smoke ok"
