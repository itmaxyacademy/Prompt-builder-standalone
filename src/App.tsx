import React, { useState, useEffect } from "react";
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

  useEffect(() => {
    const syncModels = async () => {
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
          const res = await fetch(endpoint);
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
    };

    syncModels();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <PromptBuilder models={models} />
    </div>
  );
}
