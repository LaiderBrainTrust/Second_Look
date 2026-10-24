// Original line-burst mark drawn in SVG; the variant changes the ray count and lengths.
export function Burst({ variant = 0 }: { variant?: number }) {
  const rays = [16, 24, 12, 32][variant % 4];
  const inner = [6, 3, 8, 2][variant % 4];
  const lines = Array.from({ length: rays }, (_, i) => {
    const a = (i / rays) * Math.PI * 2;
    const outer = i % 2 && variant !== 2 ? 15 : 20;
    return <line key={i} x1={24 + Math.cos(a) * inner} y1={24 + Math.sin(a) * inner} x2={24 + Math.cos(a) * outer} y2={24 + Math.sin(a) * outer}/>;
  });
  return <span className="burst" aria-hidden="true">
    <svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="currentColor" strokeWidth={variant === 2 ? 3 : 1.5} strokeLinecap="round">
      {lines}<circle cx="24" cy="24" r="2" fill="currentColor" stroke="none"/>
    </svg>
  </span>;
}
