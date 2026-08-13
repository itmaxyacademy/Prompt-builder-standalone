import React, { useState } from "react";
import { X, Plus, Trash2, Edit2, Check, Cpu, AlertCircle, Sparkles, Server } from "lucide-react";
import { UnifiedModel, ApiKey } from "../types";

interface CustomModelManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  models: UnifiedModel[];
  apiKeys: ApiKey[];
  onSaveModels: (models: UnifiedModel[]) => void;
}

const PRESET_TEMPLATES = [
  {
    name: "LM Studio (Local)",
    id: "lm-studio-local",
    description: "Connect to local LM Studio server (http://localhost:1234)",
    baseUrl: "http://localhost:1234/v1",
    endpointPath: "/chat/completions",
    responseTextPath: "choices.0.message.content",
    jsonRawBody: JSON.stringify({
      model: "local-model",
      messages: "{{messages}}",
      temperature: 0.7
    }, null, 2),
    headers: [
      { key: "Content-Type", value: "application/json" }
    ]
  },
  {
    name: "Ollama (Local)",
    id: "ollama-local",
    description: "Connect to local Ollama server (http://localhost:11434)",
    baseUrl: "http://localhost:11434/v1",
    endpointPath: "/chat/completions",
    responseTextPath: "choices.0.message.content",
    jsonRawBody: JSON.stringify({
      model: "llama3",
      messages: "{{messages}}",
      temperature: 0.7
    }, null, 2),
    headers: [
      { key: "Content-Type", value: "application/json" }
    ]
  },
  {
    name: "OpenAI Compatible / Custom Endpoint",
    id: "custom-openai-api",
    description: "Generic OpenAI-compatible API endpoint",
    baseUrl: "https://api.openai.com/v1",
    endpointPath: "/chat/completions",
    responseTextPath: "choices.0.message.content",
    jsonRawBody: JSON.stringify({
      model: "gpt-4o-mini",
      messages: "{{messages}}",
      temperature: 0.7
    }, null, 2),
    headers: [
      { key: "Content-Type", value: "application/json" },
      { key: "Authorization", value: "Bearer {{apiKey}}" }
    ]
  }
];

export function CustomModelManagerModal({ isOpen, onClose, models, apiKeys, onSaveModels }: CustomModelManagerModalProps) {
  const [modelList, setModelList] = useState<UnifiedModel[]>(models);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<UnifiedModel>>({
    id: "",
    name: "",
    description: "",
    baseUrl: "http://localhost:1234/v1",
    endpointPath: "/chat/completions",
    apiKeyId: "",
    responseTextPath: "choices.0.message.content",
    jsonRawBody: JSON.stringify({
      model: "custom-model",
      messages: "{{messages}}",
      temperature: 0.7
    }, null, 2)
  });

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleStartAdd = () => {
    setIsNew(true);
    setEditingId(`custom-${Date.now()}`);
    setFormData({
      id: `custom-model-${Date.now()}`,
      name: "New Local / Custom Model",
      description: "Custom local LM Studio / OpenAI compatible model",
      baseUrl: "http://localhost:1234/v1",
      endpointPath: "/chat/completions",
      apiKeyId: "",
      responseTextPath: "choices.0.message.content",
      jsonRawBody: JSON.stringify({
        model: "local-model",
        messages: "{{messages}}",
        temperature: 0.7
      }, null, 2),
      headers: [
        { key: "Content-Type", value: "application/json" }
      ],
      customBody: [],
      bodyType: "json-raw",
      systemPrompt: "You are a helpful assistant.",
      streamEnabled: false,
      streamTextPath: "choices.0.delta.content"
    });
    setError(null);
  };

  const handleApplyPreset = (preset: typeof PRESET_TEMPLATES[0]) => {
    setIsNew(true);
    setEditingId(`custom-${Date.now()}`);
    setFormData({
      id: `${preset.id}-${Date.now().toString().slice(-4)}`,
      name: preset.name,
      description: preset.description,
      baseUrl: preset.baseUrl,
      endpointPath: preset.endpointPath,
      apiKeyId: "",
      responseTextPath: preset.responseTextPath,
      jsonRawBody: preset.jsonRawBody,
      headers: preset.headers,
      customBody: [],
      bodyType: "json-raw",
      systemPrompt: "You are a helpful assistant.",
      streamEnabled: false,
      streamTextPath: "choices.0.delta.content"
    });
    setError(null);
  };

  const handleStartEdit = (m: UnifiedModel) => {
    setIsNew(false);
    setEditingId(m.id);
    setFormData({ ...m });
    setError(null);
  };

  const handleCancelForm = () => {
    setEditingId(null);
    setIsNew(false);
    setError(null);
  };

  const handleSaveForm = () => {
    if (!formData.name?.trim()) {
      setError("Nama Model tidak boleh kosong.");
      return;
    }
    if (!formData.baseUrl?.trim()) {
      setError("Base URL tidak boleh kosong.");
      return;
    }

    const updatedModel: UnifiedModel = {
      id: formData.id || `custom-${Date.now()}`,
      name: formData.name.trim(),
      description: formData.description?.trim() || "Custom model connection",
      baseUrl: formData.baseUrl.trim(),
      apiKey: "",
      apiKeyId: formData.apiKeyId || "",
      endpointPath: formData.endpointPath?.trim() || "",
      headers: formData.headers || [{ key: "Content-Type", value: "application/json" }],
      customBody: formData.customBody || [],
      jsonRawBody: formData.jsonRawBody || JSON.stringify({ model: formData.id, messages: "{{messages}}" }, null, 2),
      bodyType: formData.bodyType || "json-raw",
      systemPrompt: formData.systemPrompt || "You are a helpful assistant.",
      responseTextPath: formData.responseTextPath?.trim() || "choices.0.message.content",
      streamEnabled: formData.streamEnabled || false,
      streamTextPath: formData.streamTextPath || "choices.0.delta.content",
      _isCustom: true
    };

    let newModelsList: UnifiedModel[];
    if (isNew) {
      newModelsList = [...modelList, updatedModel];
    } else {
      newModelsList = modelList.map(m => (m.id === editingId ? updatedModel : m));
    }

    setModelList(newModelsList);
    setEditingId(null);
    setIsNew(false);
    setError(null);
  };

  const handleDeleteModel = (id: string) => {
    const updated = modelList.filter(m => m.id !== id);
    setModelList(updated);
    if (editingId === id) handleCancelForm();
  };

  const handleSaveAndSync = async () => {
    setSaving(true);
    setSaved(false);
    await onSaveModels(modelList);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Cpu size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Manage Models & Custom Local Endpoints</h2>
              <p className="text-xs text-gray-500">Configure LM Studio, Ollama, or custom OpenAI-compatible models</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Quick Presets */}
          {!editingId && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={13} className="text-indigo-600" /> Quick Add Local Presets
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {PRESET_TEMPLATES.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleApplyPreset(p)}
                    className="p-3 bg-indigo-50/60 hover:bg-indigo-100/80 border border-indigo-200/70 rounded-xl text-left transition-all hover:shadow-xs group cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Server size={14} className="text-indigo-600" />
                      <span className="text-xs font-bold text-indigo-950 group-hover:text-indigo-700">{p.name}</span>
                    </div>
                    <p className="text-[11px] text-indigo-700/80 line-clamp-2">{p.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Form Editor when editing/adding */}
          {editingId ? (
            <div className="bg-gray-50 p-5 rounded-2xl border border-indigo-200 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-200/80 pb-3">
                <h3 className="text-sm font-bold text-indigo-900">
                  {isNew ? "✨ Add New Model / Endpoint" : "✏️ Edit Model"}
                </h3>
                <button onClick={handleCancelForm} className="text-xs text-gray-500 hover:text-gray-800 font-medium">
                  Cancel
                </button>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 text-red-600 px-3 py-2 rounded-lg text-xs border border-red-100">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Display Name</label>
                  <input
                    type="text"
                    value={formData.name || ""}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. LM Studio Qwen 2.5"
                    className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Model ID</label>
                  <input
                    type="text"
                    value={formData.id || ""}
                    onChange={e => setFormData({ ...formData, id: e.target.value })}
                    placeholder="e.g. qwen2.5-7b-instruct"
                    className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-semibold text-gray-700">Base URL (Local / Remote Endpoint)</label>
                  <input
                    type="text"
                    value={formData.baseUrl || ""}
                    onChange={e => setFormData({ ...formData, baseUrl: e.target.value })}
                    placeholder="http://localhost:1234/v1 or https://api.openai.com/v1"
                    className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Endpoint Path</label>
                  <input
                    type="text"
                    value={formData.endpointPath || ""}
                    onChange={e => setFormData({ ...formData, endpointPath: e.target.value })}
                    placeholder="/chat/completions"
                    className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">API Key (Optional for Local)</label>
                  <select
                    value={formData.apiKeyId || ""}
                    onChange={e => setFormData({ ...formData, apiKeyId: e.target.value })}
                    className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  >
                    <option value="">None (Localhost / LM Studio)</option>
                    {apiKeys.map(k => (
                      <option key={k.id} value={k.id}>{k.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-semibold text-gray-700">Response Text JSON Path</label>
                  <input
                    type="text"
                    value={formData.responseTextPath || ""}
                    onChange={e => setFormData({ ...formData, responseTextPath: e.target.value })}
                    placeholder="choices.0.message.content (or candidates.0.content.parts.0.text)"
                    className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={handleCancelForm} className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900">
                  Cancel
                </button>
                <button onClick={handleSaveForm} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-indigo-700 transition-colors">
                  {isNew ? "Add Model" : "Update Model"}
                </button>
              </div>
            </div>
          ) : (
            /* List of existing models */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Configured Models ({modelList.length})</p>
                <button
                  onClick={handleStartAdd}
                  className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                >
                  <Plus size={14} /> Add Custom Model
                </button>
              </div>

              <div className="space-y-2">
                {modelList.map((m) => (
                  <div key={m.id} className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-900 truncate">{m.name}</span>
                        {m._isCustom && (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-700 rounded-full">
                            CUSTOM / LOCAL
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 font-mono truncate mt-0.5">
                        {m.baseUrl}{m.endpointPath || ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => handleStartEdit(m)} className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors" title="Edit Model">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDeleteModel(m.id)} className="p-1.5 text-red-400 hover:text-red-600 transition-colors" title="Delete Model">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium">
            Close
          </button>
          <button
            onClick={handleSaveAndSync}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-bold shadow-md hover:opacity-90 transition-all disabled:opacity-70 cursor-pointer"
          >
            {saved ? <Check size={15} /> : null}
            {saving ? "Saving & Syncing..." : saved ? "Synced to Server!" : "Save & Sync Models"}
          </button>
        </div>
      </div>
    </div>
  );
}
