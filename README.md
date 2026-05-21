# Better Every Run

Lightweight run learning for OpenClaw agents.

Better Every Run turns small corrections into future behavior. The user gives the shortest possible instruction, and the skill hides the ledger, proposal, and memory-patch machinery behind a simple command-style flow.

## Human Surface

In OpenClaw chat:

```text
/ber fix vague status update -> exact command output and next action
/ber remember design software for humans from the shortest path to outcome
/ber report
```

The agent handles the local helper, target file, evidence ledger, and durable memory write in the background. The human sees the command, the result, and any follow-up action.

## Product Rule

- Humans should not manage accept/export/apply steps.
- The agent should summarize the outcome in chat.
- Durable memory writes must be explicit and target a real file.
- No plugin, server, web UI, database, or external service is required.

## Storage

The helper writes a project-local evidence trail for the agent. This is for audit/debugging and is not part of the normal human workflow.

## Internal Helper

The bundled helper is for agents, tests, and audits. Do not make humans manage helper paths, target files, accept/export/apply steps, or ledger files during normal use.

## Verify

```bash
make test
```
