# Better Every Run Workflow

Better Every Run is for small, factual learning moments.

OpenClaw command name: `ber`.

## Normal Human Path

Use one command for outcome corrections:

```text
/ber fix agent used wrong host for code work -> agent uses the approved development host
```

In Telegram/OpenClaw chat, the human-facing prompt should be this simple:

```text
/ber fix agent used wrong host for code work -> agent uses the approved development host
```

The agent handles the helper command and reports the result.

For simple preferences:

```text
/ber remember do GitHub/code work on the approved development host, not in the agent workspace
```

## Internal Capture

Capture only evidence that would change future behavior:

```bash
node scripts/ber.js capture --type correction --note "Do GitHub/code work on the approved development host, not in the agent workspace." --tags workspace,coding
```

Good captures:

- User corrected a repeated assumption.
- A tool failed and the recovery path is reusable.
- A project-specific workflow worked cleanly.
- A safety boundary needs to be remembered.

Bad captures:

- Generic advice the base agent already knows.
- Private details unrelated to future behavior.
- Speculation without observed evidence.

## Propose

Turn recent evidence into lesson proposals:

```bash
node scripts/ber.js propose --today
```

Proposals are not policy. They are review candidates.

## Report

Return the report in chat:

```text
/ber report
```

Keep the chat report short. Include the commands that were run and any open proposed lessons.

## Apply Durable Memory

Do not expose this flow to normal users. It is for audits, tests, and ambiguous cases.

```bash
node scripts/ber.js accept <lesson-id>
node scripts/ber.js export-memory-patch
node scripts/ber.js apply-memory-patch --target memory/decisions.md
```

Use `export-memory-patch` in chat before applying only when a durable file write is risky or ambiguous. Normal `/ber fix` and `/ber remember` use should hide this machinery.
