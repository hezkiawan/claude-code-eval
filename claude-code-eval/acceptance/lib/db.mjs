// Direct Firestore access for the checkers (create rooms with a chosen age/status, read room docs).
// Uses the same serviceAccountKey.json as the Go backend, so both talk to the same Firestore project.
// CHECKER_DB_MOCK=<url> swaps in an HTTP fake (used only to test the checker itself).
import fs from "node:fs";

const toPlain = (v) =>
  v && typeof v.toDate === "function" ? v.toDate()
  : Array.isArray(v) ? v.map(toPlain)
  : v && typeof v === "object" && !(v instanceof Date) ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toPlain(x)]))
  : v;

export async function openDb(keyPath) {
  if (process.env.CHECKER_DB_MOCK) return mockDb(process.env.CHECKER_DB_MOCK);
  if (!keyPath || !fs.existsSync(keyPath)) {
    throw new Error(`--key must point to the backend's serviceAccountKey.json (got: ${keyPath ?? "nothing"})`);
  }
  const { initializeApp, cert } = await import("firebase-admin/app");
  const { getFirestore, Timestamp } = await import("firebase-admin/firestore");
  const app = initializeApp({ credential: cert(JSON.parse(fs.readFileSync(keyPath, "utf8"))) });
  const db = getFirestore(app);
  return {
    async createRoom({ name, platform = "livechat", status = "idle", minutesAgo = 0 }) {
      const ref = await db.collection("rooms").add({
        name, platform, status, createdAt: Timestamp.fromDate(new Date(Date.now() - minutesAgo * 60_000)),
      });
      return ref.id;
    },
    async getRoom(id) {
      const snap = await db.collection("rooms").doc(id).get();
      return snap.exists ? toPlain(snap.data()) : null;
    },
    async close() { const { deleteApp } = await import("firebase-admin/app"); await deleteApp(app); },
  };
}

function mockDb(url) {
  const revive = (o) => o && Object.fromEntries(Object.entries(o).map(([k, v]) =>
    [k, typeof v === "string" && /^\d{4}-\d\d-\d\dT/.test(v) ? new Date(v) : v]));
  return {
    async createRoom(r) { return (await (await fetch(url + "/__seed", { method: "POST", body: JSON.stringify(r) })).json()).id; },
    async getRoom(id) { return revive(await (await fetch(url + "/__get?id=" + id)).json()); },
    async close() {},
  };
}
