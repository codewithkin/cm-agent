import { createPrismaClient } from "@cm-agent/db";

import { ENV } from "./env.server";

export const db = createPrismaClient(ENV);
