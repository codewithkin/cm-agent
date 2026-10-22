import { router } from "../../index";
import { bootstrapOwner } from "./bootstrap-owner";
import { deviceUsers } from "./device-users";
import { registerDevice } from "./register-device";

export const authRouter = router({
  bootstrapOwner,
  registerDevice,
  deviceUsers,
});
