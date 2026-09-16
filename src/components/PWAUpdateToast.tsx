import React, { useState, useEffect, useCallback, useRef } from "react";
import { Sparkles, RefreshCw, X, Wifi } from "lucide-react";
import { APP_VERSION, fetchRemoteVersion, isDeviceOnline } from "../version";

interface PWAUpdateToastProps {
  onDismiss?: () => void;
}

export function PWAUpdateToast({ onDismiss }: PWAUpdateToastProps) {
  const [showToast, setShowToast] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [newVersion, setNewVersion] = useState<string>("");
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const autoUpdateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerUpdate = useCallback((worker?: ServiceWorker | null, targetVersion?: string) => {
    setIsUpdating(true);
    const versionKey = targetVersion || "latest";

    // Guard against repeated reloads in the same session
    try {
      sessionStorage.setItem(`pwa_auto_updated_${versionKey}`, "true");
    } catch {
      // ignore storage errors
    }

    const targetWorker = worker || waitingWorker;
    if (targetWorker) {
      console.log("[PWA Update] Posting SKIP_WAITING to waiting worker...");
      targetWorker.postMessage({ type: "SKIP_WAITING" });
    } else if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg?.waiting) {
          console.log("[PWA Update] Found waiting worker in registration, posting SKIP_WAITING...");
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
        } else {
          console.log("[PWA Update] No waiting worker found, reloading directly...");
          window.location.reload();
        }
      });
    } else {
      window.location.reload();
    }

    // Fallback safety reload in case controllerchange doesn't fire
    setTimeout(() => {
      window.location.reload();
    }, 2500);
  }, [waitingWorker]);

  const scheduleAutoUpdate = useCallback((detectedVersion: string, worker?: ServiceWorker | null) => {
    // Check if we already attempted update for this version in this session
    try {
      const alreadyAttempted = sessionStorage.getItem(`pwa_auto_updated_${detectedVersion}`);
      if (alreadyAttempted) {
        console.log(`[PWA Update] Already auto-updated to ${detectedVersion} in this session. Skipping.`);
        return;
      }
    } catch {
      // ignore storage errors
    }

    setNewVersion(detectedVersion);
    setShowToast(true);
    setIsUpdating(true);

    if (autoUpdateTimerRef.current) {
      clearTimeout(autoUpdateTimerRef.current);
    }

    // Auto-update after brief delay (1200ms) so user sees the notification
    autoUpdateTimerRef.current = setTimeout(() => {
      triggerUpdate(worker, detectedVersion);
    }, 1200);
  }, [triggerUpdate]);

  const checkForWaitingWorker = useCallback(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg?.waiting) {
          console.log('[PWA Update] Detected waiting worker, triggering auto-update...');
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          setWaitingWorker(reg.waiting);
          scheduleAutoUpdate('latest', reg.waiting);
        }
      });
    }
  }, [scheduleAutoUpdate]);

  const checkVersionFromServer = useCallback(async () => {
    if (!isDeviceOnline()) {
      return;
    }

    // 1. Trigger Service Worker update check
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        reg?.update().catch((err) => {
          console.debug("[PWA Update] Service worker update check failed:", err);
        });
      });
    }

    // 2. Fetch remote version.json
    const remote = await fetchRemoteVersion();
    if (remote && remote.version && remote.version !== APP_VERSION) {
      console.log(`[PWA Update] New version detected online: remote ${remote.version} vs local ${APP_VERSION}`);
      scheduleAutoUpdate(remote.version, null);
    }
  }, [scheduleAutoUpdate]);

  useEffect(() => {
    // 1. Listen for SW waiting / updatefound event
    const handleUpdateAvailable = (e: Event) => {
      const customEvent = e as CustomEvent<{ registration: ServiceWorkerRegistration }>;
      const reg = customEvent.detail?.registration;
      if (reg?.waiting) {
        setWaitingWorker(reg.waiting);
        scheduleAutoUpdate(newVersion || "baru", reg.waiting);
      }
      checkVersionFromServer();
    };

    window.addEventListener("pwa-update-available", handleUpdateAvailable);
    checkForWaitingWorker();

    // 2. Initial check when online
    if (isDeviceOnline()) {
      checkVersionFromServer();
    }

    // 3. Online event listener: check immediately when device connects to internet
    const handleOnline = () => {
      console.log("[PWA Update] Device is back online, checking for updates...");
      checkVersionFromServer();
    };
    window.addEventListener("online", handleOnline);

    // 4. Tab visibility change: check when user returns to app and online
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isDeviceOnline()) {
        checkVersionFromServer();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 5. Periodic check every 10 minutes when online
    const intervalId = setInterval(() => {
      if (isDeviceOnline()) {
        checkVersionFromServer();
      }
    }, 10 * 60 * 1000);

    return () => {
      window.removeEventListener("pwa-update-available", handleUpdateAvailable);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(intervalId);
      if (autoUpdateTimerRef.current) {
        clearTimeout(autoUpdateTimerRef.current);
      }
    };
  }, [checkVersionFromServer, newVersion, scheduleAutoUpdate]);

  if (!showToast) {
    return null;
  }

  return (
    <aside
      role="status"
      aria-label="Notifikasi Pembaruan Otomatis Aplikasi"
      className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-indigo-100 p-4 animate-in slide-in-from-bottom-5 duration-300 ring-1 ring-black/5"
    >
      <div className="flex items-start gap-3">
        <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-xl text-white shadow-md shadow-indigo-200 shrink-0">
          <Sparkles size={20} className="animate-pulse" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-1">
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <span>Pembaruan Otomatis</span>
              {newVersion && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  v{newVersion}
                </span>
              )}
            </h4>
            <button
              onClick={() => {
                if (autoUpdateTimerRef.current) {
                  clearTimeout(autoUpdateTimerRef.current);
                }
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
            Versi baru terdeteksi saat online. Menerapkan pembaruan dan memuat ulang sistem secara otomatis...
          </p>

          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-150 rounded-xl text-indigo-700 text-xs font-semibold">
              <RefreshCw size={13} className="animate-spin text-indigo-600" />
              <span>Memperbarui otomatis...</span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress line indicator */}
      <div className="mt-3 w-full bg-indigo-100 h-1 rounded-full overflow-hidden">
        <div className="bg-indigo-600 h-full rounded-full animate-pulse w-full duration-1000" />
      </div>
    </aside>
  );
}
