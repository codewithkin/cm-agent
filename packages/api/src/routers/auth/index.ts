import { router } from "../../index";
import { bootstrapOwner } from "./bootstrap-owner";
import { deviceUsers } from "./device-users";
import { registerDevice } from "./register-device";
import { unlock } from "./unlock";

export const authRouter = router({
  bootstrapOwner,
  registerDevice,
  deviceUsers,
  unlock,
});
