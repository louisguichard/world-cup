import { supportsServiceWorker } from "./platform";

/** Registers the app shell service worker (production only). */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (import.meta.env.DEV || !supportsServiceWorker()) return null;

  try {
    return await navigator.serviceWorker.register(`/sw.js?v=${__APP_VERSION__}`, {
      scope: "/",
      updateViaCache: "none",
    });
  } catch (error) {
    console.warn("[PWA] Service worker registration failed", error);
    return null;
  }
}
