import { router } from "../../index";
import { ingest } from "./ingest";
import { unrecorded } from "./unrecorded";

export const smsRouter = router({
  ingest,
  unrecorded,
});
