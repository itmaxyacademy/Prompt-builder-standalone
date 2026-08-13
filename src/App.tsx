import React, { useState, useEffect, useCallback } from "react";
import { PromptBuilder } from "./components/PromptBuilder";
import { LoginModal } from "./components/LoginModal";
import { ApiKeyManagerModal } from "./components/ApiKeyManagerModal";
import { CustomModelManagerModal } from "./components/CustomModelManagerModal";
import { DEFAULT_MODELS, UnifiedModel, ApiKey } from "./types";

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
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showModelModal, setShowModelModal] = useState(false);

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

  // Save API keys to localStorage and sync to server
  const handleSaveApiKeys = async (keys: ApiKey[]) => {
    setApiKeys(keys);
    localStorage.setItem("studio_api_keys", JSON.stringify(keys));

    // Sync to server
    const baseUrl = import.meta.env.VITE_BACKEND_URL || "";
    const userId = authUser ? (authUser.id || authUser.email || "global_default") : "global_default";
    try {
      await fetch(`${baseUrl}/chat/api/user/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: String(userId),
          models,
          apiKeys: keys
        })
      });
      console.log(`[Prompt Builder] Synced ${keys.length} API keys to server for user ${userId}`);
    } catch (e) {
      console.warn("[Prompt Builder] Failed to sync API keys to server", e);
    }
  };

  // Save Custom Models to localStorage and sync to server
  const handleSaveModels = async (updatedModels: UnifiedModel[]) => {
    setModels(updatedModels);
    localStorage.setItem("unified_models", JSON.stringify(updatedModels));

    // Sync to server
    const baseUrl = import.meta.env.VITE_BACKEND_URL || "";
    const userId = authUser ? (authUser.id || authUser.email || "global_default") : "global_default";
    try {
      await fetch(`${baseUrl}/chat/api/user/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: String(userId),
          models: updatedModels,
          apiKeys
        })
      });
      console.log(`[Prompt Builder] Synced ${updatedModels.length} models to server for user ${userId}`);
    } catch (e) {
      console.warn("[Prompt Builder] Failed to sync models to server", e);
    }
  };

  const syncFromServer = useCallback(async () => {
    setIsSyncing(true);
    const baseUrl = import.meta.env.VITE_BACKEND_URL || "";

    let currentUser: AuthUser | null = null;
    try {
      const saved = localStorage.getItem("maxy_auth_user");
      currentUser = saved ? JSON.parse(saved) : null;
    } catch {}

    const userId = currentUser ? (currentUser.id || currentUser.email || "global_default") : "global_default";

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
      <ApiKeyManagerModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        apiKeys={apiKeys}
        onSave={async (keys) => { await handleSaveApiKeys(keys); setShowApiKeyModal(false); }}
      />
      <CustomModelManagerModal
        isOpen={showModelModal}
        onClose={() => setShowModelModal(false)}
        models={models}
        apiKeys={apiKeys}
        onSaveModels={async (updatedModels) => { await handleSaveModels(updatedModels); setShowModelModal(false); }}
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
        onManageApiKeys={() => setShowApiKeyModal(true)}
        onManageModels={() => setShowModelModal(true)}
      />
    </div>
  );
}
