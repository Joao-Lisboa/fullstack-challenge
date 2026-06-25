import { useAuth } from "react-oidc-context";

export function LoginPage() {
  const auth = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center shadow-2xl">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-neon)]/10 text-3xl">
          🎰
        </div>
        <h1 className="mb-2 text-3xl font-bold">Crash Game</h1>
        <p className="mb-8 text-[var(--color-muted)]">
          Entre com sua conta para apostar em tempo real
        </p>

        <button
          type="button"
          onClick={() => void auth.signinRedirect()}
          disabled={auth.isLoading}
          className="w-full rounded-xl bg-[var(--color-neon)] py-3.5 font-semibold text-black transition hover:bg-[var(--color-neon-dim)] disabled:opacity-50"
        >
          {auth.isLoading ? "Carregando…" : "Entrar com Keycloak"}
        </button>

        <p className="mt-6 text-xs text-[var(--color-muted)]">
          Usuário teste: <span className="font-mono text-white">player</span> /{" "}
          <span className="font-mono text-white">player123</span>
        </p>
      </div>
    </div>
  );
}
