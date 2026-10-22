import { router } from "../../index";
import { bootstrapOwner } from "./bootstrap-owner";
import { registerDevice } from "./register-device";

export const authRouter = router({
  bootstrapOwner,
  registerDevice,
});
