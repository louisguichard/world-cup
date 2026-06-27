import { supportsServiceWorker } from "./platform";

/** Registers the app shell service worker (production only). */
export async function registerServiceWorker(): Promise<void> {
  if (import.meta.env.DEV || !supportsServiceWorker()) return;

  try {
    await navigator.serviceWorker.register(`/sw.js?v=${__APP_VERSION__}`, {
      scope: "/",
      updateViaCache: "none",
    });
  } catch (error) {
    console.warn("[PWA] Service worker registration failed", error);
  }
}
