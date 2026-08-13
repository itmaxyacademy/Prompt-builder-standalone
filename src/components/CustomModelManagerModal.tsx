import React, { useState } from "react";
import { X, Plus, Trash2, Edit2, Check, Cpu, AlertCircle, Sparkles, Server, Play, RefreshCw, Key, Code } from "lucide-react";
import { UnifiedModel, ApiKey, KeyValuePair } from "../types";
import { resolveJsonRawBody } from "../utils/placeholderResolver";

interface CustomModelManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  models: UnifiedModel[];
  apiKeys: ApiKey[];
  onSaveModels: (models: UnifiedModel[]) => void;
}

const PRESET_TEMPLATES: Omit<UnifiedModel, "apiKey">[] = [
  {
    id: "lm-studio-local",
    name: "LM Studio (Local)",
    description: "Connect to local LM Studio server (http://localhost:1234/v1)",
    baseUrl: "http://localhost:1234/v1",
    endpointPath: "/chat/completions",
    headers: [{ key: "Content-Type", value: "application/json" }],
    customBody: [],
    bodyType: "json-raw",
    jsonRawBody: JSON.stringify({
      model: "local-model",
      messages: "{{messages}}",
      temperature: 0.7
    }, null, 2),
    systemPrompt: "You are a helpful assistant.",
    responseTextPath: "choices.0.message.content",
    streamEnabled: false,
    streamTextPath: "choices.0.delta.content"
  },
  {
    id: "ollama-local",
    name: "Ollama (Local)",
    description: "Connect to local Ollama server (http://localhost:11434/v1)",
    baseUrl: "http://localhost:11434/v1",
    endpointPath: "/chat/completions",
    headers: [{ key: "Content-Type", value: "application/json" }],
    customBody: [],
    bodyType: "json-raw",
    jsonRawBody: JSON.stringify({
      model: "llama3",
      messages: "{{messages}}",
      temperature: 0.7
    }, null, 2),
    systemPrompt: "You are a helpful assistant.",
    responseTextPath: "choices.0.message.content",
    streamEnabled: false,
    streamTextPath: "choices.0.delta.content"
  },
  {
    id: "gpt-4o-mini-preset",
    name: "OpenAI GPT-4o Mini",
    description: "Standard OpenAI GPT-4o Mini endpoint",
    baseUrl: "https://api.openai.com/v1",
    endpointPath: "/chat/completions",
    headers: [
      { key: "Authorization", value: "Bearer {{apiKey}}" },
      { key: "Content-Type", value: "application/json" }
    ],
    customBody: [],
    bodyType: "json-raw",
    jsonRawBody: JSON.stringify({
      model: "gpt-4o-mini",
      messages: "{{messages}}",
      temperature: 0.7
    }, null, 2),
    systemPrompt: "You are a helpful OpenAI-powered assistant.",
    responseTextPath: "choices.0.message.content",
    streamEnabled: false,
    streamTextPath: "choices.0.delta.content"
  },
  {
    id: "gemini-2.5-flash-preset",
    name: "Gemini 2.5 Flash",
    description: "Google Gemini 2.5 Flash API endpoint",
    baseUrl: "https://generativetoolkit.googleapis.com/v1beta",
    endpointPath: "/models/gemini-2.5-flash:generateContent?key={{apiKey}}",
    headers: [{ key: "Content-Type", value: "application/json" }],
    customBody: [],
    bodyType: "json-raw",
    jsonRawBody: JSON.stringify({
      contents: "{{messages_gemini}}",
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
    }, null, 2),
    systemPrompt: "You are a helpful Gemini AI assistant.",
    responseTextPath: "candidates.0.content.parts.0.text",
    streamEnabled: false,
    streamTextPath: "candidates.0.content.parts.0.text"
  },
  {
    id: "deepseek-v3-preset",
    name: "DeepSeek V3",
    description: "DeepSeek official API endpoint",
    baseUrl: "https://api.deepseek.com/v1",
    endpointPath: "/chat/completions",
    headers: [
      { key: "Authorization", value: "Bearer {{apiKey}}" },
      { key: "Content-Type", value: "application/json" }
    ],
    customBody: [],
    bodyType: "json-raw",
    jsonRawBody: JSON.stringify({
      model: "deepseek-chat",
      messages: "{{messages}}",
      temperature: 0.7
    }, null, 2),
    systemPrompt: "You are DeepSeek AI assistant.",
    responseTextPath: "choices.0.message.content",
    streamEnabled: false,
    streamTextPath: "choices.0.delta.content"
  }
];

const BACKEND_ENDPOINT = `${import.meta.env.VITE_BACKEND_URL || ""}/chat/api/chat`;

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
    headers: [{ key: "Content-Type", value: "application/json" }],
    customBody: [],
    bodyType: "json-raw",
    jsonRawBody: JSON.stringify({
      model: "local-model",
      messages: "{{messages}}",
      temperature: 0.7
    }, null, 2),
    systemPrompt: "You are a helpful assistant.",
    responseTextPath: "choices.0.message.content"
  });

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Connection Test state
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; response?: any } | null>(null);

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
      headers: [{ key: "Content-Type", value: "application/json" }],
      customBody: [],
      bodyType: "json-raw",
      jsonRawBody: JSON.stringify({
        model: "local-model",
        messages: "{{messages}}",
        temperature: 0.7
      }, null, 2),
      systemPrompt: "You are a helpful assistant.",
      responseTextPath: "choices.0.message.content",
      streamEnabled: false,
      streamTextPath: "choices.0.delta.content"
    });
    setError(null);
    setTestResult(null);
  };

  const handleApplyPreset = (preset: typeof PRESET_TEMPLATES[0]) => {
    setIsNew(true);
    setEditingId(`custom-${Date.now()}`);
    setFormData({
      ...preset,
      id: `${preset.id}-${Date.now().toString().slice(-4)}`,
      apiKeyId: ""
    });
    setError(null);
    setTestResult(null);
  };

  const handleStartEdit = (m: UnifiedModel) => {
    setIsNew(false);
    setEditingId(m.id);
    setFormData({ ...m });
    setError(null);
    setTestResult(null);
  };

  const handleCancelForm = () => {
    setEditingId(null);
    setIsNew(false);
    setError(null);
    setTestResult(null);
  };

  // Header management
  const handleAddHeader = () => {
    const current = formData.headers || [];
    setFormData({ ...formData, headers: [...current, { key: "", value: "" }] });
  };

  const handleRemoveHeader = (index: number) => {
    const current = formData.headers || [];
    setFormData({ ...formData, headers: current.filter((_, i) => i !== index) });
  };

  const handleUpdateHeader = (index: number, field: "key" | "value", val: string) => {
    const current = [...(formData.headers || [])];
    current[index] = { ...current[index], [field]: val };
    setFormData({ ...formData, headers: current });
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
    setTestResult(null);
  };

  const handleDeleteModel = (id: string) => {
    const updated = modelList.filter(m => m.id !== id);
    setModelList(updated);
    if (editingId === id) handleCancelForm();
  };

  // Test Connection Handler
  const handleTestConnection = async () => {
    if (!formData.baseUrl) return;
    setTesting(true);
    setTestResult(null);

    const activeKeyObj = apiKeys.find(k => k.id === formData.apiKeyId);
    const activeKey = activeKeyObj?.key || "";

    const sampleInstructions = "Say 'Connection Successful!' in 3 words.";
    const isNativeGeminiFallback = !formData.endpointPath && (formData.id || "").includes("gemini");

    let bodyParams: any = {};
    if (formData.bodyType === "json-raw") {
      bodyParams = resolveJsonRawBody(formData.jsonRawBody || "", {
        modelId: formData.id || "custom-model",
        systemPrompt: formData.systemPrompt || "",
        messages: [{ role: "user", content: sampleInstructions }],
        apiKey: activeKey,
        deepThinking: false,
        temperature: 0.7,
        maxTokens: 2048,
        size: "Medium"
      });
    } else {
      formData.customBody?.forEach((kv) => {
        if (!kv.key) return;
        bodyParams[kv.key] = kv.value;
      });
    }

    const resolvedHeaders: Record<string, string> = {};
    formData.headers?.forEach((h) => {
      if (h.key) resolvedHeaders[h.key] = h.value.replace(/\{\{apiKey\}\}/g, activeKey);
    });

    const targetUrl = formData.baseUrl + (formData.endpointPath?.replace("{{apiKey}}", activeKey) || "");

    try {
      const res = await fetch(BACKEND_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: targetUrl,
          method: "POST",
          headers: resolvedHeaders,
          body: bodyParams,
          stream: false,
          responseTextPath: formData.responseTextPath || "choices.0.message.content",
          provider: isNativeGeminiFallback ? "gemini" : undefined,
          apiKey: activeKey,
          model: formData.id,
          messages: [{ role: "user", content: sampleInstructions }]
        })
      });

      const data = await res.json();
      if (res.ok && data.text) {
        setTestResult({
          success: true,
          message: `Connected! Response: "${data.text.trim()}"`,
          response: data
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || data.message || `Failed with status ${res.status}`,
          response: data
        });
      }
    } catch (e: any) {
      setTestResult({
        success: false,
        message: e.message || "Connection test failed."
      });
    } finally {
      setTesting(false);
    }
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
      <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50/50 via-purple-50/30 to-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Cpu size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Custom Models & Endpoint Workspace</h2>
              <p className="text-xs text-gray-500">Configure LM Studio, Ollama, or OpenAI/Gemini/DeepSeek custom endpoints</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Quick Presets Bar */}
          {!editingId && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={13} className="text-indigo-600" /> Quick Add 1-Click Presets
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {PRESET_TEMPLATES.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleApplyPreset(p)}
                    className="p-2.5 bg-indigo-50/60 hover:bg-indigo-100/80 border border-indigo-200/70 rounded-xl text-left transition-all hover:shadow-xs group cursor-pointer"
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <Server size={13} className="text-indigo-600 shrink-0" />
                      <span className="text-xs font-bold text-indigo-950 truncate group-hover:text-indigo-700">{p.name}</span>
                    </div>
                    <p className="text-[10px] text-indigo-700/80 truncate">{p.baseUrl}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Form Editor when editing/adding */}
          {editingId ? (
            <div className="bg-gray-50/80 p-5 rounded-2xl border border-indigo-200 space-y-5">
              <div className="flex items-center justify-between border-b border-gray-200/80 pb-3">
                <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                  <Code size={16} className="text-indigo-600" />
                  {isNew ? "✨ Create Custom Model Endpoint" : `✏️ Edit Endpoint: ${formData.name}`}
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

              {/* Basic Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Display Name</label>
                  <input
                    type="text"
                    value={formData.name || ""}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. LM Studio Qwen 2.5"
                    className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Model ID</label>
                  <input
                    type="text"
                    value={formData.id || ""}
                    onChange={e => setFormData({ ...formData, id: e.target.value })}
                    placeholder="e.g. qwen2.5-7b-instruct"
                    className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Base URL</label>
                  <input
                    type="text"
                    value={formData.baseUrl || ""}
                    onChange={e => setFormData({ ...formData, baseUrl: e.target.value })}
                    placeholder="http://localhost:1234/v1 or https://api.openai.com/v1"
                    className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Endpoint Path</label>
                  <input
                    type="text"
                    value={formData.endpointPath || ""}
                    onChange={e => setFormData({ ...formData, endpointPath: e.target.value })}
                    placeholder="/chat/completions"
                    className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">API Key (Optional for Local)</label>
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
              </div>

              {/* Dynamic Headers Editor */}
              <div className="space-y-2 border-t border-gray-200/80 pt-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Request Headers</label>
                  <button
                    onClick={handleAddHeader}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={13} /> Add Header
                  </button>
                </div>
                {formData.headers && formData.headers.length > 0 ? (
                  <div className="space-y-2">
                    {formData.headers.map((h, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={h.key}
                          onChange={e => handleUpdateHeader(i, "key", e.target.value)}
                          placeholder="Header Key (e.g. Content-Type)"
                          className="flex-1 bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-mono"
                        />
                        <input
                          type="text"
                          value={h.value}
                          onChange={e => handleUpdateHeader(i, "value", e.target.value)}
                          placeholder="Header Value (e.g. application/json)"
                          className="flex-1 bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-mono"
                        />
                        <button onClick={() => handleRemoveHeader(i)} className="p-1.5 text-red-400 hover:text-red-600">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No custom headers added.</p>
                )}
              </div>

              {/* Raw JSON Body Editor & Response Extractors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-gray-200/80 pt-3">
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">JSON Body Payload Template</label>
                  <textarea
                    rows={5}
                    value={formData.jsonRawBody || ""}
                    onChange={e => setFormData({ ...formData, jsonRawBody: e.target.value })}
                    className="w-full bg-white border border-gray-300 rounded-xl p-3 text-xs font-mono leading-relaxed focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                    placeholder='{"model": "custom-model", "messages": "{{messages}}", "temperature": 0.7}'
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Response Text Path</label>
                  <input
                    type="text"
                    value={formData.responseTextPath || ""}
                    onChange={e => setFormData({ ...formData, responseTextPath: e.target.value })}
                    placeholder="choices.0.message.content (or candidates.0.content.parts.0.text)"
                    className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              {/* Test Connection Button & Result */}
              <div className="border-t border-gray-200/80 pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleTestConnection}
                    disabled={testing}
                    className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Play size={13} className={testing ? "animate-spin" : ""} />
                    {testing ? "Testing Connection..." : "Run Live Connection Test"}
                  </button>
                </div>

                {testResult && (
                  <div className={`p-3 rounded-xl text-xs font-mono border ${testResult.success ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-800 border-red-200"}`}>
                    <p className="font-bold">{testResult.success ? "✅ Connection Test Passed" : "❌ Connection Test Failed"}</p>
                    <p className="mt-1">{testResult.message}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                <button onClick={handleCancelForm} className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900">
                  Cancel
                </button>
                <button onClick={handleSaveForm} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-indigo-700 transition-colors cursor-pointer">
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
                  <div key={m.id} className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between gap-3 hover:border-indigo-200 transition-colors">
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
