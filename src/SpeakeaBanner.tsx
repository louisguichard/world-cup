import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

/**
 * A discreet green top-bar gently pointing visitors to Speakea — a side
 * project to practise spoken English. It is deliberately low-key:
 *   • shown to non-English browsers, plus English browsers in selected
 *     non-native-English markets inferred from timezone;
 *   • paced by how many times the visitor has come back (a "passage").
 *
 * It stays pinned at the very top (like the header) and pushes the page down
 * via the --speakea-banner-h CSS variable, mirroring Speakea's own SignupBanner.
 *
 * Display / frequency rules (all tunable via the constants below):
 *   • First impression: on the 1st visit after 60s, OR immediately on the
 *     2nd visit — whichever comes first. It keeps showing each visit until
 *     the visitor either closes it or opens Speakea.
 *   • After the visitor CLOSES it: shows again on the 5th visit, then the
 *     10th, then every 10th visit (20, 30, 40, …).
 *   • After the visitor CLICKS a link: shows again every 10th visit
 *     (10, 20, 30, …).
 *
 * A "visit" (passage) is a new browsing session: two page loads less than
 * SESSION_GAP_MS apart count as the same visit, so reloads don't inflate it.
 */

const SPEAKEA_URL = "https://speakea.app/?utm_source=worldcup";

// localStorage key — bump the suffix to reset the rollout for everyone.
const STORAGE_KEY = "speakea-banner-v2";

// First visit: how long the visitor browses before the bar slides in.
const SHOW_AFTER_MS = 60_000; // 60 seconds

// Two loads less than this apart count as the same visit/passage.
const SESSION_GAP_MS = 30 * 60_000; // 30 minutes

// Non-English browsers always remain eligible. For English browsers, only show
// in selected non-native-English markets. This keeps the banner conservative
// while still catching people in France, Italy, India, China, etc. who use an
// English browser UI.
const ENGLISH_BROWSER_TARGET_TIMEZONES = new Set([
  "Africa/Algiers",
  "Africa/Casablanca",
  "Africa/Tunis",
  "America/Argentina/Buenos_Aires",
  "America/Bogota",
  "America/Lima",
  "America/Mexico_City",
  "America/Santiago",
  "America/Sao_Paulo",
  "Asia/Bangkok",
  "Asia/Ho_Chi_Minh",
  "Asia/Hong_Kong",
  "Asia/Jakarta",
  "Asia/Kolkata",
  "Asia/Seoul",
  "Asia/Shanghai",
  "Asia/Taipei",
  "Asia/Tokyo",
  "Europe/Amsterdam",
  "Europe/Athens",
  "Europe/Belgrade",
  "Europe/Berlin",
  "Europe/Bratislava",
  "Europe/Brussels",
  "Europe/Bucharest",
  "Europe/Budapest",
  "Europe/Copenhagen",
  "Europe/Helsinki",
  "Europe/Lisbon",
  "Europe/Ljubljana",
  "Europe/Luxembourg",
  "Europe/Madrid",
  "Europe/Monaco",
  "Europe/Oslo",
  "Europe/Paris",
  "Europe/Prague",
  "Europe/Riga",
  "Europe/Rome",
  "Europe/Sofia",
  "Europe/Stockholm",
  "Europe/Tallinn",
  "Europe/Vienna",
  "Europe/Vilnius",
  "Europe/Warsaw",
  "Europe/Zagreb",
  "Europe/Zurich"
]);

type Phase = "new" | "closed" | "clicked";
type BannerState = { visits: number; lastVisitAt: number; phase: Phase };

const DEFAULT_STATE: BannerState = { visits: 0, lastVisitAt: 0, phase: "new" };

function getPrimaryLanguage(): string {
  if (typeof navigator === "undefined") return "";
  return (navigator.languages?.[0] ?? navigator.language ?? "").toLowerCase();
}

function getTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  } catch {
    return "";
  }
}

function isLikelySpeakeaAudience(): boolean {
  const primaryLanguage = getPrimaryLanguage();
  if (!primaryLanguage.startsWith("en")) return true;
  const timezone = getTimezone();
  return ENGLISH_BROWSER_TARGET_TIMEZONES.has(timezone);
}

function readState(): BannerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_STATE, ...(JSON.parse(raw) as Partial<BannerState>) };
  } catch {
    // Fall through to the default.
  }
  return { ...DEFAULT_STATE };
}

function writeState(state: BannerState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Banner state is best-effort; ignore storage failures.
  }
}

// Is this visit count a moment we should (re)appear at, given the phase?
// Returns "delay" to wait SHOW_AFTER_MS first, "now" to show immediately,
// or false to stay hidden.
function decideShow(visits: number, phase: Phase): "now" | "delay" | false {
  if (phase === "new") {
    return visits >= 2 ? "now" : "delay"; // 1st visit → 60s, then immediate
  }
  const isTenth = visits >= 10 && visits % 10 === 0;
  if (phase === "closed") return visits === 5 || isTenth ? "now" : false;
  return isTenth ? "now" : false; // clicked
}

function setBannerHeight(value: string): void {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--speakea-banner-h", value);
}

// How long the slide-up / collapse animation runs when closing.
const LEAVE_MS = 400;

function SpeakeaBanner() {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const bannerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isLikelySpeakeaAudience()) return;

    const prev = readState();
    const now = Date.now();
    const isNewVisit = prev.visits === 0 || now - prev.lastVisitAt >= SESSION_GAP_MS;
    const visits = isNewVisit ? prev.visits + 1 : prev.visits;
    writeState({ ...prev, visits, lastVisitAt: now });

    const decision = decideShow(visits, prev.phase);
    if (!decision) return;
    if (decision === "now") {
      setVisible(true);
      return;
    }
    const timer = window.setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, []);

  // Keep --speakea-banner-h in sync so the layout below leaves room for the bar.
  useEffect(() => {
    if (!visible) return;
    const update = () => setBannerHeight(`${bannerRef.current?.offsetHeight ?? 0}px`);
    update();
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      setBannerHeight("0px");
    };
  }, [visible]);

  if (!visible) return null;

  const setPhase = (phase: Phase) => writeState({ ...readState(), phase });

  const dismiss = () => {
    setPhase("closed");
    setLeaving(true);
    window.setTimeout(() => setVisible(false), LEAVE_MS);
  };

  const onVisit = () => setPhase("clicked");

  return (
    <div
      className={`speakea-banner${leaving ? " leaving" : ""}`}
      ref={bannerRef}
      role="region"
      aria-label="A note from the maker"
    >
      <p className="speakea-banner-text">
        I'm also building{" "}
        <a className="speakea-link" href={SPEAKEA_URL} target="_blank" rel="noopener" onClick={onVisit}>
          Speakea
        </a>
        , an app to improve your English by actually speaking.{" "}
        <a className="speakea-link" href={SPEAKEA_URL} target="_blank" rel="noopener" onClick={onVisit}>
          Try it now!
        </a>
      </p>
      <button className="speakea-close" onClick={dismiss} aria-label="Dismiss">
        <X size={15} />
      </button>
    </div>
  );
}

export default SpeakeaBanner;
