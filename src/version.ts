export const APP_VERSION = "1.0.0";
export const APP_NAME = "Prompt Builder";

export interface AppVersionInfo {
  appName: string;
  version: string;
  buildTime?: string;
  releaseNotes?: string;
}

/**
 * Check if a new version is available on the server by fetching version.json
 */
export async function fetchRemoteVersion(): Promise<AppVersionInfo | null> {
  try {
    const res = await fetch(`./version.json?t=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" }
    });
    if (res.ok) {
      return (await res.json()) as AppVersionInfo;
    }
  } catch (err) {
    console.debug("[PWA Version] Could not fetch remote version.json:", err);
  }
  return null;
}
