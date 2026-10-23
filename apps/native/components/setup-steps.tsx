import { Stepper } from "@/components/ui/stepper";

/** The three first-launch steps shown at the top of A2 and A3. */
export function SetupSteps({ current }: { current: 0 | 1 | 2 }) {
  return <Stepper steps={["Sign in", "Phone", "SMS"]} current={current} />;
}
