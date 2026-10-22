import { router } from "../../index";
import { addHelper } from "./add-helper";
import { list } from "./list";
import { rename } from "./rename";
import { resetPin } from "./reset-pin";
import { setActive } from "./set-active";

export const teamRouter = router({
  list,
  addHelper,
  resetPin,
  setActive,
  rename,
});
