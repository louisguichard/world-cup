export type PanZoomTransform = {
  scale: number;
  translateX: number;
  translateY: number;
};

export const BRACKET_PAN_ZOOM_LIMITS = {
  minScale: 0.35,
  maxScale: 2.5,
  wheelZoomFactor: 1.08,
  padding: 20,
} as const;

export function clampScale(scale: number): number {
  return Math.min(BRACKET_PAN_ZOOM_LIMITS.maxScale, Math.max(BRACKET_PAN_ZOOM_LIMITS.minScale, scale));
}

export function zoomAtPoint(
  transform: PanZoomTransform,
  pointX: number,
  pointY: number,
  scaleFactor: number
): PanZoomTransform {
  const nextScale = clampScale(transform.scale * scaleFactor);
  if (nextScale === transform.scale) return transform;

  const ratio = nextScale / transform.scale;
  return {
    scale: nextScale,
    translateX: pointX - ratio * (pointX - transform.translateX),
    translateY: pointY - ratio * (pointY - transform.translateY),
  };
}

export function panBy(
  transform: PanZoomTransform,
  deltaX: number,
  deltaY: number
): PanZoomTransform {
  return {
    ...transform,
    translateX: transform.translateX + deltaX,
    translateY: transform.translateY + deltaY,
  };
}

export function computeFitTransform(
  viewportWidth: number,
  viewportHeight: number,
  contentWidth: number,
  contentHeight: number,
  padding = BRACKET_PAN_ZOOM_LIMITS.padding
): PanZoomTransform {
  if (viewportWidth <= 0 || viewportHeight <= 0 || contentWidth <= 0 || contentHeight <= 0) {
    return { scale: 1, translateX: 0, translateY: 0 };
  }

  const availableWidth = Math.max(1, viewportWidth - padding * 2);
  const availableHeight = Math.max(1, viewportHeight - padding * 2);
  const scale = clampScale(Math.min(availableWidth / contentWidth, availableHeight / contentHeight, 1));
  const translateX = (viewportWidth - contentWidth * scale) / 2;
  const translateY = (viewportHeight - contentHeight * scale) / 2;

  return { scale, translateX, translateY };
}

export function transformStyle(transform: PanZoomTransform): string {
  return `translate(${transform.translateX}px, ${transform.translateY}px) scale(${transform.scale})`;
}

export function isPanZoomInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest("button, a, input, textarea, select, [role='button'], .split-bracket-node")
  );
}
