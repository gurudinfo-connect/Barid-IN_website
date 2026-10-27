/* Scroll-driven animation helpers: reveal-on-scroll and parallax variables. */
const REVEAL = [
  ['.head', 'up'], ['.strip-grid > div', 'up'],
  ['.tabs', 'up'], ['.tabpanel > div:first-child', 'left'], ['.tabpanel > .frame', 'zoom'],
  ['.item', 'up'], ['.fgroup', 'line'], ['.fgroup > div:first-child', 'left'], ['.fitems article', 'up'],
  ['.steps li', 'up'], ['#how .route', 'up'], ['#how .center', 'up'],
  ['.gallery figure', 'zoom'], ['.vcard', 'up'], ['.demo-more', 'up'], ['.dark .center', 'up'],
  ['.faq-wrap > h2', 'left'], ['.faq', 'up'], ['.cta-card', 'zoom'],
  ['.contact-grid > div', 'left'], ['.contact-grid > form', 'up'],
  ['.player', 'up'], ['.live-box', 'up'], ['.prose > *', 'up'], ['.demo-bar > *', 'up'], ['.note', 'up'],
];
const SEL = REVEAL.map((r) => r[0]).join(',');
const KIND = (el) => { for (const [s, k] of REVEAL) if (el.matches(s)) return k; return 'up'; };

export function startAnimations(root = document.getElementById('root')) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window) || !root) return () => {};
  document.documentElement.classList.add('js-anim');

  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in'); io.unobserve(e.target);
  }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

  const seen = new WeakSet(), counts = new WeakMap();
  const scan = () => {
    root.querySelectorAll(SEL).forEach((el) => {
      if (seen.has(el)) return; seen.add(el);
      const p = el.parentElement, n = counts.get(p) || 0; counts.set(p, n + 1);
      el.classList.add('rv', 'rv-' + KIND(el));
      el.style.setProperty('--d', Math.min(n, 6) * 80 + 'ms');
      io.observe(el);
    });
  };
  let queued = false;
  const mo = new MutationObserver(() => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; scan(); }); });
  mo.observe(root, { childList: true, subtree: true });
  scan();

  /* parallax variable for the hero background */
  let raf = 0;
  const onScroll = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; document.documentElement.style.setProperty('--sy', Math.min(window.scrollY, 1400)); }); };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  return () => { io.disconnect(); mo.disconnect(); removeEventListener('scroll', onScroll); };
}
