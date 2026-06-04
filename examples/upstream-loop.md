# BER Upstream Loop Demo

Better Every Run is the correction loop before a lesson becomes durable memory, a skill rule, or an eval case.

## 1. Capture the correction

```text
/ber fix agent says done without proof -> agent gives exact verification output before claiming done
```

Agent helper:

```bash
node scripts/ber.js fix "agent says done without proof -> agent gives exact verification output before claiming done" --scope eval --tags proof,regression
```

## 2. Read the report

```bash
node scripts/ber.js report --today
```

The report shows accepted lessons, expiry/status metadata, and promotion suggestions.

## 3. Promote only when useful

Memory promotion:

```bash
node scripts/ber.js promote <lesson-id> --to memory --target memory/decisions.md
```

Skill promotion:

```bash
node scripts/ber.js promote <lesson-id> --to skill --target SKILL.md
```

Eval promotion:

```bash
node scripts/ber.js promote <lesson-id> --to eval --target tests/ber-regressions.md
```

## Product Point

The human still sees the small `/ber` surface. The agent gets enough structure to decide whether the correction belongs in memory, a skill, or an eval.
