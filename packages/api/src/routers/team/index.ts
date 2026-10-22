import { router } from "../../index";
import { addHelper } from "./add-helper";
import { list } from "./list";
import { resetPin } from "./reset-pin";

export const teamRouter = router({
  list,
  addHelper,
  resetPin,
});
