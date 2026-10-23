import { appRouter } from "@cm-agent/api/routers/index";
import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { seedLocal } from "@cm-agent/api/services/local-seed";
import { DEFAULT_OWNER, ensureOwner } from "@cm-agent/api/services/owner";

import { createContext } from "./context";
import { ENV } from "./env.server";
import { db } from "./services";

const app = new Hono();

app.use(logger());
app.use(
  "/*",
  cors({
    // The phones authenticate with bearer tokens, not cookies, so any origin is safe.
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["content-type", "authorization", "x-session-token"],
  }),
);

app.use(
  "/trpc/*",
  trpcServer({
    endpoint: "/trpc",
    router: appRouter,
    createContext: (_opts, context) => {
      return createContext({ context });
    },
  }),
);

app.get("/", (c) => {
  return c.text("OK");
});

// Coline's account always exists (starting password: OWNER_SETUP_CODE).
// Locally the demo week is added too; in production only via Settings → Demo data.
const startup =
  ENV.NODE_ENV === "development"
    ? db.$transaction((tx) => seedLocal(tx, ENV.OWNER_SETUP_CODE), { timeout: 120_000 })
    : ensureOwner(db, ENV.OWNER_SETUP_CODE).then(({ created }) => ({ createdOwner: created, demo: null }));
startup
  .then((result) => {
    if (result.createdOwner) console.log(`Owner account created for ${DEFAULT_OWNER.phone}`);
    if (result.demo) console.log(`Demo data added: ${result.demo.transactions} transactions`);
  })
  .catch((error: unknown) => console.error("Startup setup failed:", error));

export default app;
