import React, { useState, useEffect, useCallback } from "react";
import { Download, Smartphone, CheckCircle, X, Sparkles, Share, PlusSquare, Monitor } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [installedSuccess, setInstalledSuccess] = useState<boolean>(false);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);

  useEffect(() => {
    const checkStandalone = () => {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes("android-app://");

      setIsStandalone(standalone);
    };

    checkStandalone();

    // Check iOS device
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIosDevice);

    // Check if early prompt already captured in window
    if ((window as any).deferredPWAInstallPrompt) {
      setDeferredPrompt((window as any).deferredPWAInstallPrompt);
    }

    // Monitor display-mode changes
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsStandalone(true);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleModeChange);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      (window as any).deferredPWAInstallPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
      console.log("[PWA] Prompt event captured in component");
    };

    const handlePromptReady = () => {
      if ((window as any).deferredPWAInstallPrompt) {
        setDeferredPrompt((window as any).deferredPWAInstallPrompt);
      }
    };

    const handleAppInstalled = () => {
      console.log("[PWA] Prompt Builder was installed successfully");
      setInstalledSuccess(true);
      setShowGuideModal(false);
      setDeferredPrompt(null);
      (window as any).deferredPWAInstallPrompt = null;
      setTimeout(() => {
        setIsStandalone(true);
      }, 4000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("pwa-prompt-ready", handlePromptReady);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("pwa-prompt-ready", handlePromptReady);
      window.removeEventListener("appinstalled", handleAppInstalled);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleModeChange);
      }
    };
  }, []);

  const handleInstallClick = useCallback(async () => {
    const prompt = deferredPrompt || (window as any).deferredPWAInstallPrompt;

    if (prompt) {
      try {
        await prompt.prompt();
        const choice = await prompt.userChoice;
        console.log("[PWA] Outcome:", choice.outcome);
        if (choice.outcome === "accepted") {
          setInstalledSuccess(true);
        }
        setDeferredPrompt(null);
        (window as any).deferredPWAInstallPrompt = null;
      } catch (err) {
        console.error("[PWA] Error launching install prompt:", err);
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  }, [deferredPrompt]);

  // If already installed and running standalone
  if (isStandalone) {
    return null;
  }

  if (installedSuccess) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 shadow-xs animate-in fade-in duration-300">
        <CheckCircle size={14} className="text-emerald-600" />
        <span>Aplikasi Terpasang!</span>
      </div>
    );
  }

  return (
    <>
      {/* Header Install Button */}
      <button
        type="button"
        onClick={handleInstallClick}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200/80 transition-all hover:shadow-sm cursor-pointer group"
        title="Install Prompt Builder ke Desktop / Ponsel"
      >
        <Download size={14} className="text-indigo-600 group-hover:translate-y-0.5 transition-transform" />
        <span className="hidden sm:inline">Install App</span>
      </button>

      {/* Manual Install Guide Modal (Fallback for iOS Safari or browsers without direct prompt) */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white border border-gray-200 text-gray-900 rounded-2xl p-6 shadow-2xl space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900">Install Prompt Builder</h3>
                  <p className="text-xs text-gray-500">Akses cepat seperti aplikasi native</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                aria-label="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            {/* Guide Content */}
            {isIOS ? (
              <div className="space-y-3 bg-indigo-50/50 rounded-xl p-4 border border-indigo-100 text-xs leading-relaxed text-gray-700">
                <div className="font-bold text-indigo-900 uppercase tracking-wider text-[10px]">Panduan iPhone / iPad (Safari)</div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">1</span>
                  <span>Tekan tombol <span className="inline-flex items-center gap-1 font-semibold text-indigo-900 bg-white px-1.5 py-0.5 rounded border border-indigo-200"><Share size={12} /> Bagikan (Share)</span> di bilah bawah Safari.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">2</span>
                  <span>Gulir ke bawah dan pilih <span className="inline-flex items-center gap-1 font-semibold text-indigo-900 bg-white px-1.5 py-0.5 rounded border border-indigo-200"><PlusSquare size={12} /> Tambahkan ke Layar Utama</span> (Add to Home Screen).</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">3</span>
                  <span>Tekan <strong>Tambah</strong> di sudut kanan atas. Ikon Prompt Builder akan langsung terpasang!</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3 bg-indigo-50/50 rounded-xl p-4 border border-indigo-100 text-xs leading-relaxed text-gray-700">
                <div className="font-bold text-indigo-900 uppercase tracking-wider text-[10px]">Panduan Chrome / Edge / Android</div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">1</span>
                  <span>Klik menu titik tiga (<strong className="text-gray-900">⋮</strong>) di sudut kanan atas browser atau ikon install <Download size={13} className="inline text-indigo-600" /> di address bar.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">2</span>
                  <span>Pilih <strong className="text-indigo-900">"Install Prompt Builder"</strong> atau <strong className="text-indigo-900">"Tambahkan ke Layar Utama"</strong>.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">3</span>
                  <span>Konfirmasi pemasangan. Aplikasi akan berjalan di jendela mandiri tanpa address bar!</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm shadow-indigo-200 transition-colors"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
