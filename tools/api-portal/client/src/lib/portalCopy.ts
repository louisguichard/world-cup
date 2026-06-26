/** Plain-language labels used across the portal (keep it simple). */

export const KEY_STATUS_LABELS = {
  active: "Works!",
  inactive: "Didn't work",
  untested: "Not checked yet",
  placeholder: "Needs your key",
  disabled: "Not in use",
} as const;

export const KEY_STATUS_FILTER_LABELS = {
  all: "All",
  placeholder: "Needs your key",
  untested: "Not checked",
  active: "Works!",
  inactive: "Didn't work",
  disabled: "Not in use",
} as const;

export const PASTE_KEY_STEPS = [
  "Paste each secret key once here in the yellow box — you never need to open each app’s files.",
  "Click “Send keys to my apps” at the top — every linked app gets updated automatically.",
  "Change a shared key (like Gemini) once — all apps using that name get the new value.",
] as const;
