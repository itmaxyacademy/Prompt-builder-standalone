import React, { useState, useEffect } from "react";
import { Download, Smartphone, CheckCircle } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [installedSuccess, setInstalledSuccess] = useState<boolean>(false);

  useEffect(() => {
    const checkStandalone = () => {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes("android-app://");

      setIsStandalone(standalone);
      if (standalone) setIsVisible(false);
    };

    checkStandalone();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!isStandalone) setIsVisible(true);
    };

    const handleAppInstalled = () => {
      setInstalledSuccess(true);
      setTimeout(() => {
        setIsVisible(false);
        setDeferredPrompt(null);
      }, 3000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [isStandalone]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstalledSuccess(true);
      }
      setDeferredPrompt(null);
      setIsVisible(false);
    } catch (err) {
      console.error("[PWA] Error launching install prompt:", err);
      setIsVisible(false);
    }
  };

  if (isStandalone) return null;

  if (installedSuccess) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 animate-fade-in">
        <CheckCircle size={14} /> Installed!
      </div>
    );
  }

  if (!isVisible && !deferredPrompt) return null;

  return (
    <button
      onClick={handleInstallClick}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200 transition-colors shadow-sm cursor-pointer"
      title="Install Prompt Builder as App"
    >
      <Download size={14} className="text-indigo-600 animate-bounce" />
      <span>Install App</span>
    </button>
  );
}
