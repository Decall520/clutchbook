import { useState } from "react";
import { AppShell } from "./components/AppShell";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AppDataProvider } from "./context/DataContext";
import { AuthPage } from "./pages/AuthPage";
import { FriendsPage } from "./pages/FriendsPage";
import { HomePage } from "./pages/HomePage";
import { ProfilePage } from "./pages/ProfilePage";
import { RecorderPage } from "./pages/RecorderPage";
import { StudioPage } from "./pages/StudioPage";
import type { PageKey } from "./types";

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <span className="brand-mark brand-mark-large"><span /></span>
      <strong>集火</strong>
      <p>正在读取你的集锦空间…</p>
      <span className="loading-line" />
    </div>
  );
}

function Workspace() {
  const [page, setPage] = useState<PageKey>("feed");
  return (
    <AppShell page={page} onNavigate={setPage}>
      {page === "feed" && <HomePage />}
      {page === "studio" && <StudioPage />}
      {page === "recorder" && <RecorderPage />}
      {page === "friends" && <FriendsPage />}
      {page === "profile" && <ProfilePage />}
    </AppShell>
  );
}

function AuthenticatedApp() {
  return (
    <AppDataProvider>
      <Workspace />
    </AppDataProvider>
  );
}

function SessionGate() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <AuthPage />;
  return <AuthenticatedApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <SessionGate />
    </AuthProvider>
  );
}
