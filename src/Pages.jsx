import { useEffect, useState } from 'react';
import c from './content.js';
import { Link, navigate, useSite } from './shared.jsx';

const lock = (v) => { if (v) { v.disablePictureInPicture = true; v.setAttribute('controlsList', 'nodownload noremoteplayback'); } };

function Player({ file, title, desc, tracks = [] }) {
  const [err, setErr] = useState('');
  const fail = (e) => setErr(e.currentTarget.error?.code === 4
    ? 'This video could not be loaded. Your demo session may have expired. Please reload the page.'
    : 'The video stopped unexpectedly. Please reload the page.');
  return (
    <article className="player">
      <video ref={lock} controls preload="metadata" playsInline aria-label={title} poster={`/img/poster-${file.replace('.mp4', '')}.jpg`}
        src={'/media/' + file} onContextMenu={(e) => e.preventDefault()} onError={fail}>
        {tracks.map(([f, kind, label]) => <track key={f} src={'/media/' + f} kind={kind} label={label} srcLang="en" />)}
      </video>
      {err && <p className="fallback">{err}</p>}
      <div className="meta"><h3>{title}</h3><p>{desc}</p></div>
    </article>
  );
}

export function DemoPage() {
  const { session, ready, info } = useSite();
  const active = !!session?.active;
  useEffect(() => {
    if (!ready) return;
    const back = () => navigate('/?demo=required#demo', true);
    if (!active) return back();
    const t = setTimeout(back, Math.max(1000, session.expiresAt - Date.now()));
    return () => clearTimeout(t);
  }, [ready, active]);
  if (!active) return <main id="main" className="section"><div className="wrap"><p>Loading your demo…</p></div></main>;

  const mins = Math.max(1, Math.round((session.expiresAt - Date.now()) / 60000));
  const lab = (k) => (info[k] ? ` (${info[k].label})` : '');
  const end = async () => { await fetch('/api/demo/logout', { method: 'POST' }).catch(() => {}); location.href = '/'; };
  return (
    <main id="main">
      <section className="demo-hero"><div className="wrap demo-bar">
        <div>
          <h1>Welcome, {session.name}</h1>
          <p>Your demo session stays open for about {mins >= 120 ? Math.round(mins / 60) + ' hours' : mins + ' minutes'}.</p>
        </div>
        <div className="demo-actions">
          <Link className="btn btn-ghost btn-sm" to="/">Back to website</Link>
          <button className="btn btn-primary btn-sm" onClick={end}>End demo session</button>
        </div>
      </div></section>
      <section className="section">
        <div className="wrap">
          <div className="head"><h2>Two ways to see Barid-IN</h2><p>Watch the short overview first, then follow the guided walkthrough step by step.</p></div>
          <div className="player-grid">
            <Player file="overview.mp4" title={'Product overview' + lab('overview')} desc="A captioned tour of the real application." tracks={[['captions-overview.vtt', 'captions', 'English']]} />
            <Player file="walkthrough.mp4" title={'Guided walkthrough' + lab('walkthrough')} desc="Step-by-step with chapters. Use the chapters menu in the player to jump between steps."
              tracks={[['captions-walkthrough-steps.vtt', 'captions', 'English'], ['captions-walkthrough.vtt', 'chapters', 'Chapters']]} />
          </div>
        </div>
      </section>
      <section className="section tint">
        <div className="wrap">
          <div className="head"><h2>Go deeper, one area at a time</h2></div>
          <div className="clip-grid">
            {c.clips.map((x) => <Player key={x.file} file={x.file} title={x.title + lab(x.file.replace('.mp4', ''))} desc={x.desc} />)}
          </div>
        </div>
      </section>
      <section className="section">
        <div className="wrap">
          <div className="live-box">
            <div>
              <h3>Live application demo</h3>
              <p>{session.liveDemoUrl ? 'Open the real Barid-IN application in a separate, restricted demo workspace filled with sample data.' : 'The interactive sandbox is not open yet. The guided videos above show the real application end to end.'}</p>
            </div>
            {session.liveDemoUrl && <a className="btn btn-primary btn-lg" href={session.liveDemoUrl} target="_blank" rel="noopener">Launch demo</a>}
          </div>
          <p className="note">These recordings use fictional sample data. They are provided for evaluation only and are not available for download.</p>
        </div>
      </section>
    </main>
  );
}

export function Legal({ page }) {
  const p = c.legal[page];
  return (
    <main id="main" className="section"><div className="wrap prose">
      <h1>{p.title}</h1>
      <p className="note-box">{p.note}</p>
      {p.blocks.map(([h, t]) => <section key={h}><h2>{h}</h2><p>{t}</p></section>)}
    </div></main>
  );
}

export const NotFound = () => (
  <main id="main" className="section"><div className="wrap prose center">
    <h1>Page not found</h1><p>The page you are looking for does not exist.</p>
    <Link className="btn btn-primary" to="/">Go to the Barid-IN website</Link>
  </div></main>
);
