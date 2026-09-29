// Create a room directly in Firestore with a chosen age — for F2 UI checks and for live demos
// (e.g. a customer who has "already waited 6 minutes", so the SLA badge shows immediately).
// Usage: node seed-room.mjs --key <path/to/serviceAccountKey.json> [--minutes 6] [--name "Old customer"]
//                           [--status idle|bot|assigned|closed] [--platform whatsapp|livechat]
import { parseArgs } from "./lib/args.mjs";
import { openDb } from "./lib/db.mjs";

const a = parseArgs();
const db = await openDb(a.key);
const minutes = Number(a.minutes ?? 6);
const id = await db.createRoom({
  name: a.name ?? `Seeded customer (${minutes} min)`,
  platform: a.platform ?? "whatsapp",
  status: a.status ?? "idle",
  minutesAgo: minutes,
});
console.log(`Created room ${id}: "${a.name ?? `Seeded customer (${minutes} min)`}", status ${a.status ?? "idle"}, created ${minutes} min ago`);
await db.close();
