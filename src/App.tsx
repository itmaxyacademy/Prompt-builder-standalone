import React, { useState } from "react";
import { PromptBuilder } from "./components/PromptBuilder";
import { DEFAULT_MODELS, UnifiedModel } from "./types";

export default function App() {
  const [models] = useState<UnifiedModel[]>(() => {
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

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <PromptBuilder models={models} />
    </div>
  );
}
