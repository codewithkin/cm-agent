import { LOCAL_OWNER, seedLocal } from "@cm-agent/api/services/local-seed";

import { ENV } from "./env.server";
import { db } from "./services";

/** `pnpm --filter server seed`: local owner + demo data. Refuses to run in production. */
if (ENV.NODE_ENV === "production") {
  console.error("seed is for local development. In production, use Settings → Demo data in the app.");
  process.exit(1);
}

const result = await db.$transaction((tx) => seedLocal(tx), { timeout: 120_000 });
if (result.createdOwner) {
  console.log(`Owner created: ${LOCAL_OWNER.phone} / ${LOCAL_OWNER.password} / PIN ${LOCAL_OWNER.pin}`);
}
console.log(result.demo ? `Demo data added: ${result.demo.transactions} transactions over ${result.demo.days} days` : "Demo data already there");
await db.$disconnect();
