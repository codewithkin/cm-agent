import { router } from "../../index";
import { create } from "./create";
import { list } from "./list";

export const movementsRouter = router({
  create,
  list,
});
