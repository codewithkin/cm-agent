import { publicProcedure, router } from "../index";
import { authRouter } from "./auth";
import { teamRouter } from "./team";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  auth: authRouter,
  team: teamRouter,
});
export type AppRouter = typeof appRouter;
