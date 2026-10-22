import { userProcedure } from "../../index";
import { getSettings } from "../../services/settings";

/** Business settings. Helpers need them too, for tolerances and low-balance warnings. */
export const get = userProcedure.query(({ ctx }) => getSettings(ctx.db));
