import { router } from "../../index";
import { get } from "./get";
import { update } from "./update";

export const settingsRouter = router({
  get,
  update,
});
