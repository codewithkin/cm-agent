import { router } from "../../index";
import { pull } from "./pull";
import { push } from "./push";

export const syncRouter = router({
  pull,
  push,
});
