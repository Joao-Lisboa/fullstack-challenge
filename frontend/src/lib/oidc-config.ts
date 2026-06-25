import { WebStorageStateStore } from "oidc-client-ts";
import type { AuthProviderProps } from "react-oidc-context";

const issuer = import.meta.env.VITE_KEYCLOAK_ISSUER ?? "http://localhost:8080/realms/crash-game";

export const oidcConfig: AuthProviderProps = {
  authority: issuer,
  client_id: "crash-game-client",
  redirect_uri: `${window.location.origin}/callback`,
  post_logout_redirect_uri: window.location.origin,
  response_type: "code",
  scope: "openid profile email",
  automaticSilentRenew: true,
  accessTokenExpiringNotificationTimeInSeconds: 60,
  userStore: new WebStorageStateStore({ store: window.localStorage }),
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname);
  },
};

export function getUsername(profile: Record<string, unknown> | undefined): string {
  if (!profile) return "Jogador";
  const preferred = profile.preferred_username;
  if (typeof preferred === "string") return preferred;
  const name = profile.name;
  if (typeof name === "string") return name;
  return "Jogador";
}
