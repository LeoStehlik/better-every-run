#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const STORE_DIR = ".better-every-run";
const EVENTS_FILE = "events.jsonl";
const LESSONS_FILE = "lessons.jsonl";

const TYPES = new Set([
  "correction",
  "failure",
  "success",
  "preference",
  "workflow",
  "tooling",
  "warning",
  "note",
]);

const SCOPES = new Set(["run", "project", "workspace", "skill", "memory", "eval"]);
const PROMOTION_TARGETS = new Set(["memory", "skill", "eval"]);

function usage() {
  return `Better Every Run

Usage:
  node scripts/ber.js init
  node scripts/ber.js fix "<bad outcome> -> <desired outcome>" [--target <markdown-file>] [--tags a,b]
  node scripts/ber.js fix --from <bad outcome> --to <desired outcome> [--target <markdown-file>] [--tags a,b]
  node scripts/ber.js capture --type <type> --note <text> [--source <text>] [--tags a,b]
  node scripts/ber.js remember --note <text> [--type <type>] [--scope <scope>] [--expires YYYY-MM-DD|never] [--target <markdown-file>] [--tags a,b]
  node scripts/ber.js promote <lesson-id> --to <memory|skill|eval> --target <markdown-file> [--note <text>]
  node scripts/ber.js list [--today] [--limit N]
  node scripts/ber.js propose [--today] [--limit N]
  node scripts/ber.js report [--today|--week]
  node scripts/ber.js accept <lesson-id>
  node scripts/ber.js reject <lesson-id> [--reason <text>]
  node scripts/ber.js export-memory-patch [--all]
  node scripts/ber.js apply-memory-patch --target <markdown-file> [--all]

Types:
  ${Array.from(TYPES).join(", ")}

Scopes:
  ${Array.from(SCOPES).join(", ")}
`;
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      out._.push(arg);
      continue;
    }
    const key = arg.slice(2);
    if (key === "today" || key === "week" || key === "all") {
      out[key] = true;
      continue;
    }
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    out[key] = value;
    i += 1;
  }
  return out;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function localDate(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function localStamp(d = new Date()) {
  return `${localDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function makeId(prefix) {
  const d = new Date();
  const compact = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `${prefix}_${compact}_${Math.random().toString(36).slice(2, 6)}`;
}

function storePath(file) {
  return path.join(process.cwd(), STORE_DIR, file);
}

function ensureStore() {
  fs.mkdirSync(path.join(process.cwd(), STORE_DIR), { recursive: true });
  for (const file of [EVENTS_FILE, LESSONS_FILE]) {
    const p = storePath(file);
    if (!fs.existsSync(p)) fs.writeFileSync(p, "", "utf8");
  }
}

function readJsonl(file) {
  ensureStore();
  const text = fs.readFileSync(storePath(file), "utf8").trim();
  if (!text) return [];
  return text.split(/\n+/).map((line, idx) => {
    try {
      return JSON.parse(line);
    } catch (err) {
      throw new Error(`${file}:${idx + 1}: invalid JSONL: ${err.message}`);
    }
  });
}

function appendJsonl(file, value) {
  ensureStore();
  fs.appendFileSync(storePath(file), `${JSON.stringify(value)}\n`, "utf8");
}

function writeJsonl(file, values) {
  ensureStore();
  fs.writeFileSync(storePath(file), values.map((v) => JSON.stringify(v)).join("\n") + (values.length ? "\n" : ""), "utf8");
}

function filterByWindow(items, opts) {
  if (opts.today) {
    const today = localDate();
    return items.filter((item) => item.date === today);
  }
  if (opts.week) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    return items.filter((item) => new Date(item.timestamp) >= cutoff);
  }
  return items;
}

function normalize(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function lessonCategory(type) {
  if (type === "failure" || type === "warning") return "warning";
  if (type === "tooling") return "tooling";
  if (type === "preference" || type === "correction") return "preference";
  if (type === "success" || type === "workflow") return "workflow";
  return "note";
}

function lessonText(event) {
  const prefix = {
    correction: "When similar work appears, follow the corrected behavior:",
    failure: "Avoid repeating this failure:",
    success: "Reuse this successful pattern:",
    preference: "Respect this user preference:",
    workflow: "Prefer this workflow:",
    tooling: "Use this tooling note:",
    warning: "Watch for this risk:",
    note: "Remember:",
  }[event.type] || "Remember:";
  return `${prefix} ${event.note}`;
}

function formatTags(tags) {
  return tags && tags.length ? ` [${tags.join(", ")}]` : "";
}

function inferScope(event) {
  if (event.scope) return event.scope;
  const haystack = normalize(`${event.type} ${event.note} ${(event.tags || []).join(" ")}`);
  if (/\b(eval|test|regression|benchmark|check)\b/.test(haystack)) return "eval";
  if (/\b(skill|skill md|clawhub|slash command)\b/.test(haystack)) return "skill";
  if (/\b(memory|remember|durable|preference|always|never|next time)\b/.test(haystack)) return "memory";
  if (/\b(workspace|agent|operating rule|startup)\b/.test(haystack)) return "workspace";
  if (/\b(session|this run|current run)\b/.test(haystack)) return "run";
  return "project";
}

function promotionTargetsFor(lesson) {
  const targets = [];
  const haystack = normalize(`${lesson.category} ${lesson.scope} ${lesson.text}`);
  if (lesson.scope === "memory" || /\b(always|never|preference|durable|remember|future)\b/.test(haystack)) {
    targets.push("memory");
  }
  if (lesson.scope === "skill" || /\b(skill|command|workflow|human surface|clawhub)\b/.test(haystack)) {
    targets.push("skill");
  }
  if (lesson.scope === "eval" || /\b(eval|test|regression|smoke|verify|failing|failure)\b/.test(haystack)) {
    targets.push("eval");
  }
  return Array.from(new Set(targets));
}

function validateScope(scope) {
  if (!SCOPES.has(scope)) {
    throw new Error(`--scope must be one of: ${Array.from(SCOPES).join(", ")}`);
  }
}

function normalizeExpires(value) {
  if (!value) return "";
  if (value === "never") return "never";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("--expires must be YYYY-MM-DD or never");
  }
  return value;
}

function isExpired(item, today = localDate()) {
  return Boolean(item.expiresAt && item.expiresAt !== "never" && item.expiresAt < today);
}

function cmdInit() {
  ensureStore();
  console.log(`# Better Every Run initialized

- Store: ${path.join(process.cwd(), STORE_DIR)}
- Events: ${storePath(EVENTS_FILE)}
- Lessons: ${storePath(LESSONS_FILE)}`);
}

function cmdCapture(opts) {
  const type = opts.type;
  const note = opts.note;
  const event = createEvent(opts);
  appendJsonl(EVENTS_FILE, event);
  console.log(`# Captured ${event.id}

- Type: ${event.type}
- Note: ${event.note}
- Date: ${event.date}${formatTags(event.tags)}`);
  return event;
}

function createEvent(opts) {
  const type = opts.type;
  const note = opts.note;
  if (!TYPES.has(type)) {
    throw new Error(`--type must be one of: ${Array.from(TYPES).join(", ")}`);
  }
  if (!note || !note.trim()) {
    throw new Error("--note is required");
  }
  const scope = opts.scope || inferScope({ type, note, tags: opts.tags ? opts.tags.split(",") : [] });
  validateScope(scope);
  const now = new Date();
  const event = {
    id: makeId("evt"),
    timestamp: now.toISOString(),
    localTime: localStamp(now),
    date: localDate(now),
    type,
    scope,
    expiresAt: normalizeExpires(opts.expires || opts.expiry || ""),
    note: note.trim(),
    source: opts.source ? opts.source.trim() : "",
    tags: opts.tags ? opts.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
  };
  return event;
}

function createLessonFromEvent(event, status = "proposed") {
  const now = new Date();
  const lesson = {
    id: makeId("les"),
    timestamp: now.toISOString(),
    localTime: localStamp(now),
    date: localDate(now),
    status,
    category: lessonCategory(event.type),
    scope: inferScope(event),
    expiresAt: event.expiresAt || "",
    text: lessonText(event),
    evidenceIds: [event.id],
    rationale: `Generated from ${event.type} event captured on ${event.date}.`,
  };
  lesson.promotionTargets = promotionTargetsFor(lesson);
  return lesson;
}

function cmdRemember(opts) {
  const type = opts.type || "preference";
  const note = opts.note;
  if (!TYPES.has(type)) {
    throw new Error(`--type must be one of: ${Array.from(TYPES).join(", ")}`);
  }
  if (!note || !note.trim()) {
    throw new Error("--note is required");
  }
  if (opts.target && !fs.existsSync(path.resolve(process.cwd(), opts.target))) {
    throw new Error(`Target file does not exist: ${opts.target}`);
  }

  const event = cmdCapture({
    type,
    note,
    source: opts.source || "remember",
    tags: opts.tags || "",
    scope: opts.scope,
    expires: opts.expires,
  });

  const lesson = createLessonFromEvent(event, "accepted");
  appendJsonl(LESSONS_FILE, lesson);

  let applied = "";
  if (opts.target) {
    applyLessonsToTarget([lesson], opts.target);
    applied = `\n- Applied to: ${opts.target}`;
  }

  console.log(`# Remembered

- Lesson: ${lesson.id}
- Status: accepted
- Text: ${lesson.text}${applied}

Storage:
- Local store: ${STORE_DIR}/
${opts.target ? `- Durable file changed: ${opts.target}` : "- Durable file changed: none"}

Use this in chat as: "Better Every Run: remembered."`);
}

function parseFix(opts) {
  let from = opts.from ? opts.from.trim() : "";
  let to = opts.to ? opts.to.trim() : "";
  const raw = opts._.join(" ").trim();

  if ((!from || !to) && raw) {
    const parts = raw.split(/\s*(?:->|=>| to )\s*/i);
    if (parts.length >= 2) {
      from = parts.shift().trim();
      to = parts.join(" -> ").trim();
    }
  }

  if (!from || !to) {
    throw new Error('fix needs "<bad outcome> -> <desired outcome>" or --from ... --to ...');
  }

  return { from, to };
}

function cmdFix(opts) {
  const { from, to } = parseFix(opts);
  if (opts.target && !fs.existsSync(path.resolve(process.cwd(), opts.target))) {
    throw new Error(`Target file does not exist: ${opts.target}`);
  }
  const note = `When this happens: ${from}. Prefer this outcome: ${to}.`;
  const event = createEvent({
    type: "correction",
    note,
    source: opts.source || "fix",
    tags: opts.tags || "fix",
    scope: opts.scope,
    expires: opts.expires,
  });
  appendJsonl(EVENTS_FILE, event);

  const lesson = createLessonFromEvent(event, "accepted");
  lesson.from = from;
  lesson.to = to;
  appendJsonl(LESSONS_FILE, lesson);

  let applied = "";
  if (opts.target) {
    applyLessonsToTarget([lesson], opts.target);
    applied = `\n- Applied to: ${opts.target}`;
  }

  console.log(`# Fixed

- From: ${from}
- To: ${to}
- Lesson: ${lesson.id}${applied}
- Local store: ${STORE_DIR}/
${opts.target ? `- Durable file changed: ${opts.target}` : "- Durable file changed: none"}`);
}

function cmdList(opts) {
  const limit = opts.limit ? Number(opts.limit) : 20;
  const events = filterByWindow(readJsonl(EVENTS_FILE), opts).slice(-limit).reverse();
  if (!events.length) {
    console.log("# Better Every Run events\n\nNo events found.");
    return;
  }
  console.log("# Better Every Run events\n");
  for (const event of events) {
    console.log(`- ${event.id} | ${event.date} | ${event.type} | scope=${event.scope || "project"}${event.expiresAt ? ` | expires=${event.expiresAt}` : ""}${formatTags(event.tags)}\n  ${event.note}`);
  }
}

function cmdPropose(opts) {
  const limit = opts.limit ? Number(opts.limit) : 50;
  const events = filterByWindow(readJsonl(EVENTS_FILE), opts).slice(-limit);
  const lessons = readJsonl(LESSONS_FILE);
  const existing = new Set(lessons.map((lesson) => normalize(lesson.text)));
  const proposed = [];

  for (const event of events) {
    const text = lessonText(event);
    const key = normalize(text);
    if (existing.has(key)) continue;
    existing.add(key);
    const lesson = createLessonFromEvent(event, "proposed");
    appendJsonl(LESSONS_FILE, lesson);
    proposed.push(lesson);
  }

  if (!proposed.length) {
    console.log("# Proposed lessons\n\nNo new lessons proposed.");
    return;
  }

  console.log("# Proposed lessons\n");
  for (const lesson of proposed) {
    console.log(`- ${lesson.id} | ${lesson.category} | ${lesson.status} | scope=${lesson.scope}${lesson.expiresAt ? ` | expires=${lesson.expiresAt}` : ""}\n  ${lesson.text}\n  Evidence: ${lesson.evidenceIds.join(", ")}\n  Promote: ${lesson.promotionTargets.length ? lesson.promotionTargets.join(", ") : "none"}`);
  }
}

function updateLessonStatus(id, status, reason = "") {
  if (!id) throw new Error("lesson-id is required");
  const lessons = readJsonl(LESSONS_FILE);
  const lesson = lessons.find((item) => item.id === id);
  if (!lesson) throw new Error(`Lesson not found: ${id}`);
  lesson.status = status;
  lesson.decisionAt = new Date().toISOString();
  lesson.decisionLocalTime = localStamp();
  if (reason) lesson.decisionReason = reason;
  writeJsonl(LESSONS_FILE, lessons);
  console.log(`# Lesson ${status}

- ID: ${lesson.id}
- Category: ${lesson.category}
- Text: ${lesson.text}${reason ? `\n- Reason: ${reason}` : ""}`);
}

function selectedMemoryLessons(opts) {
  const lessons = readJsonl(LESSONS_FILE);
  return lessons.filter((lesson) => opts.all || lesson.status === "accepted");
}

function memoryPatchBlock(lessons) {
  const today = localDate();
  const rows = lessons.map((lesson) => {
    const evidence = lesson.evidenceIds && lesson.evidenceIds.length ? ` Evidence: ${lesson.evidenceIds.join(", ")}.` : "";
    const expiry = lesson.expiresAt ? ` expires ${lesson.expiresAt};` : "";
    return `- ${lesson.text} (${lesson.category}; scope ${lesson.scope || "project"}; ${lesson.status};${expiry} ${lesson.id}).${evidence}`;
  });
  return `\n## Better Every Run accepted lessons - ${today}\n\n${rows.join("\n")}\n`;
}

function cmdExportMemoryPatch(opts) {
  const lessons = selectedMemoryLessons(opts);
  if (!lessons.length) {
    console.log(`# Better Every Run memory patch

No ${opts.all ? "" : "accepted "}lessons available to export.

Accept a lesson first:

\`\`\`bash
node scripts/ber.js accept <lesson-id>
\`\`\``);
    return;
  }

  console.log(`# Better Every Run memory patch

Review before applying. Suggested append block:
${memoryPatchBlock(lessons)}`);
}

function promotionBlock(lesson, targetType, note = "") {
  const today = localDate();
  const details = [
    `- Lesson: ${lesson.id}`,
    `- Category: ${lesson.category}`,
    `- Scope: ${lesson.scope || "project"}`,
    lesson.expiresAt ? `- Expires: ${lesson.expiresAt}` : "- Expires: none",
    `- Evidence: ${(lesson.evidenceIds || []).join(", ") || "none"}`,
    note ? `- Note: ${note}` : "",
  ].filter(Boolean).join("\n");

  if (targetType === "skill") {
    return `\n## Better Every Run skill lesson - ${today}\n\n${details}\n\nSkill behavior to preserve:\n${lesson.text}\n`;
  }
  if (targetType === "eval") {
    return `\n## Better Every Run eval case - ${today}\n\n${details}\n\nRegression expectation:\n${lesson.text}\n`;
  }
  return memoryPatchBlock([lesson]);
}

function cmdPromote(opts) {
  const id = opts._[0];
  const targetType = opts.to;
  const target = opts.target;
  if (!id) throw new Error("lesson-id is required");
  if (!PROMOTION_TARGETS.has(targetType)) {
    throw new Error(`--to must be one of: ${Array.from(PROMOTION_TARGETS).join(", ")}`);
  }
  if (!target) throw new Error("--target is required");
  const targetPath = path.resolve(process.cwd(), target);
  if (!fs.existsSync(targetPath)) throw new Error(`Target file does not exist: ${target}`);

  const lessons = readJsonl(LESSONS_FILE);
  const lesson = lessons.find((item) => item.id === id);
  if (!lesson) throw new Error(`Lesson not found: ${id}`);
  fs.appendFileSync(targetPath, promotionBlock(lesson, targetType, opts.note || ""), "utf8");
  lesson.status = "promoted";
  lesson.promotedAt = new Date().toISOString();
  lesson.promotedLocalTime = localStamp();
  lesson.promotedTo = targetType;
  lesson.promotedTarget = target;
  writeJsonl(LESSONS_FILE, lessons);
  console.log(`# Lesson promoted\n\n- ID: ${lesson.id}\n- To: ${targetType}\n- Target: ${target}`);
}

function cmdApplyMemoryPatch(opts) {
  const target = opts.target;
  if (!target) {
    throw new Error("--target is required. Example: --target memory/decisions.md");
  }

  const lessons = selectedMemoryLessons(opts);
  if (!lessons.length) {
    throw new Error(`No ${opts.all ? "" : "accepted "}lessons available to apply`);
  }

  applyLessonsToTarget(lessons, target);
}

function applyLessonsToTarget(lessons, target) {
  if (!target) {
    throw new Error("target is required");
  }

  const targetPath = path.resolve(process.cwd(), target);
  if (!fs.existsSync(targetPath)) {
    throw new Error(`Target file does not exist: ${target}`);
  }

  fs.appendFileSync(targetPath, memoryPatchBlock(lessons), "utf8");

  const allLessons = readJsonl(LESSONS_FILE);
  const appliedIds = new Set(lessons.map((lesson) => lesson.id));
  for (const lesson of allLessons) {
    if (!appliedIds.has(lesson.id)) continue;
    lesson.exportedAt = new Date().toISOString();
    lesson.exportedLocalTime = localStamp();
    lesson.exportedTo = target;
  }
  writeJsonl(LESSONS_FILE, allLessons);

  console.log(`# Better Every Run memory patch applied

- Target: ${target}
- Lessons appended: ${lessons.length}
- Lesson IDs: ${lessons.map((lesson) => lesson.id).join(", ")}`);
}

function countsBy(items, field) {
  return items.reduce((acc, item) => {
    const key = item[field] || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function formatCounts(counts) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return entries.length ? entries.map(([k, v]) => `- ${k}: ${v}`).join("\n") : "- none";
}

function cmdReport(opts) {
  const events = filterByWindow(readJsonl(EVENTS_FILE), opts);
  const lessons = filterByWindow(readJsonl(LESSONS_FILE), opts);
  const openLessons = lessons.filter((lesson) => lesson.status === "proposed");
  const accepted = lessons.filter((lesson) => lesson.status === "accepted");
  const rejected = lessons.filter((lesson) => lesson.status === "rejected");
  const promoted = lessons.filter((lesson) => lesson.status === "promoted");
  const expired = lessons.filter((lesson) => isExpired(lesson));
  const recentEvents = events.slice(-5).reverse();
  const promotionSuggestions = accepted
    .filter((lesson) => !isExpired(lesson) && lesson.promotionTargets && lesson.promotionTargets.length)
    .slice(-5)
    .reverse();

  const label = opts.today ? "today" : opts.week ? "last 7 days" : "all time";
  console.log(`# Better Every Run report (${label})

## Storage

- Local store: ${STORE_DIR}/
- Durable files changed: ${accepted.filter((lesson) => lesson.exportedTo).map((lesson) => lesson.exportedTo).filter((value, index, arr) => arr.indexOf(value) === index).join(", ") || "none"}

## Counts

- Events captured: ${events.length}
- Lessons proposed: ${lessons.length}
- Open proposals: ${openLessons.length}
- Accepted: ${accepted.length}
- Rejected: ${rejected.length}
- Promoted: ${promoted.length}
- Expired: ${expired.length}

## Event types

${formatCounts(countsBy(events, "type"))}

## Recent evidence

${recentEvents.length ? recentEvents.map((event) => `- ${event.id} | ${event.type}: ${event.note}`).join("\n") : "- none"}

## Open lesson proposals

${openLessons.length ? openLessons.map((lesson) => `- ${lesson.id} | ${lesson.category}: ${lesson.text}`).join("\n") : "- none"}

## Promotion suggestions

${promotionSuggestions.length ? promotionSuggestions.map((lesson) => {
  const first = lesson.promotionTargets[0];
  return `- ${lesson.id} | ${lesson.scope}/${lesson.category}: promote to ${lesson.promotionTargets.join(", ")}\n  Example: node scripts/ber.js promote ${lesson.id} --to ${first} --target <markdown-file>`;
}).join("\n") : "- none"}

## Next action

${openLessons.length ? "Review proposed lessons. Accept only those that should become durable policy." : promotionSuggestions.length ? "Promote accepted lessons only when they should change memory, a skill, or an eval." : "Capture more evidence before changing durable policy."}`);
}

function main() {
  const [command, ...rest] = process.argv.slice(2);
  if (!command || command === "help" || command === "--help" || command === "-h") {
    console.log(usage());
    return;
  }

  const opts = parseArgs(rest);
  if (command === "init") return cmdInit();
  if (command === "fix") return cmdFix(opts);
  if (command === "capture") return cmdCapture(opts);
  if (command === "remember") return cmdRemember(opts);
  if (command === "promote") return cmdPromote(opts);
  if (command === "list") return cmdList(opts);
  if (command === "propose") return cmdPropose(opts);
  if (command === "report") return cmdReport(opts);
  if (command === "accept") return updateLessonStatus(opts._[0], "accepted");
  if (command === "reject") return updateLessonStatus(opts._[0], "rejected", opts.reason || "");
  if (command === "export-memory-patch") return cmdExportMemoryPatch(opts);
  if (command === "apply-memory-patch") return cmdApplyMemoryPatch(opts);

  throw new Error(`Unknown command: ${command}\n\n${usage()}`);
}

try {
  main();
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
