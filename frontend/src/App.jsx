import { useState } from "react";
import "./App.css";

import MainLayout from "./component/MainLayout.jsx";
import Workspace from "./component/Workspace.jsx";
import AuthModal from "./component/AuthModal.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";

function AppContent() {
  const { isLoggedIn } = useAuth();
  const [page, setPage] = useState("landing");
  const [showAuth, setShowAuth] = useState(false);

  const openWorkspace = () => {
    if (isLoggedIn) {
      setPage("workspace");
    } else {
      setShowAuth(true);
    }
  };

  const closeAuth = () => {
    setShowAuth(false);
    const token = localStorage.getItem("ic_token");
    if (token) {
      setPage("workspace");
    }
  };

  return (
    <>
      {page === "landing" ? (
        <>
          <MainLayout />
          <button
            onClick={openWorkspace}
            style={{
              position: "fixed",
              right: "2rem",
              bottom: "2rem",
              zIndex: 900,
              padding: "0.9rem 1.5rem",
              borderRadius: "999px",
              border: "1px solid rgba(255,255,255,0.25)",
              background: "#ffffff",
              color: "#000",
              fontFamily: "Syne, system-ui, sans-serif",
              fontSize: "0.75rem",
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              cursor: "pointer",
              boxShadow: "0 20px 50px rgba(0,0,0,0.45)",
            }}
          >
            Open Dashboard
          </button>
        </>
      ) : (
          <Workspace
              onShowAuth={() => setShowAuth(true)}
              onGoHome={() => setPage("landing")}
          />
      )}

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
