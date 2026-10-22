import { router } from "../../index";
import { create } from "./create";
import { list } from "./list";
import { voidMovement } from "./void";

export const movementsRouter = router({
  create,
  list,
  void: voidMovement,
});
