import { publicProcedure, router } from "../index";
import { authRouter } from "./auth";
import { devicesRouter } from "./devices";
import { teamRouter } from "./team";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  auth: authRouter,
  team: teamRouter,
  devices: devicesRouter,
});
export type AppRouter = typeof appRouter;
