import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { Site, Header, Footer, DemoDialog, useLocation, navigate } from './shared.jsx';
import { Home } from './Home.jsx';
import { DemoPage, Legal, NotFound } from './Pages.jsx';
import { startAnimations } from './anim.js';

const TITLES = {
  '/': 'Barid-IN Ticketing Tool | IT helpdesk and employee request management',
  '/privacy': 'Privacy policy | Barid-IN',
  '/terms': 'Terms of service | Barid-IN',
  '/demo': 'Barid-IN Demo videos',
};
const getJson = (u) => fetch(u, { credentials: 'same-origin' }).then((r) => r.json()).catch(() => null);

export function App() {
  const [path, loc] = useLocation();
  const [dlg, setDlg] = useState(false);
  const [site, setSite] = useState({ ready: false, config: {}, session: null, info: {} });

  useEffect(() => {
    Promise.all([getJson('/api/config'), getJson('/api/demo/session'), getJson('/media-info.json')])
      .then(([config, session, info]) => setSite({ ready: true, config: config || {}, session, info: info || {} }));
  }, []);

  useEffect(() => startAnimations(), []);

  const openDemo = () => {
    if (site.session?.active) { const u = site.session.liveDemoUrl; if (u) location.href = u; else navigate('/demo'); }
    else setDlg(true);
  };

  // title, canonical and robots per route; scroll to the hash (or top) after navigation
  useEffect(() => {
    document.title = TITLES[path] || 'Page not found | Barid-IN';
    const can = document.querySelector('link[rel=canonical]');
    if (can) can.href = new URL(can.href).origin + (path === '/' ? '/' : path);
    let r = document.querySelector('meta[name=robots]');
    if (!r) { r = document.createElement('meta'); r.name = 'robots'; document.head.appendChild(r); }
    r.content = TITLES[path] && path !== '/demo' ? 'index, follow' : 'noindex, nofollow';
    const id = location.hash.slice(1);
    requestAnimationFrame(() => (id ? document.getElementById(id)?.scrollIntoView() : window.scrollTo(0, 0)));
  }, [loc]);

  const page = path === '/' ? <Home />
    : path === '/demo' ? <DemoPage />
    : path === '/privacy' || path === '/terms' ? <Legal page={path.slice(1)} />
    : <NotFound />;

  return (
    <Site.Provider value={{ ...site, openDemo }}>
      <Header path={path} />
      {page}
      <Footer />
      <DemoDialog open={dlg} onClose={() => setDlg(false)} />
    </Site.Provider>
  );
}

if (typeof document !== 'undefined' && document.getElementById('root')) createRoot(document.getElementById('root')).render(<App />);
