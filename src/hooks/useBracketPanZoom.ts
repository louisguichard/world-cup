import { useCallback, useEffect, useRef, useState } from "react";
import {
  BRACKET_PAN_ZOOM_LIMITS,
  computeFitTransform,
  isPanZoomInteractiveTarget,
  transformStyle,
  zoomAtPoint,
  type PanZoomTransform,
} from "../lib/brackets/bracketPanZoom";

type Options = {
  contentWidth: number;
  contentHeight: number;
  enabled?: boolean;
};

type PanSession = {
  pointerId: number;
  originX: number;
  originY: number;
  startX: number;
  startY: number;
};

export function useBracketPanZoom({ contentWidth, contentHeight, enabled = true }: Options) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<PanZoomTransform>({ scale: 1, translateX: 0, translateY: 0 });
  const [transform, setTransform] = useState<PanZoomTransform>(transformRef.current);
  const [isPanning, setIsPanning] = useState(false);
  const panSessionRef = useRef<PanSession | null>(null);

  const applyTransform = useCallback((next: PanZoomTransform) => {
    transformRef.current = next;
    setTransform(next);
  }, []);

  const fitToView = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    applyTransform(computeFitTransform(rect.width, rect.height, contentWidth, contentHeight));
  }, [applyTransform, contentWidth, contentHeight]);

  const zoomBy = useCallback(
    (factor: number, point?: { x: number; y: number }) => {
      const viewport = viewportRef.current;
      if (!viewport) return;

      const rect = viewport.getBoundingClientRect();
      const focalX = point?.x ?? rect.width / 2;
      const focalY = point?.y ?? rect.height / 2;
      applyTransform(zoomAtPoint(transformRef.current, focalX, focalY, factor));
    },
    [applyTransform]
  );

  useEffect(() => {
    if (!enabled) return;
    const viewport = viewportRef.current;
    if (!viewport) return;

    const onWheelNative = (event: WheelEvent) => {
      event.preventDefault();
      const rect = viewport.getBoundingClientRect();
      const factor =
        event.deltaY > 0
          ? 1 / BRACKET_PAN_ZOOM_LIMITS.wheelZoomFactor
          : BRACKET_PAN_ZOOM_LIMITS.wheelZoomFactor;
      const focalX = event.clientX - rect.left;
      const focalY = event.clientY - rect.top;
      applyTransform(zoomAtPoint(transformRef.current, focalX, focalY, factor));
    };

    viewport.addEventListener("wheel", onWheelNative, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheelNative);
  }, [applyTransform, enabled]);

  useEffect(() => {
    if (!enabled) return;
    fitToView();
  }, [enabled, fitToView, contentWidth, contentHeight]);

  useEffect(() => {
    if (!enabled) return;
    const viewport = viewportRef.current;
    if (!viewport) return;

    const observer = new ResizeObserver(() => fitToView());
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [enabled, fitToView]);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!enabled) return;
      if (event.button !== 0 && event.button !== 1) return;
      if (isPanZoomInteractiveTarget(event.target)) return;

      const current = transformRef.current;
      panSessionRef.current = {
        pointerId: event.pointerId,
        originX: event.clientX,
        originY: event.clientY,
        startX: current.translateX,
        startY: current.translateY,
      };
      setIsPanning(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [enabled]
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const session = panSessionRef.current;
      if (!session || session.pointerId !== event.pointerId) return;

      const deltaX = event.clientX - session.originX;
      const deltaY = event.clientY - session.originY;
      applyTransform({
        scale: transformRef.current.scale,
        translateX: session.startX + deltaX,
        translateY: session.startY + deltaY,
      });
    },
    [applyTransform]
  );

  const endPan = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const session = panSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    panSessionRef.current = null;
    setIsPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  return {
    viewportRef,
    transform,
    transformCss: transformStyle(transform),
    isPanning,
    fitToView,
    zoomIn: () => zoomBy(BRACKET_PAN_ZOOM_LIMITS.wheelZoomFactor),
    zoomOut: () => zoomBy(1 / BRACKET_PAN_ZOOM_LIMITS.wheelZoomFactor),
    onPointerDown,
    onPointerMove,
    onPointerUp: endPan,
    onPointerCancel: endPan,
  };
}
