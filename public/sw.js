/* App shell service worker — enables install + offline fallback for static assets. */
const CACHE = "wc-shell-v2";
const PRECACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/logo/wc-trophy-logo.png",
  "/logo/wc-trophy-mark.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function isAppShellRequest(url) {
  if (url.origin !== self.location.origin) return false;
  const path = url.pathname;
  if (path.startsWith("/api/")) return false;
  if (path.startsWith("/espn")) return false;
  if (path.startsWith("/rapidapi")) return false;
  if (path.startsWith("/poly")) return false;
  if (path.startsWith("/fifa")) return false;
  return (
    path === "/" ||
    path.endsWith(".html") ||
    path.endsWith(".js") ||
    path.endsWith(".css") ||
    path.endsWith(".png") ||
    path.endsWith(".svg") ||
    path.endsWith(".woff2") ||
    path.endsWith(".otf") ||
    path.endsWith(".ttf") ||
    path.startsWith("/icons/") ||
    path.startsWith("/logo/") ||
    path.startsWith("/fonts/")
  );
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (!isAppShellRequest(url)) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === "navigate") {
          return caches.match("/index.html");
        }
        return Response.error();
      })
  );
});
