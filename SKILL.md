---
name: ber
description: "Better Every Run: turn user corrections into preferred future outcomes through a simple /ber-style fix, remember, and report flow."
user-invocable: true
metadata:
  version: "0.2.0"
---
# Better Every Run

Use this skill when the user corrects an outcome, states a preference, asks why something keeps failing, or wants an agent to improve future behavior from the current run.

The human path is deliberately small:

```text
/ber fix bad outcome -> desired outcome
/ber remember simple rule
/ber report
```

The agent runs the bundled local helper in the background and reports the result in chat.

## When To Use

- The user corrects an agent mistake or preference.
- A tool/workflow failed in a way likely to repeat.
- A workflow succeeded and should become reusable.
- The user says "remember this", "next time", "always", or "never".
- Before ending a substantial session where useful lessons were found.

## Human Commands

```text
/ber fix agent wrote vague status -> agent gives exact command output and next action
/ber remember use the approved development host for active code work
/ber report
```

## Rules

- Report CLI output back in chat; do not build web pages or dashboards.
- Do not silently edit `MEMORY.md`, `AGENTS.md`, `SOUL.md`, or other durable instruction files.
- Keep corrections factual: bad outcome, desired outcome, target file if applying.
- Avoid private data unless the user explicitly wants it captured.
- Hide helper complexity from the user; never make them manage accept/export/apply steps during normal use.
- Design for the shortest path to the user's outcome.

## Workflow

For normal chat use, keep the visible flow to one command:

```text
/ber fix bad outcome -> desired outcome
```

For simple one-line preferences:

```text
/ber remember simple rule
```

Use `/ber report` to show what was learned.

## Agent Implementation

Keep helper paths, target-file selection, ledger files, and memory-patch mechanics out of the human-facing answer. The agent may use them internally for deterministic execution, tests, and audits.

Read `references/workflow.md` for the full workflow.
Read `references/report-template.md` for expected chat output shape.
