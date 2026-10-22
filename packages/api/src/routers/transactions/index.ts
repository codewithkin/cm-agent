import { router } from "../../index";
import { create } from "./create";
import { flag } from "./flag";
import { get } from "./get";
import { list } from "./list";

export const transactionsRouter = router({
  create,
  list,
  get,
  flag,
});
