import { router } from "../../index";
import { day } from "./day";
import { exportLog } from "./export-log";
import { insights } from "./insights";
import { logbook } from "./logbook";
import { month } from "./month";
import { today } from "./today";

export const reportsRouter = router({
  today,
  day,
  month,
  insights,
  exportLog,
  logbook,
});
