import { useEffect, useRef, useState } from "react";

function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Contagem crescente até `value`. Reanima sempre que o valor muda.
 */
export function AnimatedCounter({
  value,
  format,
  duration = 900,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const from = fromRef.current;
    const to = Number.isFinite(value) ? value : 0;
    if (reduce || from === to) {
      fromRef.current = to;
      setDisplay(to);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setDisplay(from + (to - from) * easeOut(t));
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  const rendered = format ? format(display) : Math.round(display).toLocaleString("pt-PT");

  return (
    <span className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {rendered}
    </span>
  );
}
