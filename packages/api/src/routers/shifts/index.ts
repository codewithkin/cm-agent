import { router } from "../../index";
import { current } from "./current";
import { open } from "./open";

export const shiftsRouter = router({
  current,
  open,
});
