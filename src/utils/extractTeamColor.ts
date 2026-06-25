const CACHE_PREFIX = "wc-team-color:";
const FALLBACK = "#6B7280";

function cacheKey(imageUrl: string): string {
  return `${CACHE_PREFIX}${imageUrl}`;
}

function readCache(imageUrl: string): string | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    return sessionStorage.getItem(cacheKey(imageUrl));
  } catch {
    return null;
  }
}

function writeCache(imageUrl: string, color: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(cacheKey(imageUrl), color);
  } catch {
    // quota or private mode
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export async function extractDominantColor(imageUrl: string): Promise<string> {
  if (!imageUrl) return FALLBACK;

  const cached = readCache(imageUrl);
  if (cached) return cached;

  if (typeof document === "undefined") return FALLBACK;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 10;
        canvas.height = 10;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(FALLBACK);
          return;
        }
        ctx.drawImage(img, 0, 0, 10, 10);
        const [r, g, b] = ctx.getImageData(5, 5, 1, 1).data;
        const hex = rgbToHex(r, g, b);
        writeCache(imageUrl, hex);
        resolve(hex);
      } catch {
        resolve(FALLBACK);
      }
    };
    img.onerror = () => resolve(FALLBACK);
    img.src = imageUrl;
  });
}

export function clearExtractedColorCacheForTests(): void {
  if (typeof sessionStorage === "undefined") return;
  const keys: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) keys.push(key);
  }
  for (const key of keys) sessionStorage.removeItem(key);
}
