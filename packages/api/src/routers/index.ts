import { publicProcedure, router } from "../index";
import { authRouter } from "./auth";
import { customersRouter } from "./customers";
import { devicesRouter } from "./devices";
import { settingsRouter } from "./settings";
import { shiftsRouter } from "./shifts";
import { teamRouter } from "./team";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  auth: authRouter,
  team: teamRouter,
  devices: devicesRouter,
  settings: settingsRouter,
  shifts: shiftsRouter,
  customers: customersRouter,
});
export type AppRouter = typeof appRouter;
