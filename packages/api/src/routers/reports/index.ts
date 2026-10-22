import { router } from "../../index";
import { day } from "./day";
import { exportCsv } from "./export-csv";
import { logbook } from "./logbook";
import { month } from "./month";

export const reportsRouter = router({
  day,
  month,
  exportCsv,
  logbook,
});
