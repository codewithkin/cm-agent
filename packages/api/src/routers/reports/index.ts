import { router } from "../../index";
import { day } from "./day";
import { month } from "./month";

export const reportsRouter = router({
  day,
  month,
});
