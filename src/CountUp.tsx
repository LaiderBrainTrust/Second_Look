import { useEffect, useRef, useState } from 'react';
import { usd } from './format';

// Animates the display between two server amounts. The value shown at rest is always the server's integer cents.
export function CountUp({ cents, from }: { cents: number; from?: number }) {
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const previous = useRef<number | null>(from ?? null);
  const [shown, setShown] = useState(reduce ? cents : previous.current ?? 0);
  useEffect(() => {
    const start = previous.current ?? 0;
    previous.current = cents;
    if (reduce || start === cents) { setShown(cents); return; }
    const began = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - began) / 700);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(t === 1 ? cents : Math.round(start + (cents - start) * eased));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [cents]);
  return <>{usd(shown)}</>;
}
