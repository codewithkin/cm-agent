import { router } from "../../index";
import { ignore } from "./ignore";
import { ingest } from "./ingest";
import { list } from "./list";
import { unrecorded } from "./unrecorded";

export const smsRouter = router({
  ingest,
  unrecorded,
  list,
  ignore,
});
