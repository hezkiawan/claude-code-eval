// F2 Room Claiming + SLA — acceptance test (HTTP + direct Firestore reads).
// Usage:  node f2-claim-acceptance.mjs --key <path/to/serviceAccountKey.json> [--api http://localhost:8080]
// One-time setup in this folder: npm install
// The run's backend must be running and use the SAME Firestore project as the key.
// The prompt does not fix field names or failure status codes, so this checker is name-agnostic:
//   - success = any 2xx, failure = any 4xx (5xx counts as a fail, except for race losers, where it's reported)
//   - agent name = any field on the room doc whose value equals the agent name
//   - claim time = any date-like field (Timestamp, ISO string, epoch), nested fields included
//   - breach = a field whose path contains "breach" set to true/a date/"breached", or any value "breached"
import { parseArgs } from "./lib/args.mjs";
import { openDb } from "./lib/db.mjs";

const args = parseArgs();
const API = String(args.api ?? "http://localhost:8080").replace(/\/$/, "");
const db = await openDb(args.key);
const results = [];
const stamp = Date.now();

async function claim(id, agentName, raw) {
  const res = await fetch(`${API}/api/rooms/${encodeURIComponent(id)}/claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw ?? JSON.stringify({ agentName }),
  });
  const text = await res.text();
  return { status: res.status, text };
}
const ok = (s) => s >= 200 && s < 300;
const is4xx = (s) => s >= 400 && s < 500;
function expect(cond, msg) { if (!cond) throw new Error(msg); }

function hasValue(obj, want, depth = 0) {
  if (!obj || typeof obj !== "object" || depth > 2) return false;
  return Object.values(obj).some((v) => v === want || (typeof v === "object" && hasValue(v, want, depth + 1)));
}
// Walk the room doc (nested objects included) as [path, value] pairs.
function entries(obj, prefix = "", depth = 0, out = []) {
  if (!obj || typeof obj !== "object" || obj instanceof Date || depth > 3) return out;
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    out.push([path, v]);
    if (v && typeof v === "object" && !(v instanceof Date)) entries(v, path, depth + 1, out);
  }
  return out;
}
// A date-like value: Firestore Timestamp (converted to Date), ISO string, or epoch ms/s.
function asDate(v) {
  if (v instanceof Date) return v;
  if (typeof v === "string" && /^\d{4}-\d\d-\d\dT/.test(v)) { const d = new Date(v); return isNaN(d) ? null : d; }
  if (typeof v === "number" && v > 1e9) return new Date(v > 1e12 ? v : v * 1000);
  return null;
}
// Breached = a field whose path mentions "breach" holding true / a date / "breached",
// or any field holding the string "breached" (e.g. slaStatus: "breached").
function breachState(doc) {
  for (const [path, v] of entries(doc)) {
    const s = typeof v === "string" ? v.toLowerCase() : null;
    if (/breach/i.test(path) && (v === true || asDate(v) || s === "breached" || s === "true")) return "breached";
    if (s === "breached") return "breached";
  }
  return "not-breached";
}
// Claim time = any date-like field other than createdAt, set within the last 5 minutes.
function hasClaimTime(doc) {
  return entries(doc).some(([path, v]) => {
    if (path === "createdAt") return false;
    const d = asDate(v);
    return d && Math.abs(Date.now() - d.getTime()) < 5 * 60_000;
  });
}

async function check(id, name, fn) {
  try { results.push({ id, name, pass: true, detail: (await fn()) ?? "" }); }
  catch (e) { results.push({ id, name, pass: false, detail: e.message }); }
}

// --- preflight ---
const health = await fetch(`${API}/api/health`).catch(() => null);
if (!health || health.status !== 200) { console.error(`Backend not reachable at ${API}/api/health.`); process.exit(2); }
const probe = await db.createRoom({ name: `f2-probe-${stamp}` });
const probeRes = await claim(probe, "Probe Agent");
if (probeRes.status === 404 && !probeRes.text.trim().startsWith("{")) {
  console.error("POST /api/rooms/{id}/claim does not exist on this backend (plain 404). Is this the right run folder?");
  process.exit(2);
}

// --- claim basics ---
const fresh = await db.createRoom({ name: `f2-fresh-${stamp}`, minutesAgo: 0 });
await check("B1", "Claim a fresh idle room -> 2xx; status assigned, agent + claim time stored, not breached", async () => {
  const r = await claim(fresh, "Agent One");
  expect(ok(r.status), `status ${r.status} (${r.text.slice(0, 120)})`);
  const doc = await db.getRoom(fresh);
  expect(doc.status === "assigned", `room status is ${JSON.stringify(doc.status)}, want "assigned"`);
  expect(hasValue(doc, "Agent One"), "agent name not stored on the room");
  expect(hasClaimTime(doc), "no claim timestamp stored on the room");
  expect(breachState(doc) === "not-breached", "fresh room was marked as SLA breached");
});

await check("B2", "Second claim by another agent -> 4xx; owner unchanged", async () => {
  const r = await claim(fresh, "Agent Two");
  expect(is4xx(r.status), `status ${r.status}, want 4xx`);
  const doc = await db.getRoom(fresh);
  expect(hasValue(doc, "Agent One") && !hasValue(doc, "Agent Two"), "owner changed to the second agent");
});

await check("B3", "Same agent claims again -> 4xx", async () => {
  const r = await claim(fresh, "Agent One");
  expect(is4xx(r.status), `status ${r.status}, want 4xx`);
});

await check("B4", "Claim a closed room -> 4xx; stays closed", async () => {
  const closed = await db.createRoom({ name: `f2-closed-${stamp}`, status: "closed" });
  const r = await claim(closed, "Agent One");
  expect(is4xx(r.status), `status ${r.status}, want 4xx`);
  expect((await db.getRoom(closed)).status === "closed", "closed room changed status");
});

await check("B5", "Claim a room that does not exist -> 4xx", async () => {
  const r = await claim(`does-not-exist-${stamp}`, "Agent One");
  expect(is4xx(r.status), `status ${r.status}, want 4xx`);
});

await check("B6", "Blank agentName -> 4xx; room stays unclaimed", async () => {
  const room = await db.createRoom({ name: `f2-blank-${stamp}` });
  const r = await claim(room, "   ");
  expect(is4xx(r.status), `status ${r.status}, want 4xx`);
  expect((await db.getRoom(room)).status === "idle", "room was claimed with a blank agent name");
});

await check("B7", "Malformed JSON -> 4xx", async () => {
  const room = await db.createRoom({ name: `f2-badjson-${stamp}` });
  const r = await claim(room, null, "{not json");
  expect(is4xx(r.status), `status ${r.status}, want 4xx`);
});

// --- SLA ---
await check("B8", "Room waiting 6 min -> claim allowed (2xx) and breach recorded", async () => {
  const old = await db.createRoom({ name: `f2-old-${stamp}`, minutesAgo: 6 });
  const r = await claim(old, "Agent One");
  expect(ok(r.status), `status ${r.status} (${r.text.slice(0, 120)}) — breached rooms must still be claimable`);
  expect(breachState(await db.getRoom(old)) === "breached", "no breach recorded (looked for a field containing 'breach')");
});

await check("B9", "Room waiting 4 min -> claim allowed and NOT breached", async () => {
  const young = await db.createRoom({ name: `f2-young-${stamp}`, minutesAgo: 4 });
  const r = await claim(young, "Agent One");
  expect(ok(r.status), `status ${r.status}`);
  expect(breachState(await db.getRoom(young)) === "not-breached", "4-minute room was marked as breached");
});

// --- list API ---
await check("B10", "Claimed room is listed under ?status=assigned and not under ?status=idle", async () => {
  const assigned = await (await fetch(`${API}/api/rooms?status=assigned`)).json();
  const idle = await (await fetch(`${API}/api/rooms?status=idle`)).json();
  expect(assigned.some((x) => x.id === fresh), "not in the assigned list");
  expect(!idle.some((x) => x.id === fresh), "still in the idle list");
});

// --- race: the double-claim bug ---
await check("B11", "10 agents claim the same room at once (x5 rooms) -> exactly 1 winner each", async () => {
  const lines = [];
  let bad = 0, fiveXX = 0;
  for (let i = 1; i <= 5; i++) {
    const room = await db.createRoom({ name: `f2-race-${stamp}-${i}` });
    const agents = Array.from({ length: 10 }, (_, n) => `Racer ${i}-${n + 1}`);
    const res = await Promise.all(agents.map((a) => claim(room, a)));
    const winners = agents.filter((_, n) => ok(res[n].status));
    fiveXX += res.filter((x) => x.status >= 500).length;
    const doc = await db.getRoom(room);
    const ownerOk = winners.length === 1 && hasValue(doc, winners[0]);
    if (!ownerOk) bad++;
    lines.push(`room ${i}: ${winners.length} winner(s)${winners.length === 1 && !ownerOk ? " but stored owner differs" : ""}`);
  }
  const summary = lines.join("; ") + (fiveXX ? `; ${fiveXX} loser request(s) got 5xx instead of 4xx` : "");
  expect(bad === 0, summary);
  return summary;
});

// --- report ---
await db.close();
const passed = results.filter((r) => r.pass).length;
console.log(`\nF2 acceptance — ${API}\n`);
for (const r of results) {
  console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.id.padEnd(4)} ${r.name}${r.pass ? (r.detail ? `  (${r.detail})` : "") : `  -> ${r.detail}`}`);
}
console.log(`\nScore: ${passed} / ${results.length}`);
process.exit(passed === results.length ? 0 : 1);
