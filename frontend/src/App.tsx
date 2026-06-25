import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "react-oidc-context";
import { ToastContainer } from "./components/ToastContainer";
import { ToastProvider } from "./hooks/useToast";
import { oidcConfig } from "./lib/oidc-config";
import { CallbackPage } from "./pages/CallbackPage";
import { GamePage } from "./pages/GamePage";
import { LoginPage } from "./pages/LoginPage";

function HomeRedirect() {
  const auth = useAuth();
  if (auth.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--color-neon)] border-t-transparent" />
      </div>
    );
  }
  return <Navigate to={auth.isAuthenticated ? "/game" : "/login"} replace />;
}

export function App() {
  return (
    <AuthProvider {...oidcConfig}>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/callback" element={<CallbackPage />} />
            <Route path="/game" element={<GamePage />} />
          </Routes>
          <ToastContainer />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
