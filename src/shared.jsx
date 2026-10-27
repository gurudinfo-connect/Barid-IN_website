import { createContext, useContext, useEffect, useRef, useState } from 'react';

export const Site = createContext({ config: {}, info: {}, session: null, ready: false, openDemo() {} });
export const useSite = () => useContext(Site);

export const Icon = ({ n }) => (
  <svg className="ic" aria-hidden="true"><use href={`/img/icons.svg#${n}`} /></svg>
);

/* ---------- tiny History-API router ---------- */
export function navigate(to, replace) {
  const u = new URL(to, location.origin);
  history[replace ? 'replaceState' : 'pushState'](null, '', u.pathname + u.search + u.hash);
  window.dispatchEvent(new Event('navigate'));
}
export function useLocation() {
  const read = () => location.pathname + location.search + location.hash;
  const [loc, setLoc] = useState(read);
  useEffect(() => {
    const f = () => setLoc(read());
    addEventListener('popstate', f); addEventListener('navigate', f);
    return () => { removeEventListener('popstate', f); removeEventListener('navigate', f); };
  }, []);
  const path = loc.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  return [path, loc];
}
export function Link({ to, children, ...p }) {
  const go = (e) => {
    p.onClick?.(e);
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || p.target) return;
    e.preventDefault(); navigate(to);
  };
  return <a href={to} {...p} onClick={go}>{children}</a>;
}

/* ---------- modal built on <dialog> ---------- */
export function Modal({ open, onClose, label, className, children }) {
  const r = useRef(null);
  useEffect(() => {
    const d = r.current;
    if (open && !d.open) d.showModal(); else if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={r} className={className} aria-label={label} onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      {open && children}
    </dialog>
  );
}

/* ---------- forms ---------- */
export const EMAIL = /^[^\s@<>()[\]\\,;:]+@[^\s@<>()[\]\\,;:]+\.[A-Za-z]{2,}$/;
async function post(url, data) {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(data) });
    let body = {}; try { body = await r.json(); } catch { /* no body */ }
    return { ok: r.ok, body };
  } catch { return { ok: false, body: { error: 'Network problem. Please check your connection and try again.' } }; }
}
export function useForm({ url, check, done, success }) {
  const [errs, setErrs] = useState({});
  const [msg, setMsg] = useState({ t: '', k: '' });
  const [wait, setWait] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget, f = new FormData(form);
    const data = { ...Object.fromEntries(f), consent: f.has('consent') };
    const focusFirst = () => setTimeout(() => form.querySelector('[aria-invalid="true"]')?.focus(), 0);
    const er = check(data); setErrs(er); setMsg({ t: '', k: '' });
    if (Object.keys(er).length) return focusFirst();
    setWait(true); const r = await post(url, data); setWait(false);
    if (r.ok && r.body.ok) { setMsg({ t: success, k: 'ok' }); done(r.body, form); return; }
    setErrs(r.body.fields || {}); setMsg({ t: r.body.error || 'Something went wrong. Please try again.', k: 'bad' }); focusFirst();
  };
  return { errs, msg, wait, submit };
}
export function Field({ id, label, err, opt, tag: Tag = 'input', children, ...p }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}{opt && <span className="opt"> (optional)</span>}</label>
      <Tag id={id} aria-invalid={err ? 'true' : undefined} {...p}>{children}</Tag>
      <p className="err" role="alert">{err}</p>
    </div>
  );
}
export const Honeypot = () => (
  <div className="hp" aria-hidden="true"><label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label></div>
);
export const minLen = (v, n) => String(v || '').trim().length >= n;

export function DemoDialog({ open, onClose }) {
  const { config } = useSite();
  const f = useForm({
    url: '/api/demo/register', success: 'Thank you. Opening the demo…', done: (b) => { location.href = b.redirect || '/'; },
    check: (d) => {
      const e = {};
      if (!minLen(d.name, 2)) e.name = 'Please enter your name.';
      if (!EMAIL.test(String(d.email).trim())) e.email = 'Please enter a valid email address.';
      if (!minLen(d.organization, 2)) e.organization = 'Please enter your organisation.';
      if (!d.consent) e.consent = 'Please confirm you agree to be contacted about Barid-IN.';
      return e;
    },
  });
  const { errs } = f;
  return (
    <Modal open={open} onClose={onClose} label="Try the Barid-IN demo" className="dlg">
      <button className="dlg-x" aria-label="Close" onClick={onClose}><Icon n="i-x" /></button>
      <div className="dlg-body">
        <h2>Try the Barid-IN demo</h2>
        <p className="muted">Tell us who you are and we will {config.liveDemoConfigured ? 'open the live Barid-IN application' : 'open the hands-on product experience'} straight away. We save your details so our team can follow up.</p>
        <form className="form" noValidate onSubmit={f.submit}>
          <Field id="d-name" name="name" label="Full name" autoComplete="name" maxLength={80} err={errs.name} />
          <Field id="d-email" name="email" type="email" label="Work email" autoComplete="email" maxLength={254} err={errs.email} />
          <Field id="d-org" name="organization" label="Organisation" autoComplete="organization" maxLength={120} err={errs.organization} />
          <div className="row2">
            <Field id="d-role" label="Your role" opt tag="select" name="role" defaultValue="">
              <option value="">Select</option><option>IT / support</option><option>HR</option><option>Operations</option><option>Management</option><option>Other</option>
            </Field>
            <Field id="d-int" label="I am interested in" opt tag="select" name="interest" defaultValue="">
              <option value="">Select</option><option>IT helpdesk</option><option>HR requests</option><option>Incident tracking</option><option>Just looking</option>
            </Field>
          </div>
          <Honeypot />
          <label className="check"><input type="checkbox" name="consent" aria-invalid={errs.consent ? 'true' : undefined} />
            <span>I agree that Barid-IN may store these details and contact me about the product. See the <Link to="/privacy" onClick={onClose}>privacy policy</Link>.</span></label>
          <p className="err" role="alert">{errs.consent}</p>
          <p className={'form-status ' + f.msg.k} role="status" aria-live="polite">{f.msg.t}</p>
          <button className="btn btn-primary btn-block" type="submit" disabled={f.wait}>{f.wait ? 'Unlocking…' : 'Unlock the demo'}</button>
        </form>
      </div>
    </Modal>
  );
}

/* ---------- page chrome ---------- */
/* logo click: go home; if already on the home page, glide back to the top */
const toHome = (e) => {
  if (location.pathname === '/') {
    e.preventDefault();
    if (location.hash || location.search) history.replaceState(null, '', '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

const NAV = [['Product', 'product'], ['Features', 'features'], ['Solutions', 'solutions'], ['How It Works', 'how'], ['Product Demo', 'demo'], ['Security', 'security'], ['Contact', 'contact']];

function useActive(path) {
  const [a, setA] = useState('');
  useEffect(() => {
    const els = NAV.map((n) => document.getElementById(n[1])).filter(Boolean);
    setA('');
    if (!els.length || !('IntersectionObserver' in window)) return;
    const live = new Set();
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => (e.isIntersecting ? live.add(e.target.id) : live.delete(e.target.id)));
      setA([...NAV].reverse().map((n) => n[1]).find((id) => live.has(id)) || '');
    }, { rootMargin: '-45% 0px -50% 0px' });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [path]);
  return a;
}

export function Header({ path }) {
  const { config, openDemo } = useSite();
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [dark, setDark] = useState(false);
  const active = useActive(path);
  const hdr = useRef(null), links = useRef(null), ind = useRef(null);
  const target = hover || active;

  useEffect(() => {
    const k = (e) => e.key === 'Escape' && setOpen(false);
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  }, []);

  /* shrink on scroll, scroll-progress line, switch to dark glass over dark sections */
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = 0;
      const y = window.scrollY, max = document.documentElement.scrollHeight - innerHeight;
      setScrolled(y > 24);
      hdr.current?.style.setProperty('--p', max > 0 ? Math.min(1, y / max).toFixed(4) : 0);
      const probe = 44;
      setDark([...document.querySelectorAll('.dark,.demo-hero')].some((el) => { const r = el.getBoundingClientRect(); return r.top <= probe && r.bottom >= probe; }));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick(); addEventListener('scroll', on, { passive: true }); addEventListener('resize', on);
    const t = setTimeout(tick, 400);
    return () => { removeEventListener('scroll', on); removeEventListener('resize', on); cancelAnimationFrame(raf); clearTimeout(t); };
  }, [path]);

  /* slide the "ticket tab" under the hovered / active link */
  useEffect(() => {
    const box = links.current, el = ind.current;
    if (!box || !el) return;
    const place = () => {
      const a = target && box.querySelector(`[data-id="${target}"]`);
      if (!a) { el.style.opacity = 0; return; }
      const first = !el.dataset.ready;
      if (first) el.style.transition = 'none';
      el.style.opacity = 1;
      el.style.width = a.offsetWidth + 'px';
      el.style.transform = `translate(${a.offsetLeft}px,-50%)`;
      if (first) { el.getBoundingClientRect(); el.style.transition = ''; el.dataset.ready = '1'; }
    };
    place(); addEventListener('resize', place);
    return () => removeEventListener('resize', place);
  }, [target, open]);

  return (
    <header ref={hdr} className={'site-header' + (scrolled ? ' scrolled' : '') + (dark ? ' on-dark' : '') + (open ? ' menu-open' : '')}>
      <a className="skip" href="#main">Skip to content</a>
      <div className="nav-pill">
        <div className="nav">
          <Link to="/" className="brand" aria-label="Barid-IN home" onClick={toHome}><img src="/img/barid-logo-nav.png" alt="Barid-IN" width="175" height="62" /></Link>
          <button className="nav-toggle" aria-expanded={open} aria-controls="siteNav" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(!open)}><Icon n={open ? 'i-x' : 'i-menu'} /></button>
          <nav id="siteNav" className={'site-nav' + (open ? ' open' : '')} aria-label="Primary" onClick={(e) => e.target.closest('a,button') && setOpen(false)}>
            <div className="nav-links" ref={links} onMouseLeave={() => setHover('')}>
              <span className="nav-ind" ref={ind} aria-hidden="true" />
              {NAV.map(([t, id], i) => (
                <Link key={id} to={'/#' + id} data-id={id} style={{ '--i': i }}
                  className={(active === id ? 'active' : '') + (target === id ? ' on' : '')}
                  onMouseEnter={() => setHover(id)} onFocus={() => setHover(id)} onBlur={() => setHover('')}>{t}</Link>
              ))}
            </div>
            <div className="nav-cta">
              {config.appUrl
                ? <a className="signin" href={config.appUrl} target="_blank" rel="noopener">Sign In</a>
                : <Link className="signin" to="/#contact">Sign In</Link>}
              <button className="btn-ticket" onClick={openDemo}><span className="live-dot" aria-hidden="true" /><span>Try Live Demo</span><Icon n="i-arrow" /></button>
            </div>
          </nav>
        </div>
        <i className="nav-prog" aria-hidden="true" />
      </div>
    </header>
  );
}

export function Footer() {
  const { openDemo } = useSite();
  return (
    <footer className="site-footer">
      <div className="wrap foot-grid">
        <div>
          <Link to="/" className="foot-logo" aria-label="Barid-IN home" onClick={toHome}><img src="/img/barid-logo-nav.png" alt="Barid-IN" width="181" height="64" /></Link>
          <p>All your tickets, in one place. A role-based helpdesk for IT support, HR requests and internal service teams.</p>
        </div>
        <nav aria-label="Footer product"><h4>Product</h4><Link to="/#features">Features</Link><Link to="/#solutions">Solutions</Link><Link to="/#how">How It Works</Link><Link to="/#security">Security</Link></nav>
        <nav aria-label="Footer demo"><h4>Demo</h4><button className="linkish" onClick={openDemo}>Try Live Demo</button><Link to="/#demo">Product videos</Link><Link to="/#screens">Screenshots</Link></nav>
        <nav aria-label="Footer legal"><h4>Company</h4><Link to="/#contact">Contact</Link><Link to="/privacy">Privacy policy</Link><Link to="/terms">Terms of service</Link></nav>
      </div>
      <div className="wrap foot-bottom"><p>© {new Date().getFullYear()} Barid-IN. All rights reserved.</p></div>
    </footer>
  );
}
