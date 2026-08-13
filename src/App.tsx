import React, { useState, useEffect, useCallback } from "react";
import { PromptBuilder } from "./components/PromptBuilder";
import { LoginModal } from "./components/LoginModal";
import { DEFAULT_MODELS, UnifiedModel } from "./types";

interface AuthUser {
  id: number;
  name: string;
  email: string;
  type: string;
  profile_picture: string | null;
  phone: string | null;
  token?: string;
}

export default function App() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem("maxy_auth_user");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [showLoginModal, setShowLoginModal] = useState(false);

  const [models, setModels] = useState<UnifiedModel[]>(() => {
    const saved = localStorage.getItem("unified_models");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return DEFAULT_MODELS;
  });

  const [apiKeys, setApiKeys] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("studio_api_keys");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>("");

  const handleLogin = (user: AuthUser) => {
    setAuthUser(user);
    localStorage.setItem("maxy_auth_user", JSON.stringify(user));
  };

  const handleLogout = () => {
    setAuthUser(null);
    localStorage.removeItem("maxy_auth_user");
    setApiKeys([]);
    localStorage.removeItem("studio_api_keys");
    setSyncStatus("");
  };

  const syncFromServer = useCallback(async () => {
    setIsSyncing(true);
    const baseUrl = import.meta.env.VITE_BACKEND_URL || "";

    // Get current authUser from localStorage (freshest version)
    let currentUser: AuthUser | null = null;
    try {
      const saved = localStorage.getItem("maxy_auth_user");
      currentUser = saved ? JSON.parse(saved) : null;
    } catch {}

    const userId = currentUser ? (currentUser.id || currentUser.email || "global_default") : "global_default";

    // 1. Sync user-specific settings (models + API keys) from server
    if (userId !== "global_default") {
      try {
        const res = await fetch(
          `${baseUrl}/chat/api/user/settings?userId=${encodeURIComponent(String(userId))}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.settings) {
            const serverModels = data.settings.models;
            const serverApiKeys = data.settings.apiKeys;

            if (Array.isArray(serverModels) && serverModels.length > 0) {
              setModels(serverModels as UnifiedModel[]);
              localStorage.setItem("unified_models", JSON.stringify(serverModels));
            }

            if (Array.isArray(serverApiKeys) && serverApiKeys.length > 0) {
              setApiKeys(serverApiKeys);
              localStorage.setItem("studio_api_keys", JSON.stringify(serverApiKeys));
            }

            setSyncStatus(`Synced as ${currentUser?.name || currentUser?.email || userId}`);
            setIsSyncing(false);
            return;
          }
        }
      } catch (e) {
        console.warn("[Prompt Builder Sync] Server sync failed, falling back to public models", e);
      }
    }

    // 2. Fallback: sync public models only
    const endpoints = [
      `${baseUrl}/chat/api/models`,
      `${baseUrl}/chat/chat.json`,
      `${baseUrl}/chat.json`,
      `/chat/api/models`,
      `/chat.json`
    ];

    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const modelsList = Array.isArray(data) ? data : data.models;
          if (Array.isArray(modelsList) && modelsList.length > 0) {
            setModels(modelsList);
            localStorage.setItem("unified_models", JSON.stringify(modelsList));
            setSyncStatus("not_logged_in");
            break;
          }
        }
      } catch {}
    }

    setIsSyncing(false);
  }, []);

  // Re-sync when authUser changes
  useEffect(() => {
    syncFromServer();
  }, [authUser, syncFromServer]);

  useEffect(() => {
    const handleFocus = () => syncFromServer();
    window.addEventListener("focus", handleFocus);
    const interval = setInterval(syncFromServer, 30000);
    return () => {
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, [syncFromServer]);

  const isLoggedIn = !!authUser;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        user={authUser}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />
      <PromptBuilder
        models={models}
        apiKeys={apiKeys}
        onRefreshModels={syncFromServer}
        isSyncingModels={isSyncing}
        isLoggedIn={isLoggedIn}
        authUser={authUser}
        syncStatus={syncStatus}
        onLoginRequest={() => setShowLoginModal(true)}
      />
    </div>
  );
}
