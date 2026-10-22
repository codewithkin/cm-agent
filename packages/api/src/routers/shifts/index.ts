import { router } from "../../index";
import { balances } from "./balances";
import { close } from "./close";
import { current } from "./current";
import { open } from "./open";

export const shiftsRouter = router({
  current,
  open,
  balances,
  close,
});
