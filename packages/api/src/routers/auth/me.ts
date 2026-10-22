import { userProcedure } from "../../index";

/** Who is signed in, on which phone, and until when. */
export const me = userProcedure.query(({ ctx }) => {
  return {
    user: {
      id: ctx.user.id,
      name: ctx.user.name,
      role: ctx.user.role,
      mustChangePin: ctx.user.mustChangePin,
    },
    device: { id: ctx.device.id, label: ctx.device.label, kind: ctx.device.kind },
    expiresAt: ctx.session.expiresAt,
  };
});
