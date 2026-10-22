import { router } from "../../index";
import { create } from "./create";
import { edit } from "./edit";
import { flag } from "./flag";
import { get } from "./get";
import { list } from "./list";
import { voidTransaction } from "./void";

export const transactionsRouter = router({
  create,
  list,
  get,
  flag,
  edit,
  void: voidTransaction,
});
