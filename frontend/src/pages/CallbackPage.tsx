import { Navigate } from "react-router-dom";
import { useAuth } from "react-oidc-context";

export function CallbackPage() {
  const auth = useAuth();

  if (auth.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--color-neon)] border-t-transparent" />
      </div>
    );
  }

  if (auth.error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="rounded-xl border border-[var(--color-danger)]/40 bg-red-950/40 p-6 text-center">
          <p className="text-[var(--color-danger)]">{auth.error.message}</p>
        </div>
      </div>
    );
  }

  return <Navigate to="/game" replace />;
}
