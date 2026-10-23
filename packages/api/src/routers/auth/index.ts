import { router } from "../../index";
import { bootstrapOwner } from "./bootstrap-owner";
import { changePassword } from "./change-password";
import { changePhone } from "./change-phone";
import { changePin } from "./change-pin";
import { deviceUsers } from "./device-users";
import { lock } from "./lock";
import { me } from "./me";
import { registerDevice } from "./register-device";
import { resetOwnerPin } from "./reset-owner-pin";
import { unlock } from "./unlock";

export const authRouter = router({
  bootstrapOwner,
  registerDevice,
  deviceUsers,
  unlock,
  lock,
  me,
  changePin,
  changePassword,
  changePhone,
  resetOwnerPin,
});
