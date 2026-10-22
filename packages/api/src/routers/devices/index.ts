import { router } from "../../index";
import { heartbeat } from "./heartbeat";
import { list } from "./list";
import { revoke } from "./revoke";

export const devicesRouter = router({
  list,
  revoke,
  heartbeat,
});
