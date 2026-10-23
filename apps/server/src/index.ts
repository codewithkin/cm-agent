import { appRouter } from "@cm-agent/api/routers/index";
import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { seedLocal } from "@cm-agent/api/services/local-seed";

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

// Locally there's always an owner and demo data; in production, only via the app's button.
if (ENV.NODE_ENV === "development") {
  db.$transaction((tx) => seedLocal(tx), { timeout: 120_000 })
    .then((result) => {
      if (result.createdOwner) console.log("Local owner created: 0771234567 / localdev123 / PIN 1234");
      if (result.demo) console.log(`Demo data added: ${result.demo.transactions} transactions`);
    })
    .catch((error: unknown) => console.error("Local seed failed:", error));
}

export default app;
