// F1 Internal Room Notes — black-box API acceptance test.
// Usage:  node acceptance/f1-notes-acceptance.mjs [API_URL]     (default http://localhost:8080)
// Needs Node 18+. No dependencies. The backend of the run under test must be running.
// Creates its own fresh room every time, so leftover Firestore data from earlier runs does not matter.

const API = (process.argv[2] ?? "http://localhost:8080").replace(/\/$/, "");
const results = [];
const created = [];
let currentRoom = null;

async function call(method, path, body, raw = false) {
  const init = { method, headers: { "Content-Type": "application/json" } };
  if (body !== undefined) init.body = raw ? body : JSON.stringify(body);
  const res = await fetch(API + path, init);
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not JSON */ }
  if (method === "POST" && path.endsWith("/notes") && res.status >= 200 && res.status < 300 && json?.id && path.includes(encodeURIComponent(currentRoom ?? "\u0000"))) created.push(json.id);
  return { status: res.status, json, text };
}

async function check(id, name, fn) {
  try {
    const detail = await fn();
    results.push({ id, name, pass: true, detail: detail ?? "" });
  } catch (e) {
    results.push({ id, name, pass: false, detail: e.message });
  }
}

function expect(cond, msg) { if (!cond) throw new Error(msg); }
const isJsonError = (r) => r.json && typeof r.json.error === "string";
const notesPath = (id) => `/api/rooms/${encodeURIComponent(id)}/notes`;

// --- setup: fresh room ---
const health = await call("GET", "/api/health").catch(() => null);
if (!health || health.status !== 200) {
  console.error(`Backend not reachable at ${API}/api/health. Start the run's backend first.`);
  process.exit(2);
}
const roomRes = await call("POST", "/api/rooms", { customerName: `acceptance-${Date.now()}`, platform: "livechat" });
if (![200, 201].includes(roomRes.status) || !roomRes.json?.id) {
  console.error("Could not create a test room via POST /api/rooms:", roomRes.status, roomRes.text);
  process.exit(2);
}
const room = roomRes.json.id;
currentRoom = room;
const missing = `does-not-exist-${Date.now()}`;

// --- POST ---
await check("A1", "POST valid note -> 201 + note JSON", async () => {
  const r = await call("POST", notesPath(room), { content: "  first note  " });
  expect(r.status === 201, `status ${r.status}, want 201 (${r.text.slice(0, 120)})`);
  const n = r.json;
  expect(n && typeof n.id === "string" && n.id, "missing id");
  expect(n.content === "first note", `content ${JSON.stringify(n.content)}, want trimmed "first note"`);
  expect(n.isImportant === false, `isImportant ${n.isImportant}, want false default`);
  expect(n.createdAt && !Number.isNaN(Date.parse(n.createdAt)), `createdAt not a timestamp: ${n.createdAt}`);
});

await check("A2", "POST isImportant=true is stored", async () => {
  await new Promise((r) => setTimeout(r, 1100)); // distinct createdAt for ordering
  const r = await call("POST", notesPath(room), { content: "important note", isImportant: true });
  expect(r.status === 201, `status ${r.status}`);
  expect(r.json?.isImportant === true, `isImportant ${r.json?.isImportant}`);
});

await check("A3", "POST exactly 500 characters -> 201", async () => {
  await new Promise((r) => setTimeout(r, 1100));
  const r = await call("POST", notesPath(room), { content: "a".repeat(500) });
  expect(r.status === 201, `status ${r.status}`);
});

await check("A4", "POST 501 characters -> 400 JSON error", async () => {
  const r = await call("POST", notesPath(room), { content: "a".repeat(501) });
  expect(r.status === 400, `status ${r.status}`);
  expect(isJsonError(r), `body not {"error": ...}: ${r.text.slice(0, 120)}`);
});

await check("A5", "POST 500 emoji (Unicode chars, not bytes) -> 201", async () => {
  await new Promise((r) => setTimeout(r, 1100));
  const r = await call("POST", notesPath(room), { content: "😀".repeat(500) });
  expect(r.status === 201, `status ${r.status} (likely counts bytes/UTF-16 units instead of characters)`);
});

await check("A6", "POST empty content -> 400", async () => {
  const r = await call("POST", notesPath(room), { content: "" });
  expect(r.status === 400 && isJsonError(r), `status ${r.status}`);
});

await check("A7", "POST whitespace-only content -> 400", async () => {
  const r = await call("POST", notesPath(room), { content: "    " });
  expect(r.status === 400 && isJsonError(r), `status ${r.status}`);
});

await check("A8", "POST missing content -> 400", async () => {
  const r = await call("POST", notesPath(room), { isImportant: true });
  expect(r.status === 400 && isJsonError(r), `status ${r.status}`);
});

await check("A9", "POST isImportant not boolean -> 400", async () => {
  const r = await call("POST", notesPath(room), { content: "x", isImportant: "yes" });
  expect(r.status === 400 && isJsonError(r), `status ${r.status}`);
});

await check("A10", "POST malformed JSON -> 400", async () => {
  const r = await call("POST", notesPath(room), "{not json", true);
  expect(r.status === 400 && isJsonError(r), `status ${r.status}`);
});

await check("A11", "POST to missing room -> 404 JSON error", async () => {
  const r = await call("POST", notesPath(missing), { content: "x" });
  // JSON body required so Go's default "404 page not found" (route missing) does not count as a pass.
  expect(r.status === 404 && isJsonError(r), `status ${r.status}, body ${r.text.slice(0, 80)}`);
});

// --- GET ---
await check("A12", "GET returns all notes, newest first", async () => {
  const r = await call("GET", notesPath(room));
  expect(r.status === 200, `status ${r.status}`);
  expect(Array.isArray(r.json), "body is not an array");
  const ids = r.json.map((n) => n.id);
  const want = [...created].reverse();
  expect(ids.length === want.length, `got ${ids.length} notes, want ${want.length} (invalid posts must not be stored)`);
  expect(JSON.stringify(ids) === JSON.stringify(want), "order is not newest first");
});

await check("A13", "GET room with no notes -> 200 []", async () => {
  const other = await call("POST", "/api/rooms", { customerName: `acceptance-empty-${Date.now()}`, platform: "whatsapp" });
  const r = await call("GET", notesPath(other.json.id));
  expect(r.status === 200 && Array.isArray(r.json) && r.json.length === 0, `status ${r.status}, body ${r.text.slice(0, 80)}`);
});

await check("A14", "GET missing room -> 404 JSON error", async () => {
  const r = await call("GET", notesPath(missing));
  expect(r.status === 404 && isJsonError(r), `status ${r.status}, body ${r.text.slice(0, 80)}`);
});

// --- report ---
const passed = results.filter((r) => r.pass).length;
console.log(`\nF1 acceptance — ${API} — room ${room}\n`);
for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.id.padEnd(4)} ${r.name}${r.pass ? "" : `  -> ${r.detail}`}`);
console.log(`\nScore: ${passed} / ${results.length}`);
process.exit(passed === results.length ? 0 : 1);
