import React, { useState, useEffect, useCallback } from "react";
import { Sparkles, RefreshCw, X, ArrowUpCircle } from "lucide-react";
import { APP_VERSION, fetchRemoteVersion } from "../version";

interface PWAUpdateToastProps {
  onDismiss?: () => void;
}

export function PWAUpdateToast({ onDismiss }: PWAUpdateToastProps) {
  const [showToast, setShowToast] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [newVersion, setNewVersion] = useState<string>("");
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  const triggerUpdate = useCallback(() => {
    setIsUpdating(true);
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    } else {
      // Fallback if worker isn't directly referenceable
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistration().then((reg) => {
          if (reg?.waiting) {
            reg.waiting.postMessage({ type: "SKIP_WAITING" });
          } else {
            window.location.reload();
          }
        });
      } else {
        window.location.reload();
      }
    }
  }, [waitingWorker]);

  const checkVersionFromServer = useCallback(async () => {
    const remote = await fetchRemoteVersion();
    if (remote && remote.version && remote.version !== APP_VERSION) {
      console.log(`[PWA Update] New version detected: remote ${remote.version} vs local ${APP_VERSION}`);
      setNewVersion(remote.version);
      setShowToast(true);

      // Tell SW to check for changes
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistration().then((reg) => {
          reg?.update();
        });
      }
    }
  }, []);

  useEffect(() => {
    // 1. Listen for SW waiting / updatefound event from index.html
    const handleUpdateAvailable = (e: Event) => {
      const customEvent = e as CustomEvent<{ registration: ServiceWorkerRegistration }>;
      const reg = customEvent.detail?.registration;
      if (reg?.waiting) {
        setWaitingWorker(reg.waiting);
      }
      setShowToast(true);
      checkVersionFromServer();
    };

    window.addEventListener("pwa-update-available", handleUpdateAvailable);

    // 2. Initial check from version.json
    checkVersionFromServer();

    // 3. Check when user returns to the tab/window
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkVersionFromServer();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Periodic check every 15 minutes
    const intervalId = setInterval(checkVersionFromServer, 15 * 60 * 1000);

    return () => {
      window.removeEventListener("pwa-update-available", handleUpdateAvailable);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [checkVersionFromServer]);

  if (!showToast) {
    return null;
  }

  return (
    <aside
      role="status"
      aria-label="Notifikasi Pembaruan Aplikasi"
      className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-indigo-100 p-4 animate-in slide-in-from-bottom-5 duration-300 ring-1 ring-black/5"
    >
      <div className="flex items-start gap-3">
        <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-xl text-white shadow-md shadow-indigo-200 shrink-0">
          <Sparkles size={20} className="animate-pulse" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-1">
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <span>Versi Baru Tersedia!</span>
              {newVersion && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  v{newVersion}
                </span>
              )}
            </h4>
            <button
              onClick={() => {
                setShowToast(false);
                onDismiss?.();
              }}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              title="Tutup Notifikasi"
            >
              <X size={15} />
            </button>
          </div>

          <p className="text-xs text-gray-600 leading-relaxed mb-3">
            Pembaruan sistem telah diunduh di latar belakang. Muat ulang sekarang untuk menikmati performa dan fitur terbaru.
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={triggerUpdate}
              disabled={isUpdating}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-75 text-white text-xs font-semibold rounded-xl shadow-sm shadow-indigo-200 transition-all cursor-pointer"
            >
              <RefreshCw size={13} className={isUpdating ? "animate-spin" : ""} />
              <span>{isUpdating ? "Memperbarui..." : "Perbarui Sekarang"}</span>
            </button>
            <button
              onClick={() => setShowToast(false)}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Nanti
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
