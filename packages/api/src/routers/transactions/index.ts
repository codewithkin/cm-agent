import { router } from "../../index";
import { create } from "./create";
import { list } from "./list";

export const transactionsRouter = router({
  create,
  list,
});
