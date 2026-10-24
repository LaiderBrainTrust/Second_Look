import type { ReactNode } from 'react';
import { CONSULTATION_URL } from './site';

export type Page = 'home' | 'services';

// Black pill header: name, the two pages that exist, then session controls.
export function Header({ page, onPage, children }: { page: Page; onPage: (page: Page) => void; children?: ReactNode }) {
  return <header className="pill-wrap">
    <div className="pill">
      <button className="pill-brand" onClick={() => onPage('home')}>Second Look</button>
      <nav aria-label="Primary">
        <button className="navlink" aria-current={page === 'home' ? 'page' : undefined} onClick={() => onPage('home')}>Home</button>
        <button className="navlink" aria-current={page === 'services' ? 'page' : undefined} onClick={() => onPage('services')}>Services</button>
      </nav>
      <div className="pill-right">
        {children}
        {CONSULTATION_URL && <a className="pill-cta" href={CONSULTATION_URL} target="_blank" rel="noreferrer">Schedule a consultation</a>}
      </div>
    </div>
  </header>;
}
