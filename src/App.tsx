import React, { useState, useEffect, useCallback } from "react";
import { PromptBuilder } from "./components/PromptBuilder";
import { DEFAULT_MODELS, UnifiedModel } from "./types";

export default function App() {
  const [models, setModels] = useState<UnifiedModel[]>(() => {
    const saved = localStorage.getItem("unified_models");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (err) {
        console.error("Failed to parse local models", err);
      }
    }
    return DEFAULT_MODELS;
  });

  const [apiKeys, setApiKeys] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("studio_api_keys");
      return saved ? JSON.parse(saved) : [];
    } catch (err) {
      console.error("Failed to parse local API keys", err);
      return [];
    }
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>("");

  // Get logged-in user from MaxyChat localStorage (shared same domain)
  const getAuthUser = () => {
    try {
      const saved = localStorage.getItem("maxy_auth_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };

  // Sync models AND API keys from MaxyChat server using same user identity
  const syncFromServer = useCallback(async () => {
    setIsSyncing(true);
    const baseUrl = import.meta.env.VITE_BACKEND_URL || "";
    const authUser = getAuthUser();
    const userId = authUser ? (authUser.id || authUser.email || "global_default") : "global_default";

    // 1. Try to sync user-specific settings (models + API keys) from server
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
              console.log(`[Prompt Builder Sync] Loaded ${serverModels.length} models for user ${userId}`);
            }

            if (Array.isArray(serverApiKeys) && serverApiKeys.length > 0) {
              setApiKeys(serverApiKeys);
              localStorage.setItem("studio_api_keys", JSON.stringify(serverApiKeys));
              console.log(`[Prompt Builder Sync] Loaded ${serverApiKeys.length} API keys for user ${userId}`);
            }

            setSyncStatus(`Synced as ${authUser?.name || authUser?.email || userId}`);
            setIsSyncing(false);
            return;
          }
        }
      } catch (e) {
        console.warn("[Prompt Builder Sync] Server sync failed, falling back to public models", e);
      }
    }

    // 2. Fallback: sync public models list only (user not logged in)
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
            setSyncStatus("Synced public models (not logged in)");
            console.log(`[Model Sync] Loaded ${modelsList.length} public models from ${endpoint}`);
            break;
          }
        }
      } catch (e) {
        // Fallback to next endpoint
      }
    }

    setIsSyncing(false);
  }, []);

  useEffect(() => {
    syncFromServer();

    // Re-sync when user returns to Prompt Builder tab
    const handleFocus = () => syncFromServer();
    window.addEventListener("focus", handleFocus);

    // Periodic sync every 30 seconds
    const interval = setInterval(syncFromServer, 30000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, [syncFromServer]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {syncStatus && (
        <div className="text-xs text-center py-1 bg-green-50 text-green-700 border-b border-green-100">
          ☁️ {syncStatus}
        </div>
      )}
      <PromptBuilder 
        models={models} 
        apiKeys={apiKeys} 
        onRefreshModels={syncFromServer}
        isSyncingModels={isSyncing}
      />
    </div>
  );
}
