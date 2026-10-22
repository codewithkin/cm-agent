import { router } from "../../index";
import { get } from "./get";
import { search } from "./search";

export const customersRouter = router({
  search,
  get,
});
