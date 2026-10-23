import { seedLocal } from "@cm-agent/api/services/local-seed";
import { DEFAULT_OWNER, DEFAULT_OWNER_PIN } from "@cm-agent/api/services/owner";

import { ENV } from "./env.server";
import { db } from "./services";

/** `pnpm --filter server seed`: Coline's account + demo data. Refuses to run in production. */
if (ENV.NODE_ENV === "production") {
  console.error("seed is for local development. In production, use Settings → Demo data in the app.");
  process.exit(1);
}

const result = await db.$transaction((tx) => seedLocal(tx, ENV.OWNER_SETUP_CODE), { timeout: 120_000 });
if (result.createdOwner) {
  console.log(`Owner created: ${DEFAULT_OWNER.phone}, password = OWNER_SETUP_CODE, first PIN ${DEFAULT_OWNER_PIN}`);
}
console.log(result.demo ? `Demo data added: ${result.demo.transactions} transactions over ${result.demo.days} days` : "Demo data already there");
await db.$disconnect();
