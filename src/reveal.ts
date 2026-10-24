// Content rises into place as it scrolls into view. Off when the browser asks for reduced motion.
const SELECTOR = '.dark-offer > *, .do-cards article, .dark-why > *, .dark-why li, .tabs, .section-head, .holdings, .verdict, .callout, .notice, .lh-band, .block, .run, .approval, .detail, .metrics > div, .holding, .service, .chain li, .payoff, .rail > *, .events li, .studio, .news, .bridge, .decision-workbench > *, .case-list li';

export function startReveal() {
  if (typeof IntersectionObserver === 'undefined' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const seen = new WeakSet<Element>();
  const io = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  const scan = () => document.querySelectorAll(SELECTOR).forEach(el => {
    if (seen.has(el)) return;
    seen.add(el);
    el.classList.add('reveal');
    const index = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
    (el as HTMLElement).style.transitionDelay = `${Math.min(index, 6) * 70}ms`;
    io.observe(el);
  });
  scan();
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
}
