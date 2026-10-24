import type { Page } from './Header';

function Mark() {
  // Original mark: scattered strokes around a centre, drawn in SVG.
  const strokes = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2 + (i % 3) * 0.12;
    const r1 = 14 + (i % 2) * 6, r2 = r1 + 9 + (i % 3) * 3;
    return <line key={i} x1={40 + Math.cos(a) * r1} y1={40 + Math.sin(a) * r1} x2={40 + Math.cos(a) * r2} y2={40 + Math.sin(a) * r2}/>;
  });
  return <svg className="footer-mark" viewBox="0 0 80 80" width="96" height="96" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" aria-hidden="true">{strokes}</svg>;
}

export function Footer({ onPage }: { onPage: (page: Page) => void }) {
  const go = (page: Page) => { onPage(page); window.scrollTo({ top: 0 }); };
  return <footer className="site-footer">
    <div className="sf-brand">
      <Mark/>
      <p className="sf-name">Second<br/>Look</p>
    </div>
    <div className="sf-row">
      <div><p className="sf-label">Pages</p><button onClick={() => go('home')}>Home</button><button onClick={() => go('services')}>Services</button></div>
      <div><p className="sf-label">Built for</p><p>Deal Flow 2026</p><p>Track 4, Funds</p><p>Betaworks, New York</p></div>
      <div><p className="sf-label">Evidence and review</p><p>Steam, Akta</p><p>Roundtable, Nicrron, PRISM</p></div>
      <div className="sf-end"><p>&copy; 2026 Second Look</p></div>
    </div>
  </footer>;
}
