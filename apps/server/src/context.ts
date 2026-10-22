import type { Context as ApiContext } from "@cm-agent/api/context";
import type { Context as HonoContext } from "hono";

import { ENV } from "./env.server";
import { db } from "./services";

export type CreateContextOptions = {
  context: HonoContext;
};

function readBearerToken(header: string | undefined): string | null {
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

export async function createContext({ context }: CreateContextOptions): Promise<ApiContext> {
  return {
    db,
    deviceToken: readBearerToken(context.req.header("authorization")),
    sessionToken: context.req.header("x-session-token")?.trim() || null,
    ownerSetupCode: ENV.OWNER_SETUP_CODE,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
