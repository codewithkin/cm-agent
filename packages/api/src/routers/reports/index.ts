import { router } from "../../index";
import { day } from "./day";
import { exportCsv } from "./export-csv";
import { logbook } from "./logbook";
import { month } from "./month";
import { today } from "./today";

export const reportsRouter = router({
  today,
  day,
  month,
  exportCsv,
  logbook,
});
