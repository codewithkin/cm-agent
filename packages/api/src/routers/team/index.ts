import { router } from "../../index";
import { addHelper } from "./add-helper";
import { list } from "./list";

export const teamRouter = router({
  list,
  addHelper,
});
