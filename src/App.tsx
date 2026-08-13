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

  const [apiKeys] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("studio_api_keys");
      return saved ? JSON.parse(saved) : [];
    } catch (err) {
      console.error("Failed to parse local API keys", err);
      return [];
    }
  });

  const [isSyncing, setIsSyncing] = useState(false);

  const syncModels = useCallback(async () => {
    setIsSyncing(true);
    const baseUrl = import.meta.env.VITE_BACKEND_URL || "";
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
            console.log(`[Model Sync] Successfully synchronized ${modelsList.length} models from ${endpoint}`);
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
    syncModels();

    // Re-sync models whenever window gains focus (user returns to Prompt Builder tab)
    const handleFocus = () => syncModels();
    window.addEventListener("focus", handleFocus);

    // Periodic sync every 15 seconds
    const interval = setInterval(syncModels, 15000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, [syncModels]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <PromptBuilder 
        models={models} 
        apiKeys={apiKeys} 
        onRefreshModels={syncModels}
        isSyncingModels={isSyncing}
      />
    </div>
  );
}
