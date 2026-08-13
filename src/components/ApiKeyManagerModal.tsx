import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Eye, EyeOff, Key, Check, AlertCircle, Edit2 } from "lucide-react";
import { ApiKey } from "../types";

interface ApiKeyManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKeys: ApiKey[];
  onSave: (keys: ApiKey[]) => void;
}

export function ApiKeyManagerModal({ isOpen, onClose, apiKeys, onSave }: ApiKeyManagerModalProps) {
  const [keys, setKeys] = useState<ApiKey[]>(apiKeys);
  const [newName, setNewName] = useState("");
  const [newKey, setNewKey] = useState("");
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editKeyValue, setEditKeyValue] = useState("");

  useEffect(() => {
    setKeys(apiKeys);
  }, [apiKeys]);

  if (!isOpen) return null;

  const handleAdd = () => {
    if (!newName.trim() || !newKey.trim()) {
      setError("Nama dan API Key tidak boleh kosong.");
      return;
    }
    const newEntry: ApiKey = {
      id: `key-${Date.now()}`,
      name: newName.trim(),
      key: newKey.trim()
    };
    setKeys(prev => [...prev, newEntry]);
    setNewName("");
    setNewKey("");
    setError(null);
  };

  const handleDelete = (id: string) => {
    setKeys(prev => prev.filter(k => k.id !== id));
  };

  const toggleShow = (id: string) => {
    setShowKey(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const startEdit = (k: ApiKey) => {
    setEditingKeyId(k.id);
    setEditName(k.name);
    setEditKeyValue(k.key);
  };

  const cancelEdit = () => {
    setEditingKeyId(null);
    setEditName("");
    setEditKeyValue("");
  };

  const saveEdit = (id: string) => {
    if (!editName.trim() || !editKeyValue.trim()) {
      setError("Nama dan API Key tidak boleh kosong.");
      return;
    }
    setKeys(prev => prev.map(k => (k.id === id ? { ...k, name: editName.trim(), key: editKeyValue.trim() } : k)));
    setEditingKeyId(null);
    setError(null);
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return "••••••••";
    return key.substring(0, 4) + "••••••••" + key.substring(key.length - 4);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    await onSave(keys);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Key size={16} className="text-indigo-600" />
            </div>
            <h2 className="text-base font-bold text-gray-900">Manage API Keys</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Existing keys */}
          {keys.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Saved Keys ({keys.length})</p>
              {keys.map(k => (
                <div key={k.id} className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                  {editingKeyId === k.id ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="flex-1 bg-white border border-indigo-300 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                          placeholder="Nama API Key"
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={cancelEdit} className="p-1 text-gray-400 hover:text-gray-600 transition-colors" title="Batal">
                            <X size={16} />
                          </button>
                          <button onClick={() => saveEdit(k.id)} className="p-1 text-emerald-600 hover:text-emerald-700 transition-colors" title="Simpan Perubahan">
                            <Check size={16} />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type={showKey[k.id] ? "text" : "password"}
                          value={editKeyValue}
                          onChange={e => setEditKeyValue(e.target.value)}
                          className="flex-1 bg-white border border-indigo-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                          placeholder="API Key Secret"
                        />
                        <button onClick={() => toggleShow(k.id)} className="p-1 text-gray-400 hover:text-gray-700 transition-colors shrink-0">
                          {showKey[k.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{k.name}</p>
                        <p className="text-xs text-gray-400 font-mono truncate">
                          {showKey[k.id] ? k.key : maskKey(k.key)}
                        </p>
                      </div>
                      <button onClick={() => toggleShow(k.id)} className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors shrink-0" title="Lihat Key">
                        {showKey[k.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button onClick={() => startEdit(k)} className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors shrink-0" title="Edit Key">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(k.id)} className="p-1.5 text-red-400 hover:text-red-600 transition-colors shrink-0" title="Hapus Key">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-400">
              <Key size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Belum ada API key tersimpan</p>
            </div>
          )}

          {/* Add new key form */}
          <div className="space-y-3 border-t border-gray-100 pt-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tambah API Key Baru</p>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 text-red-600 px-3 py-2 rounded-lg text-xs border border-red-100">
                <AlertCircle size={13} />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <input
                type="text"
                value={newName}
                onChange={e => { setNewName(e.target.value); setError(null); }}
                placeholder="Nama (contoh: OpenAI Personal, Gemini Prod)"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <div className="relative">
                <input
                  type={showKey["new"] ? "text" : "password"}
                  value={newKey}
                  onChange={e => { setNewKey(e.target.value); setError(null); }}
                  placeholder="API Key Secret"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 pr-10 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => toggleShow("new")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                >
                  {showKey["new"] ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <button
                onClick={handleAdd}
                className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50 rounded-xl text-sm font-semibold transition-colors"
              >
                <Plus size={15} />
                Tambah ke List
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50/50">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium">
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-bold shadow-md hover:opacity-90 transition-all disabled:opacity-70"
          >
            {saved ? <Check size={15} /> : null}
            {saving ? "Menyimpan..." : saved ? "Tersimpan!" : "Simpan & Sync"}
          </button>
        </div>
      </div>
    </div>
  );
}
