export type UiDebugIssueKind =
  | "page-horizontal-overflow"
  | "horizontal-overflow"
  | "vertical-clip"
  | "layout-collision";

export type UiDebugIssue = {
  id: string;
  kind: UiDebugIssueKind;
  label: string;
  detail: string;
  rect: DOMRectReadOnly;
  element: HTMLElement;
};

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "SVG", "PATH", "NOSCRIPT"]);

function describeElement(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : "";
  const classes = el.className && typeof el.className === "string"
    ? `.${el.className.trim().split(/\s+/).slice(0, 2).join(".")}`
    : "";
  return `${tag}${id}${classes}`;
}

function isScrollContainer(el: HTMLElement): boolean {
  const style = getComputedStyle(el);
  const ox = style.overflowX;
  const oy = style.overflowY;
  return ox === "auto" || ox === "scroll" || oy === "auto" || oy === "scroll";
}

function isVisible(el: HTMLElement): boolean {
  const style = getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function childrenOverflowParent(parent: HTMLElement, child: HTMLElement): boolean {
  const pr = parent.getBoundingClientRect();
  const cr = child.getBoundingClientRect();
  const tol = 2;
  return (
    cr.left < pr.left - tol ||
    cr.right > pr.right + tol ||
    cr.top < pr.top - tol ||
    cr.bottom > pr.bottom + tol
  );
}

/** Text truncated with ellipsis still reports full scrollWidth in some engines. */
function usesEllipsisClip(el: HTMLElement): boolean {
  const style = getComputedStyle(el);
  return (
    style.textOverflow === "ellipsis" &&
    (style.overflow === "hidden" ||
      style.overflowX === "hidden" ||
      style.overflowY === "hidden" ||
      style.overflow === "clip" ||
      style.overflowX === "clip")
  );
}

/** SVG groups use transform space; DOM rects are not layout boxes. */
function isSvgGraphicsNode(el: HTMLElement, parent: HTMLElement): boolean {
  return parent.tagName === "svg" || (Boolean(el.closest("svg")) && parent.closest("svg") === el.closest("svg"));
}

/** Live command column — glow wrappers sit inside padded, clipped containers. */
function isLiveCommandGlowChild(el: HTMLElement, parent: HTMLElement): boolean {
  return (
    parent.classList.contains("live-command-hero") &&
    el.classList.contains("fixture-glow-wrap")
  );
}

/** Live section reserves glow bleed via padding; row/strip stay in bounds. */
function isLiveCommandSectionChild(el: HTMLElement, parent: HTMLElement): boolean {
  return (
    parent.classList.contains("dashboard-section") &&
    Boolean(el.closest(".live-command-row")) &&
    (el.classList.contains("live-command-row") ||
      el.classList.contains("live-now-strip") ||
      el.classList.contains("live-command-hero"))
  );
}

/** Fixture glow wrappers intentionally bleed outside their box. */
function isIntentionalGlowBleed(el: HTMLElement): boolean {
  return el.classList.contains("fixture-glow-wrap");
}

/** content-visibility:auto uses intrinsic size until painted. */
function isContentVisibilityPlaceholder(el: HTMLElement): boolean {
  return getComputedStyle(el).contentVisibility === "auto";
}

/** Bracket / table regions meant to scroll horizontally. */
function isIntentionalScrollRegion(el: HTMLElement): boolean {
  return (
    el.classList.contains("bracket-scroll") ||
    el.classList.contains("group-table-scroll") ||
    el.classList.contains("bracket-section")
  );
}

function isCompactScorersSlot(el: HTMLElement): boolean {
  return el.classList.contains("match-goal-scorers-slot");
}

export function scanUiLayoutIssues(root: HTMLElement | Document = document): UiDebugIssue[] {
  const issues: UiDebugIssue[] = [];
  const scope = root instanceof Document ? root.documentElement : root;

  const pageOverflow =
    document.documentElement.scrollWidth - document.documentElement.clientWidth > 2;
  if (pageOverflow) {
    issues.push({
      id: "page-h-overflow",
      kind: "page-horizontal-overflow",
      label: "Page",
      detail: `Document is ${document.documentElement.scrollWidth}px wide (viewport ${document.documentElement.clientWidth}px)`,
      rect: new DOMRect(0, 0, document.documentElement.clientWidth, 48),
      element: document.documentElement,
    });
  }

  const nodes = scope.querySelectorAll<HTMLElement>("*");
  let index = 0;

  for (const el of nodes) {
    if (SKIP_TAGS.has(el.tagName)) continue;
    if (!isVisible(el)) continue;
    if (el.closest(".ui-debug-toolbar, .ui-debug-panel, .debug-panel, .splash-screen")) continue;

    const rect = el.getBoundingClientRect();
    if (rect.width < 12 || rect.height < 12) continue;

    const style = getComputedStyle(el);
    const hDelta = el.scrollWidth - el.clientWidth;
    const vDelta = el.scrollHeight - el.clientHeight;

    if (hDelta > 2) {
      const clipped =
        style.overflowX === "hidden" ||
        style.overflowX === "clip" ||
        (style.overflowX === "visible" && el.parentElement && style.overflow !== "visible");

      const skipHorizontal =
        usesEllipsisClip(el) ||
        isIntentionalGlowBleed(el) ||
        (isIntentionalScrollRegion(el) && isScrollContainer(el)) ||
        el.classList.contains("team-flag-inner") ||
        (el.classList.contains("team-flag-badge") &&
          (el.classList.contains("team-flag-badge--compact") ||
            Boolean(el.closest(".live-hero-card, .live-now-strip")))) ||
        (el.classList.contains("schedule-list") && Boolean(el.closest(".dashboard-section"))) ||
        (el.classList.contains("schedule-day-group") && Boolean(el.closest(".dashboard-view"))) ||
        (el.classList.contains("dashboard-section") &&
          Boolean(el.querySelector(".schedule-list, .schedule-day-group"))) ||
        Boolean(el.closest(".wc-main-simulator, .app-shell"));

      if (!skipHorizontal && (clipped || (!isScrollContainer(el) && hDelta > 8))) {
        issues.push({
          id: `h-${index++}`,
          kind: "horizontal-overflow",
          label: describeElement(el),
          detail: `Content ${el.scrollWidth}px vs container ${el.clientWidth}px (+${hDelta}px)`,
          rect,
          element: el,
        });
      }
    }

    if (
      vDelta > 2 &&
      (style.overflowY === "hidden" || style.overflowY === "clip") &&
      !isContentVisibilityPlaceholder(el) &&
      !isIntentionalGlowBleed(el) &&
      !el.classList.contains("team-flag-inner") &&
      !isCompactScorersSlot(el) &&
      !el.classList.contains("group-table-scroll")
    ) {
      issues.push({
        id: `v-${index++}`,
        kind: "vertical-clip",
        label: describeElement(el),
        detail: `Clipped vertically: ${el.scrollHeight}px content in ${el.clientHeight}px`,
        rect,
        element: el,
      });
    }

    const parent = el.parentElement;
    if (
      parent &&
      parent !== scope &&
      isVisible(parent) &&
      !isScrollContainer(parent) &&
      !isIntentionalGlowBleed(parent) &&
      style.position !== "absolute" &&
      style.position !== "fixed" &&
      childrenOverflowParent(parent, el)
    ) {
      const pr = parent.getBoundingClientRect();
      if (pr.width > 40 && pr.height > 20) {
        const skipCollision =
          (el.classList.contains("accent") && parent.tagName === "H1") ||
          parent.classList.contains("fixture-glow-wrap") ||
          isSvgGraphicsNode(el, parent) ||
          isLiveCommandGlowChild(el, parent) ||
          isLiveCommandSectionChild(el, parent) ||
          Boolean(el.closest(".wc-main-simulator")) ||
          (parent.classList.contains("schedule-day-group") &&
            el.classList.contains("fixture-glow-wrap")) ||
          (parent.classList.contains("dashboard-section") &&
            el.classList.contains("fixture-glow-wrap") &&
            Boolean(el.closest(".schedule-list"))) ||
          (el.classList.contains("bracket-scroll") && parent.classList.contains("bracket-section")) ||
          (parent.classList.contains("dashboard-section--defer") &&
            el.classList.contains("live-bracket-embed")) ||
          (el.classList.contains("match-goal-scorers") &&
            parent.classList.contains("match-goal-scorers-slot")) ||
          (el.classList.contains("live-qual-row") &&
            parent.classList.contains("qual-dashboard-row")) ||
          (parent.classList.contains("bracket-rounds") &&
            el.classList.contains("bracket-round")) ||
          (el.classList.contains("fixture-betting-body") &&
            parent.classList.contains("fixture-betting-details"));

        if (!skipCollision) {
          issues.push({
            id: `c-${index++}`,
            kind: "layout-collision",
            label: describeElement(el),
            detail: `Child extends outside ${describeElement(parent)} bounds`,
            rect,
            element: el,
          });
        }
      }
    }
  }

  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.kind}:${issue.label}:${Math.round(issue.rect.top)}:${Math.round(issue.rect.left)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 40);
}

export function markLayoutContainers(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>("*").forEach((el) => {
    if (SKIP_TAGS.has(el.tagName)) return;
    const style = getComputedStyle(el);
    if (
      style.display === "flex" ||
      style.display === "inline-flex" ||
      style.display === "grid" ||
      style.display === "inline-grid"
    ) {
      el.classList.add("ui-debug-layout-node");
    }
  });
}

export function clearLayoutContainerMarks(root: HTMLElement): void {
  root.querySelectorAll(".ui-debug-layout-node").forEach((el) => {
    el.classList.remove("ui-debug-layout-node");
  });
}
