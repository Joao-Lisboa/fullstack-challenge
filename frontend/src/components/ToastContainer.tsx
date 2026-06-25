import { useToast } from "../hooks/useToast";

export function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          className={`rounded-lg border px-4 py-3 text-sm shadow-lg backdrop-blur-sm ${
            toast.type === "success"
              ? "border-[var(--color-neon)]/40 bg-emerald-950/90 text-[var(--color-neon)]"
              : toast.type === "error"
                ? "border-[var(--color-danger)]/40 bg-red-950/90 text-[var(--color-danger)]"
                : "border-[var(--color-border)] bg-[var(--color-surface)]/95 text-white"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="text-[var(--color-muted)] hover:text-white"
              aria-label="Fechar"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
