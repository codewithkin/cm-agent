import { router } from "../../index";
import { list } from "./list";
import { revoke } from "./revoke";

export const devicesRouter = router({
  list,
  revoke,
});
