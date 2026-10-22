import { router } from "../../index";
import { ingest } from "./ingest";
import { list } from "./list";
import { unrecorded } from "./unrecorded";

export const smsRouter = router({
  ingest,
  unrecorded,
  list,
});
