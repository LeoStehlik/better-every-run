---
name: ber
description: "Better Every Run: turn explicit /ber corrections into preferred future outcomes through a small fix, remember, and report flow."
user-invocable: true
metadata:
  version: "0.5.0"
---
# Better Every Run

Use this skill only when the user explicitly invokes `/ber`, names Better Every Run, or directly asks to persist a lesson for future runs. Do not auto-capture ordinary corrections, casual preferences, or words like "remember", "always", "never", or "next time" unless the user clearly wants durable learning.

The human path is deliberately small:

```text
/ber fix bad outcome -> desired outcome
/ber remember simple rule
/ber report
```

The agent runs the bundled local helper and reports the result in chat, including whether anything was written locally or appended to a durable memory file. Lessons may carry scope, expiry, status, promotion hints, lesson cards, scanner verdicts, target hashes, quarantine/supersession metadata, and eval-fixture follow-up.

## When To Use

- The user explicitly types `/ber fix ... -> ...`.
- The user explicitly types `/ber remember ...`.
- The user explicitly asks for a Better Every Run report.
- The user asks the agent to record a reusable correction as durable memory.

## Human Commands

```text
/ber fix agent wrote vague status -> agent gives exact command output and next action
/ber remember use the approved development host for active code work
/ber report
```

## Rules

- Report CLI output back in chat; do not build web pages or dashboards.
- Do not silently edit `MEMORY.md`, `AGENTS.md`, `SOUL.md`, or other durable instruction files.
- Only append to a durable memory file when the user explicitly asked for persistence or approved the target.
- Keep corrections factual: bad outcome, desired outcome, target file if applying.
- Use scope metadata when it helps decide whether a lesson belongs only to this run, the project, the workspace, a skill, memory, or an eval.
- Avoid private data unless the user explicitly wants it captured.
- Keep the user-facing flow short, but disclose persistence: local store, durable target file if used, and how to review it.
- Design for the shortest path to the user's outcome.
- Never publish `.better-every-run/` state, local lessons, event logs, or private corrections.

## Workflow

For normal chat use, keep the visible flow to one command:

```text
/ber fix bad outcome -> desired outcome
```

For simple one-line preferences:

```text
/ber remember simple rule
```

Use `/ber report` to show what was learned, including open proposals and promotion suggestions.

## Agent Implementation

Keep low-level helper commands out of normal chat unless debugging, but never hide persistence. A normal answer should say whether the lesson was recorded only in `.better-every-run/` or appended to a named durable file.

Read `references/workflow.md` for the full workflow.
Read `references/report-template.md` for expected chat output shape.

Before publishing or packaging, verify:
- `.better-every-run/` is excluded
- `make test` passes
- lesson-card, lifecycle, and eval-fixture demos are generic and contain no private workspace paths, chat IDs, tokens, or hostnames
- examples contain no private workspace paths, chat IDs, tokens, or hostnames
- docs say activation is explicit-only and persistence is disclosed
