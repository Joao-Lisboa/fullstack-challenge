import { useCallback } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { BetControls } from "../components/BetControls";
import { CrashChart } from "../components/CrashChart";
import { PlayerBar } from "../components/PlayerBar";
import { RoundBets } from "../components/RoundBets";
import { RoundHistory } from "../components/RoundHistory";
import { useGameState } from "../hooks/useGameState";
import { isAccessTokenValid } from "../lib/auth";
import { mergeRoundBets } from "../lib/game-state";
import { getUsername } from "../lib/oidc-config";

export function GamePage() {
  const auth = useAuth();

  const getAccessToken = useCallback(() => {
    if (!isAccessTokenValid(auth.user)) return null;
    return auth.user?.access_token ?? null;
  }, [auth.user]);

  const handleUnauthorized = useCallback(() => {
    void auth.removeUser().finally(() => {
      void auth.signinRedirect();
    });
  }, [auth]);

  if (auth.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--color-neon)] border-t-transparent" />
      </div>
    );
  }

  if (!auth.isAuthenticated || !isAccessTokenValid(auth.user) || !auth.user?.access_token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AuthenticatedGame
      accessToken={auth.user.access_token}
      getAccessToken={getAccessToken}
      userId={typeof auth.user.profile.sub === "string" ? auth.user.profile.sub : ""}
      username={getUsername(auth.user.profile as Record<string, unknown>)}
      onLogout={() => void auth.signoutRedirect()}
      onUnauthorized={handleUnauthorized}
    />
  );
}

function AuthenticatedGame({
  accessToken,
  getAccessToken,
  userId,
  username,
  onLogout,
  onUnauthorized,
}: {
  accessToken: string;
  getAccessToken: () => string | null;
  userId: string;
  username: string;
  onLogout: () => void;
  onUnauthorized: () => void;
}) {
  const {
    round,
    history,
    wallet,
    myBet,
    loading,
    betting,
    cashingOut,
    crashed,
    socketConnected,
    placeBet,
    cashout,
  } = useGameState({ accessToken, getAccessToken, userId, onUnauthorized });

  const displayBets = mergeRoundBets(round, myBet);

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-6 md:px-6">
      <PlayerBar
        username={username}
        balanceCents={wallet?.balanceCents ?? null}
        loading={loading}
        onLogout={onLogout}
      />

      {!loading && (
        <p className="mt-2 text-right text-xs text-[var(--color-muted)]">
          Sync: {socketConnected ? "tempo real + polling" : "polling"}
        </p>
      )}

      <main className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {loading ? (
            <div className="aspect-[16/9] animate-pulse rounded-2xl bg-[var(--color-surface)]" />
          ) : (
            <CrashChart round={round} crashed={crashed} />
          )}
          <RoundHistory rounds={history} />
        </div>

        <aside className="space-y-6">
          <BetControls
            round={round}
            myBet={myBet}
            betting={betting}
            cashingOut={cashingOut}
            onPlaceBet={placeBet}
            onCashout={cashout}
          />
          <RoundBets bets={displayBets} currentUserId={userId} />
        </aside>
      </main>
    </div>
  );
}
