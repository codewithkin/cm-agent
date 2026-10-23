import { observable } from "./observable";

export type Role = "OWNER" | "HELPER";

export type Session = {
  user: { id: string; name: string; role: Role; mustChangePin: boolean };
  /** Null when the phone was unlocked offline; filled in once it reconnects. */
  sessionToken: string | null;
  /** Kept in memory only, so the app can get a server session after an offline unlock. */
  pin: string;
  unlockedAt: Date;
};

/** Who is using the phone right now. Never saved to disk: every app start begins locked. */
export const sessionStore = observable<Session | null>(null);

export function startSession(session: Omit<Session, "unlockedAt">) {
  sessionStore.set({ ...session, unlockedAt: new Date() });
}

export function setSessionToken(sessionToken: string) {
  sessionStore.set((current) => (current ? { ...current, sessionToken } : current));
}

export function endSession() {
  sessionStore.set(null);
}

export const isOwner = (session: Session | null) => session?.user.role === "OWNER";
