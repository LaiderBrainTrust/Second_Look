import type { Page } from './Header';

function Mark() {
  return <span className="footer-mark" aria-hidden="true"/>;
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
