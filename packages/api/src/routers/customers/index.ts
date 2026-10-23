import { router } from "../../index";
import { byPhone } from "./by-phone";
import { get } from "./get";
import { search } from "./search";

export const customersRouter = router({
  search,
  byPhone,
  get,
});
