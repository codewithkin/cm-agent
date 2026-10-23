/** Owner phone and password carried from A2 sign-in to A2 choose phone. Memory only, cleared after use. */
export const setupDraft = { phone: "", password: "" };

export function clearSetupDraft() {
  setupDraft.phone = "";
  setupDraft.password = "";
}
