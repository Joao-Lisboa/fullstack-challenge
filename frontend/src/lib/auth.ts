import type { User } from "oidc-client-ts";

const EXPIRY_BUFFER_MS = 30_000;

export function isAccessTokenValid(user: User | null | undefined): boolean {
  if (!user?.access_token) return false;
  if (!user.expires_at) return true;
  return user.expires_at * 1000 > Date.now() + EXPIRY_BUFFER_MS;
}
