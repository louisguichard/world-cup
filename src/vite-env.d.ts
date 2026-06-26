/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
declare const __APP_BUILD__: string;
declare const __APP_CHANNEL__: string;

interface ImportMetaEnv {
  readonly VITE_BUILD_VERSION?: string;
  readonly VITE_RAPIDAPI_KEY?: string;
  readonly VITE_ZAFRONIX_API_KEY?: string;
  readonly VITE_THESTATS_API_KEY?: string;
  readonly VITE_ODDS_API_KEY?: string;
  readonly VITE_BETFAIR_SESSION_TOKEN?: string;
  readonly VITE_SD_USERNAME?: string;
  readonly DEV: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
