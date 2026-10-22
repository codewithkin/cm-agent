import { router } from "../../index";
import { markChecked } from "./mark-checked";
import { queue } from "./queue";

export const reviewRouter = router({
  queue,
  markChecked,
});
