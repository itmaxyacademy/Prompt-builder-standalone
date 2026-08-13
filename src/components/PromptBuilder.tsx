import React, { useState } from "react";
import { Wand2, Activity, Plus, BarChart2, Copy, Check, Sparkles, Layers, Cpu, ArrowRight, RefreshCw } from "lucide-react";
import { UnifiedModel, ApiLog } from "../types";
import { resolveJsonRawBody } from "../utils/placeholderResolver";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { InstallPWAButton } from "./InstallPWAButton";

interface PromptBuilderProps {
  onClose?: () => void;
  models: UnifiedModel[];
  apiKeys?: any[];
  setApiLogs?: React.Dispatch<React.SetStateAction<ApiLog[]>>;
  onRefreshModels?: () => void;
  isSyncingModels?: boolean;
}

const BACKEND_ENDPOINT = `${import.meta.env.VITE_BACKEND_URL || ""}/chat/api/chat`;

export function PromptBuilder({ onClose, models, apiKeys = [], setApiLogs, onRefreshModels, isSyncingModels }: PromptBuilderProps) {
  const [naivePrompt, setNaivePrompt] = useState("");
  const [framework, setFramework] = useState("RTF");
  const [modelId, setModelId] = useState(models[0]?.id || "");
  
  const [loading, setLoading] = useState(false);
  const [improvedPrompt, setImprovedPrompt] = useState("");
  const [results, setResults] = useState<{ naive: any; improved: any } | null>(null);
  const [copied, setCopied] = useState(false);

  const [frameworks, setFrameworks] = useState([
    { id: "RTF", name: "Role-Task-Format", description: "Define a Role, assign a Task, and specify the exact output Format." },
    { id: "RCTF", name: "Role-Context-Task-Format", description: "Add rich Context to the RTF framework for highly targeted outputs." },
    { id: "CHAIN", name: "Chain of Thought", description: "Force the model to reason step-by-step before producing the final answer." }
  ]);
  const [showAddFramework, setShowAddFramework] = useState(false);
  const [newFramework, setNewFramework] = useState({ name: "", description: "" });

  const templates = [
    { title: "Product Description", prompt: "Write a description for a new ergonomic vacuum cleaner." },
    { title: "Email Campaign", prompt: "Write a high-converting launch email for our summer product sale." },
    { title: "Code Helper", prompt: "Write a python script to parse a large CSV file asynchronously." }
  ];

  const handleCopyPrompt = () => {
    if (!improvedPrompt) return;
    navigator.clipboard.writeText(improvedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddFramework = () => {
    if (!newFramework.name.trim() || !newFramework.description.trim()) return;
    const id = newFramework.name.toUpperCase().replace(/\s+/g, '_');
    setFrameworks([...frameworks, { id, name: newFramework.name, description: newFramework.description }]);
    setFramework(id);
    setNewFramework({ name: "", description: "" });
    setShowAddFramework(false);
  };

  const handleBuildPrompt = async () => {
    if (!naivePrompt.trim()) return;
    setLoading(true);

    const fw = frameworks.find(f => f.id === framework);
    const instructions = `You are an expert prompt engineer. Take the following naive prompt and rewrite it using the ${fw?.name} framework (${fw?.description}). Respond ONLY with the rewritten prompt, nothing else. \n\nNaive Prompt: ${naivePrompt}`;

    const model = models.find(m => m.id === modelId) || models[0];
    if (!model) {
      setLoading(false);
      return;
    }

    const logId = Math.random().toString(36).substring(2, 9);
    const isNativeGeminiFallback = !model.endpointPath && model.id.includes("gemini");
    const activeKey = model.apiKeyId ? apiKeys.find((k) => k.id === model.apiKeyId)?.key || model.apiKey : model.apiKey;

    const initialLog: ApiLog = {
      id: logId,
      timestamp: new Date().toISOString(),
      endpoint: isNativeGeminiFallback ? "NATIVE_FALLBACK (uses server env API key)" : model.baseUrl + (model.endpointPath?.replace("{{apiKey}}", activeKey || "") || ""),
      method: "POST",
      headers: {},
      body: {},
      response: null,
      status: "Pending",
      success: false,
      modelId: model.id,
    };

    if (setApiLogs) setApiLogs(prev => [initialLog, ...prev]);

    const startTime = Date.now();
    try {
      const bodyParams: any = {};
      if (model.bodyType === "json-raw") {
        Object.assign(bodyParams, resolveJsonRawBody(model.jsonRawBody || "", {
          modelId: model.id,
          systemPrompt: "",
          messages: [{ role: "user", content: instructions }],
          apiKey: activeKey,
          deepThinking: false,
          temperature: 0.7,
          maxTokens: 2048,
          size: "Medium"
        }));
      } else {
        model.customBody?.forEach((kv) => {
          const val = kv.value;
          if (val === "true") bodyParams[kv.key] = true;
          else if (val === "false") bodyParams[kv.key] = false;
          else if (val === "null") bodyParams[kv.key] = null;
          else if (!isNaN(Number(val)) && val.trim() !== "") bodyParams[kv.key] = Number(val);
          else bodyParams[kv.key] = val;
        });
      }

      const resolvedHeaders: Record<string, string> = {};
      model.headers?.forEach((h) => {
        resolvedHeaders[h.key] = h.value.replace(/\{\{apiKey\}\}/g, activeKey || "");
      });

      if (setApiLogs) setApiLogs(prev => prev.map(l => l.id === logId ? { ...l, body: bodyParams, headers: resolvedHeaders } : l));

      const response = await fetch(BACKEND_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: model.baseUrl + (model.endpointPath?.replace("{{apiKey}}", activeKey || "") || ""),
          method: "POST",
          headers: resolvedHeaders,
          body: bodyParams,
          stream: false,
          responseTextPath: model.responseTextPath,
          provider: isNativeGeminiFallback ? "gemini" : undefined,
          apiKey: activeKey,
          model: model.id,
          messages: [{ role: "user", content: instructions }]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const endTime = Date.now();
        const latency = data.createdTimestamp ? Math.max(0, endTime - data.createdTimestamp * (data.createdTimestamp < 1e12 ? 1000 : 1)) : endTime - startTime;

        setImprovedPrompt(data.text?.trim() || "");

        if (setApiLogs) {
          setApiLogs(prev => prev.map(l => l.id === logId ? {
            ...l,
            status: response.status,
            success: true,
            response: data,
            rawResponse: data.rawResponse || data,
            latencyMs: latency
          } : l));
        }
      } else {
        const errJson = await response.json().catch(() => ({ error: "Request failed" }));
        throw new Error(errJson.error || "Request failed");
      }
    } catch (e: any) {
      console.error(e);
      if (setApiLogs) {
        setApiLogs(prev => prev.map(l => {
          if (l.id === logId) {
            return {
              ...l,
              status: "Error",
              success: false,
              response: { error: e.message || "An unexpected error occurred." }
            };
          }
          return l;
        }));
      }
    }
    setLoading(false);
  };

  const handleTestPrompts = async () => {
    if (!naivePrompt || !improvedPrompt) return;
    setLoading(true);
    
    const model = models.find(m => m.id === modelId) || models[0];
    if (!model) { setLoading(false); return; }
    
    const activeKey = model.apiKeyId ? apiKeys.find((k) => k.id === model.apiKeyId)?.key || model.apiKey : model.apiKey;
    const isNativeGeminiFallback = !model.endpointPath && model.id.includes("gemini");

    const runTest = async (promptText: string) => {
      const logId = Math.random().toString(36).substring(2, 9);
      const initialLog: ApiLog = {
        id: logId,
        timestamp: new Date().toISOString(),
        endpoint: isNativeGeminiFallback ? "NATIVE_FALLBACK (uses server env API key)" : model.baseUrl + (model.endpointPath?.replace("{{apiKey}}", activeKey || "") || ""),
        method: "POST",
        headers: {},
        body: {},
        response: null,
        status: "Pending",
        success: false,
        modelId: model.id,
      };

      if (setApiLogs) setApiLogs(prev => [initialLog, ...prev]);

      const startTime = Date.now();
      try {
        const bodyParams: any = {};
        if (model.bodyType === "json-raw") {
          Object.assign(bodyParams, resolveJsonRawBody(model.jsonRawBody || "", {
            modelId: model.id,
            systemPrompt: model.systemPrompt || "",
            messages: [{ role: "user", content: promptText }],
            apiKey: activeKey,
            deepThinking: false,
            temperature: 0.7,
            maxTokens: 2048,
            size: "Medium"
          }));
        } else {
          model.customBody?.forEach((kv) => {
            const val = kv.value;
            if (val === "true") bodyParams[kv.key] = true;
            else if (val === "false") bodyParams[kv.key] = false;
            else if (val === "null") bodyParams[kv.key] = null;
            else if (!isNaN(Number(val)) && val.trim() !== "") bodyParams[kv.key] = Number(val);
            else bodyParams[kv.key] = val;
          });
        }

        const resolvedHeaders: Record<string, string> = {};
        model.headers?.forEach((h) => {
          resolvedHeaders[h.key] = h.value.replace(/\{\{apiKey\}\}/g, activeKey || "");
        });

        if (setApiLogs) setApiLogs(prev => prev.map(l => l.id === logId ? { ...l, body: bodyParams, headers: resolvedHeaders } : l));

        const response = await fetch(BACKEND_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: model.baseUrl + (model.endpointPath?.replace("{{apiKey}}", activeKey || "") || ""),
            method: "POST",
            headers: resolvedHeaders,
            body: bodyParams,
            stream: false,
            responseTextPath: model.responseTextPath,
            tokenUsageInputPath: model.tokenUsageInputPath,
            tokenUsageOutputPath: model.tokenUsageOutputPath,
            createdTimestampPath: model.createdTimestampPath,
            provider: isNativeGeminiFallback ? "gemini" : undefined,
            apiKey: activeKey,
            model: model.id,
            messages: [{ role: "user", content: promptText }]
          })
        });
        
        const endTime = Date.now();
        if (!response.ok) {
          const errJson = await response.json().catch(() => ({ error: "Request failed" }));
          throw new Error(errJson.error || "Request failed");
        }
        
        const data = await response.json();
        const latency = data.createdTimestamp ? Math.max(0, endTime - data.createdTimestamp * (data.createdTimestamp < 1e12 ? 1000 : 1)) : endTime - startTime;
        
        if (setApiLogs) {
          setApiLogs(prev => prev.map(l => l.id === logId ? {
            ...l,
            status: response.status,
            success: true,
            response: data,
            rawResponse: data.rawResponse || data,
            latencyMs: latency
          } : l));
        }

        return { text: data.text, latency, tokens: data.tokenUsage };
      } catch (err: any) {
        if (setApiLogs) {
          setApiLogs(prev => prev.map(l => {
            if (l.id === logId) {
              return {
                ...l,
                status: "Error",
                success: false,
                response: { error: err.message || "An unexpected error occurred." }
              };
            }
            return l;
          }));
        }
        return { text: "Error", latency: 0, tokens: null };
      }
    };

    try {
      const [naiveRes, improvedRes] = await Promise.all([runTest(naivePrompt), runTest(improvedPrompt)]);
      setResults({ naive: naiveRes, improved: improvedRes });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50/50">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 bg-white/80 backdrop-blur-md border-b border-gray-200/80 sticky top-0 z-20 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
            <Wand2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Prompt Builder</h1>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
                PRO ENGINE
              </span>
            </div>
            <p className="text-xs text-gray-500 font-normal">Transform naive prompts into structured engineering frameworks</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <InstallPWAButton />
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="flex-1 overflow-auto p-6 md:p-8 flex flex-col lg:flex-row gap-8 max-w-[1600px] w-full mx-auto">
        {/* Left Control Panel */}
        <div className="w-full lg:w-5/12 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow space-y-6">
            
            {/* Target Model Selector */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu size={14} className="text-indigo-600" /> Target Model
                </label>
                {onRefreshModels && (
                  <button
                    onClick={onRefreshModels}
                    disabled={isSyncingModels}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-colors"
                    title="Sync latest models from Chat backend"
                  >
                    <RefreshCw size={12} className={isSyncingModels ? "animate-spin text-indigo-600" : ""} />
                    <span>{isSyncingModels ? "Syncing..." : "Sync Models"}</span>
                  </button>
                )}
              </div>
              <div className="relative">
                <select 
                  value={modelId} 
                  onChange={e => setModelId(e.target.value)} 
                  className="w-full p-3 border border-gray-300 rounded-xl text-sm font-medium bg-gray-50/50 hover:bg-white focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none cursor-pointer appearance-none pr-8"
                >
                  {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                </div>
              </div>
            </div>

            {/* Framework Selector */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={14} className="text-indigo-600" /> Framework Strategy
                </label>
                <button 
                  onClick={() => setShowAddFramework(!showAddFramework)} 
                  className="text-indigo-600 hover:text-indigo-800 text-xs flex items-center gap-1 font-semibold hover:underline"
                >
                  <Plus size={13} /> Add Custom
                </button>
              </div>

              <div className="space-y-2.5">
                {frameworks.map(f => (
                  <label 
                    key={f.id} 
                    className={`group flex flex-col p-4 border rounded-xl cursor-pointer transition-all ${
                      framework === f.id 
                        ? 'bg-gradient-to-r from-indigo-50/80 to-purple-50/40 border-indigo-300 ring-2 ring-indigo-500/10 shadow-xs' 
                        : 'hover:bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <input 
                          type="radio" 
                          name="framework" 
                          value={f.id} 
                          checked={framework === f.id} 
                          onChange={(e) => setFramework(e.target.value)} 
                          className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500" 
                        />
                        <span className="text-sm font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">{f.name}</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md font-semibold">{f.id}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 leading-relaxed ml-6 font-normal">{f.description}</p>
                  </label>
                ))}
              </div>

              {/* Add Custom Framework Form */}
              {showAddFramework && (
                <div className="mt-3 p-4 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-3 animate-fade-in">
                  <input
                    type="text"
                    placeholder="Framework Name (e.g. STAR)"
                    value={newFramework.name}
                    onChange={(e) => setNewFramework({...newFramework, name: e.target.value})}
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Description / Framework Rules"
                    value={newFramework.description}
                    onChange={(e) => setNewFramework({...newFramework, description: e.target.value})}
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowAddFramework(false)} className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 font-medium">Cancel</button>
                    <button onClick={handleAddFramework} className="px-3.5 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors">Add Framework</button>
                  </div>
                </div>
              )}
            </div>

            {/* Input Naive Prompt */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Naive Prompt Input</label>
              </div>

              {/* Preset Templates */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {templates.map((t, idx) => (
                  <button
                    key={idx}
                    onClick={() => setNaivePrompt(t.prompt)}
                    className="px-2.5 py-1 bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 text-gray-600 text-xs rounded-lg transition-colors font-medium cursor-pointer border border-transparent hover:border-indigo-200"
                  >
                    {t.title}
                  </button>
                ))}
              </div>

              <textarea
                value={naivePrompt}
                onChange={e => setNaivePrompt(e.target.value)}
                placeholder="Type your draft prompt here... (e.g. Write a marketing email for our new shoe product)"
                className="w-full h-32 p-3.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none resize-none leading-relaxed"
              />
            </div>

            {/* Action Button */}
            <button 
              onClick={handleBuildPrompt}
              disabled={!naivePrompt.trim() || loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white p-3.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 hover:shadow-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all transform active:scale-[0.99]"
            >
              <Wand2 size={18} className={loading ? "animate-spin" : ""} />
              {loading ? "Engineering Prompt..." : "Enhance Prompt"}
            </button>

          </div>
        </div>

        {/* Right Output Panel */}
        <div className="w-full lg:w-7/12 space-y-6">
          {!improvedPrompt && !loading && (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center flex flex-col items-center justify-center h-full min-h-[400px]">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4 shadow-inner">
                <Sparkles size={26} />
              </div>
              <h3 className="text-base font-bold text-gray-800 mb-1">No Enhanced Prompt Generated Yet</h3>
              <p className="text-xs text-gray-500 max-w-md leading-relaxed">
                Select a framework, enter your draft prompt, and click <strong className="text-indigo-600 font-semibold">"Enhance Prompt"</strong> to generate a structured engineering prompt.
              </p>
            </div>
          )}

          {improvedPrompt && (
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-indigo-200/80 shadow-md space-y-5 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-indigo-600" />
                  <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Enhanced Engineering Prompt</h2>
                </div>
                <button
                  onClick={handleCopyPrompt}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200 transition-colors cursor-pointer"
                >
                  {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span>{copied ? "Copied!" : "Copy Prompt"}</span>
                </button>
              </div>

              <div className="p-5 bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-white text-indigo-950 text-sm leading-relaxed rounded-xl whitespace-pre-wrap border border-indigo-100 font-mono shadow-xs">
                {improvedPrompt}
              </div>

              <div className="flex justify-end">
                <button 
                  onClick={handleTestPrompts}
                  disabled={loading}
                  className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-emerald-100 hover:shadow-emerald-200 disabled:opacity-50 cursor-pointer transition-all transform active:scale-[0.99]"
                >
                  <Activity size={18} className={loading ? "animate-spin" : ""} />
                  {loading ? "Benchmarking Outputs..." : "Benchmark Naive vs Enhanced"}
                </button>
              </div>
            </div>
          )}

          {/* Test Comparison & Metrics */}
          {results && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Naive Output */}
                <div className="bg-white border border-gray-200/80 rounded-2xl overflow-hidden flex flex-col shadow-xs">
                  <div className="bg-gray-50/80 px-5 py-3.5 border-b border-gray-200 flex justify-between items-center">
                    <span className="font-bold text-xs uppercase tracking-wider text-gray-700">Naive Response</span>
                    <div className="flex gap-2 text-[10px] font-mono font-semibold">
                      <span className="px-2 py-0.5 bg-gray-200/70 text-gray-700 rounded-md">{(results.naive.latency / 1000).toFixed(2)}s</span>
                      {results.naive.tokens?.totalTokens && <span className="px-2 py-0.5 bg-gray-200/70 text-gray-700 rounded-md">{results.naive.tokens.totalTokens} tkns</span>}
                    </div>
                  </div>
                  <div className="p-5 text-sm text-gray-700 whitespace-pre-wrap overflow-y-auto max-h-96 leading-relaxed">
                    {results.naive.text}
                  </div>
                </div>

                {/* Enhanced Output */}
                <div className="bg-white border border-emerald-300/80 rounded-2xl overflow-hidden flex flex-col shadow-md shadow-emerald-50">
                  <div className="bg-emerald-50/80 px-5 py-3.5 border-b border-emerald-200 flex justify-between items-center">
                    <span className="font-bold text-xs uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                      <Sparkles size={13} /> Enhanced Response
                    </span>
                    <div className="flex gap-2 text-[10px] font-mono font-semibold">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">{(results.improved.latency / 1000).toFixed(2)}s</span>
                      {results.improved.tokens?.totalTokens && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">{results.improved.tokens.totalTokens} tkns</span>}
                    </div>
                  </div>
                  <div className="p-5 text-sm text-gray-800 whitespace-pre-wrap overflow-y-auto max-h-96 leading-relaxed">
                    {results.improved.text}
                  </div>
                </div>
              </div>

              {/* Performance Metrics Chart */}
              <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200/80 shadow-sm space-y-6">
                <div className="flex items-center gap-2">
                  <BarChart2 size={20} className="text-indigo-600" />
                  <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Performance Benchmark</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="h-60 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                    <h3 className="text-xs font-semibold text-gray-500 text-center mb-3">Latency Benchmark (Seconds)</h3>
                    <ResponsiveContainer width="100%" height="85%">
                      <BarChart data={[
                        { name: 'Naive', value: Number((results.naive.latency / 1000).toFixed(2)) },
                        { name: 'Enhanced', value: Number((results.improved.latency / 1000).toFixed(2)) }
                      ]} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                        <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={45}>
                          <Cell fill="#9CA3AF" />
                          <Cell fill="#10B981" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="h-60 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                    <h3 className="text-xs font-semibold text-gray-500 text-center mb-3">Total Token Consumption</h3>
                    <ResponsiveContainer width="100%" height="85%">
                      <BarChart data={[
                        { name: 'Naive', value: results.naive.tokens?.totalTokens || 0 },
                        { name: 'Enhanced', value: results.improved.tokens?.totalTokens || 0 }
                      ]} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                        <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={45}>
                          <Cell fill="#9CA3AF" />
                          <Cell fill="#10B981" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
