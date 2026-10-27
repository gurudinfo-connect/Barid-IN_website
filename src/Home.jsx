import { Fragment, useEffect, useRef, useState } from 'react';
import c from './content.js';
import { Icon, Link, Modal, Field, Honeypot, useForm, useSite, EMAIL, minLen } from './shared.jsx';

const Head = ({ t, p }) => <div className="head"><h2>{t}</h2>{p && <p>{p}</p>}</div>;

/* ---------- hero: a sample ticket you can step through ---------- */
const FLOW = [
  ['Employee', 'raised this from the incident form. It is waiting for review.', 'Review ticket'],
  ['Staff', 'reviewed it and now choose who should handle it.', 'Assign to Ravi'],
  ['Ravi', 'sees a banner to accept or decline the ticket.', 'Accept ticket'],
  ['Ravi', 'posted a progress update: 60% complete.', 'Set pending'],
  ['Ravi', 'is waiting for a replacement battery.', 'Mark resolved'],
  ['Asha', 'confirms the fix and closes the ticket, or reopens it.', 'Close ticket'],
  ['Everyone', 'can see every change in the ticket history.', ''],
];
const START = 2 * 3600 + 48 * 60;
const fmt = (s) => [Math.floor(s / 3600), String(Math.floor((s % 3600) / 60)).padStart(2, '0'), String(s % 60).padStart(2, '0')].join(':');

const Route = ({ cur }) => (
  <ol className="route" aria-label="Ticket status flow">
    {c.statuses.map((s, k) => (
      <li key={s} style={{ '--i': k }} className={cur == null || k < cur ? 'done' : k === cur ? 'now' : ''} aria-current={k === cur ? 'step' : undefined}>
        <span className="dot" /><span className="lbl">{s}</span>
      </li>
    ))}
  </ol>
);

function Ticket() {
  const [i, setI] = useState(0), [left, setLeft] = useState(START);
  const running = i < 5;
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => clearInterval(t);
  }, [running]);
  const [who, note, btn] = FLOW[i];
  const wrap = useRef(null);
  const tilt = (e) => {
    const el = wrap.current; if (!el || e.pointerType === 'touch') return;
    const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--ry', ((x - .5) * 9).toFixed(2) + 'deg');
    el.style.setProperty('--rx', ((.5 - y) * 7).toFixed(2) + 'deg');
    el.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
    el.style.setProperty('--my', (y * 100).toFixed(1) + '%');
  };
  const flat = () => { const el = wrap.current; if (!el) return; ['--rx', '--ry'].forEach((k) => el.style.setProperty(k, '0deg')); };
  return (
    <div className="ticket-3d" ref={wrap} onPointerMove={tilt} onPointerLeave={flat}>
    <div className="ticket" data-s={i}>
      <span className="glare" aria-hidden="true" />
      <div className="t-main">
        <div className="t-top"><span>Sample ticket</span><b>BI-T16ID24</b></div>
        <p className="t-title">Laptop will not boot</p>
        <dl className="t-meta">
          <div><dt>Requester</dt><dd>Asha, Finance</dd></div>
          <div><dt>Category</dt><dd>Hardware</dd></div>
          <div><dt>Priority</dt><dd>High</dd></div>
        </dl>
        <Route cur={i} />
        <div className="t-act">
          <p aria-live="polite"><b>{who}</b> {note}</p>
          {btn
            ? <button className="btn btn-primary btn-sm" onClick={() => setI(i + 1)}>{btn}</button>
            : <button className="btn btn-ghost btn-sm" onClick={() => { setI(0); setLeft(START); }}>Start over</button>}
        </div>
      </div>
      <div className="t-stub">
        <span>Status</span><b className="st" key={i}>{c.statuses[i]}</b>
        <span>{running ? 'Left to resolve' : 'Resolution target'}</span><b className="sla">{running ? fmt(left) : 'Met'}</b>
      </div>
      {i === 6 && <div className="stamp" aria-hidden="true"><span>Closed</span><small>BI-T16ID24</small></div>}
    </div>
    </div>
  );
}

const H1 = 'Simplify IT support. Manage every ticket. Empower every team.';
const HeroBg = () => (
  <div className="hero-bg" aria-hidden="true">
    <i className="blob b1" /><i className="blob b2" /><i className="blob b3" />
    <span className="mini m1"><b>BI-T04ID11</b>Assigned</span>
    <span className="mini m2"><b>SLA</b>01:12:30</span>
    <span className="mini m3"><b>BI-T22ID02</b>In progress</span>
    <span className="mini m4"><b>Resolved</b>✓</span>
  </div>
);

function Hero() {
  const { openDemo } = useSite();
  return (
    <section className="hero">
      <HeroBg />
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <h1 aria-label={H1}>{H1.split(' ').map((w, k) => <Fragment key={k}><span className="w" aria-hidden="true" style={{ '--w': k }}><span>{w}</span></span>{' '}</Fragment>)}</h1>
          <p className="lead">Bring incidents, employee requests, SLA tracking, projects and team chat together in one organised ticketing platform.</p>
          <div className="cta-row">
            <Link className="btn btn-primary btn-lg" to="/#product">Explore the product</Link>
            <button className="btn btn-ghost btn-lg" onClick={openDemo}>Try live demo <Icon n="i-arrow" /></button>
          </div>
          <ul className="ticks">
            <li><Icon n="i-check" />Nothing to install or buy to look around</li>
            <li><Icon n="i-check" />Open the real application after a 20-second registration</li>
          </ul>
        </div>
        <Ticket />
      </div>
    </section>
  );
}

function Count({ to }) {
  const [v, setV] = useState(to), ref = useRef(null);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    setV(0);
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return; io.disconnect();
      const t0 = performance.now(), dur = 1100;
      const step = (t) => { const p = Math.min(1, (t - t0) / dur); setV(Math.round(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(step); };
      raf = requestAnimationFrame(step);
    }, { threshold: .6 });
    io.observe(ref.current);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to]);
  return <span ref={ref} className="count">{v}</span>;
}

const Strip = () => (
  <section className="strip" aria-label="At a glance">
    <div className="wrap strip-grid">
      <div><strong><Count to={3} /> roles</strong><span>Admin, HR and Employee, enforced on the server</span></div>
      <div><strong><Count to={7} /> statuses</strong><span>{c.statuses.join(', ')}</span></div>
      <div><strong>SLA clocks</strong><span>First-response and resolution targets by priority</span></div>
      <div><strong>One workspace</strong><span>Tickets, tasks, projects, requests and chat</span></div>
    </div>
  </section>
);

/* ---------- product tabs ---------- */
function Product() {
  const { openDemo } = useSite();
  const [k, setK] = useState(0), refs = useRef([]), t = c.tabs[k];
  const key = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const n = (k + (e.key === 'ArrowRight' ? 1 : c.tabs.length - 1)) % c.tabs.length;
    setK(n); refs.current[n]?.focus();
  };
  return (
    <section className="section" id="product">
      <div className="wrap">
        <Head t={c.heads.product[0]} p={c.heads.product[1]} />
        <div className="tabs" role="tablist" aria-label="Product areas" onKeyDown={key}>
          {c.tabs.map((x, i) => (
            <button key={x.label} ref={(el) => (refs.current[i] = el)} role="tab" id={'tab' + i} aria-selected={i === k} aria-controls="tabPanel" tabIndex={i === k ? 0 : -1} onClick={() => setK(i)}>{x.label}</button>
          ))}
        </div>
        <div className="tabpanel" key={k} id="tabPanel" role="tabpanel" aria-labelledby={'tab' + k}>
          <div>
            <h3>{t.title}</h3><p>{t.text}</p>
            <ul className="checks">{t.list.map((l) => <li key={l}><Icon n="i-check" />{l}</li>)}</ul>
            <button className="btn btn-primary" onClick={openDemo}>Try it yourself <Icon n="i-arrow" /></button>
          </div>
          <div className="frame"><img src={`/img/${t.img}.webp`} alt={`Barid-IN ${t.label.toLowerCase()} screen`} width="1600" height="832" /></div>
        </div>
      </div>
    </section>
  );
}

const Roles = () => (
  <section className="section tint" id="roles">
    <div className="wrap">
      <Head t={c.heads.roles[0]} p={c.heads.roles[1]} />
      <div className="cols cols-3">
        {c.roles.map((r) => <article className="item" key={r.title}><Icon n={r.icon} /><h3>{r.title}</h3><p>{r.text}</p></article>)}
      </div>
    </div>
  </section>
);

const GROUPS = [
  ['Handle tickets', 'Raise, route and resolve.', [0, 1, 2, 3]],
  ['Plan and collaborate', 'Work, leave and conversation in one place.', [5, 6, 7, 8]],
  ['Stay informed and in control', 'See what happens and who changed it.', [4, 9, 10, 11]],
];
const Features = () => (
  <section className="section" id="features">
    <div className="wrap">
      <Head t={c.heads.features[0]} p={c.heads.features[1]} />
      {GROUPS.map(([title, intro, ids]) => (
        <div className="fgroup" key={title}>
          <div><h3>{title}</h3><p className="muted">{intro}</p></div>
          <div className="fitems">
            {ids.map((n) => { const f = c.features[n]; return (
              <article key={f.title}><Icon n={f.icon} /><h4>{f.title}</h4><p>{f.text}</p><p className="use">{f.use}</p></article>
            ); })}
          </div>
        </div>
      ))}
    </div>
  </section>
);

const Solutions = () => (
  <section className="section" id="solutions">
    <div className="wrap">
      <Head t={c.heads.solutions[0]} p={c.heads.solutions[1]} />
      <div className="cols cols-4">{c.solutions.map((s) => <article className="item" key={s.title}><h3>{s.title}</h3><p>{s.text}</p></article>)}</div>
      <p className="note">{c.solutionsNote}</p>
    </div>
  </section>
);

const How = () => {
  const { openDemo } = useSite();
  return (
    <section className="section tint" id="how">
      <div className="wrap">
        <Head t="From request to resolution" />
        <ol className="steps">
          {c.steps.map((s, k) => <li key={s.title}><span className="num">{k + 1}</span><h3>{s.title}</h3><p>{s.text}</p></li>)}
        </ol>
        <Route />
        <div className="center"><button className="btn btn-primary" onClick={openDemo}>Watch the guided walkthrough <Icon n="i-arrow" /></button></div>
      </div>
    </section>
  );
};

/* ---------- screenshots + lightbox ---------- */
function Gallery() {
  const [n, setN] = useState(null), g = c.gallery, open = n !== null;
  useEffect(() => {
    if (!open) return;
    const k = (e) => { if (e.key === 'ArrowRight') setN((x) => (x + 1) % g.length); if (e.key === 'ArrowLeft') setN((x) => (x + g.length - 1) % g.length); };
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  }, [open]);
  const s = g[n ?? 0];
  return (
    <section className="section" id="screens">
      <div className="wrap">
        <Head t={c.heads.screens[0]} p={c.heads.screens[1]} />
        <div className="gallery">
          {g.map((x, i) => (
            <figure key={x.src}>
              <button className="zoomable" onClick={() => setN(i)} aria-label={`Enlarge: ${x.label}`}><img loading="lazy" src={x.src} alt={x.alt} width="1600" height="832" /></button>
              <figcaption>{x.label}</figcaption>
            </figure>
          ))}
        </div>
      </div>
      <Modal open={open} onClose={() => setN(null)} label="Screenshot viewer" className="lightbox">
        <button className="dlg-x" aria-label="Close" onClick={() => setN(null)}><Icon n="i-x" /></button>
        <img src={s.src} alt={s.alt} />
        <div className="lb-bar">
          <button className="btn btn-ghost btn-sm" onClick={() => setN((n + g.length - 1) % g.length)}>Previous</button>
          <p>{s.caption}</p>
          <button className="btn btn-ghost btn-sm" onClick={() => setN((n + 1) % g.length)}>Next</button>
        </div>
      </Modal>
    </section>
  );
}

/* ---------- demo videos ---------- */
const VIDEOS = [
  ['overview', 'Product overview', 'A short captioned tour: sign in, dashboard, boards, filters, workspace and the ticket lifecycle.'],
  ['walkthrough', 'Guided walkthrough', 'A step-by-step tutorial with chapters: raise a ticket, assign it, accept it and update progress.'],
];
function Demo() {
  const { openDemo, session, info } = useSite(), on = !!session?.active;
  return (
    <section className="section dark" id="demo">
      <div className="wrap">
        <Head t="Watch Barid-IN in action" p="Two different films, both recorded from the real application. Register once to watch them." />
        <div className="video-cards">
          {VIDEOS.map(([key, title, text]) => {
            const inner = (<>
              <img loading="lazy" src={`/img/poster-${key}.jpg`} alt="" width="1280" height="720" />
              <span className="play"><Icon n="i-play" /></span>
              <span className="badge"><Icon n={on ? 'i-play' : 'i-lock'} />{info[key]?.label || title}</span>
            </>);
            return (
              <article className="vcard" key={key}>
                {on ? <Link className="vthumb" to="/demo" aria-label={`Watch the ${title.toLowerCase()}`}>{inner}</Link>
                  : <button className="vthumb" onClick={openDemo} aria-label={`Unlock the ${title.toLowerCase()} video`}>{inner}</button>}
                <h3>{title}</h3><p>{text}</p>
              </article>
            );
          })}
        </div>
        <p className="demo-more">Also included after registration: short clips on ticket raising, the menu and service catalogue, leave requests, visual task boards, projects and people.</p>
        <div className="center"><button className="btn btn-primary btn-lg" onClick={openDemo}>Try live demo</button></div>
      </div>
    </section>
  );
}

const Security = () => (
  <section className="section" id="security">
    <div className="wrap">
      <Head t="Safeguards that are actually implemented" p={c.securityIntro} />
      <div className="cols cols-3">
        {c.security.map((s) => <article className="item" key={s.title}><Icon n={s.icon} /><h3>{s.title}</h3><p>{s.text}</p></article>)}
      </div>
    </div>
  </section>
);

const Faq = () => (
  <section className="section" id="faq">
    <div className="wrap faq-wrap">
      <h2>Quick answers</h2>
      <div>{c.faq.map((f) => <details className="faq" key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}</div>
    </div>
  </section>
);

const CtaBand = () => {
  const { openDemo } = useSite();
  return (
    <section className="cta-band">
      <div className="wrap"><div className="cta-card">
        <h2>See it for yourself in under a minute</h2>
        <p>Enter your details and open the real Barid-IN application.</p>
        <button className="btn btn-primary btn-lg" onClick={openDemo}>Try live demo <Icon n="i-arrow" /></button>
      </div></div>
    </section>
  );
};

function Contact() {
  const { config } = useSite();
  const f = useForm({
    url: '/api/contact', success: 'Thank you. Your message has been received.', done: (_, form) => form.reset(),
    check: (d) => {
      const e = {};
      if (!minLen(d.name, 2)) e.name = 'Please enter your name.';
      if (!EMAIL.test(String(d.email).trim())) e.email = 'Please enter a valid email address.';
      if (!minLen(d.message, 10)) e.message = 'Please write at least a short message (10+ characters).';
      return e;
    },
  });
  const { errs } = f;
  return (
    <section className="section tint" id="contact">
      <div className="wrap contact-grid">
        <div>
          <h2>Talk to us about Barid-IN</h2>
          <p>Tell us about your team and what you would like to see. Pricing has not been published yet, so the best way to ask is to send a message or request a demo.</p>
          {config.contactEmail && <p className="muted">Email: {config.contactEmail}</p>}
        </div>
        <form className="form" noValidate onSubmit={f.submit}>
          <Field id="c-name" name="name" label="Name" autoComplete="name" maxLength={80} err={errs.name} />
          <Field id="c-email" name="email" type="email" label="Work email" autoComplete="email" maxLength={254} err={errs.email} />
          <Field id="c-org" name="organization" label="Organisation" opt autoComplete="organization" maxLength={120} />
          <Field id="c-msg" name="message" tag="textarea" rows={5} label="Message" maxLength={4000} err={errs.message} />
          <Honeypot />
          <p className={'form-status ' + f.msg.k} role="status" aria-live="polite">{f.msg.t}</p>
          <button className="btn btn-primary" type="submit" disabled={f.wait}>{f.wait ? 'Sending…' : 'Send message'}</button>
        </form>
      </div>
    </section>
  );
};

export function Home() {
  const { openDemo } = useSite();
  useEffect(() => {
    if (!/[?&]demo=required/.test(location.search)) return;
    history.replaceState(null, '', '/' + location.hash);
    const t = setTimeout(openDemo, 150); return () => clearTimeout(t);
  }, []);
  return (
    <main id="main">
      <Hero /><Strip /><Product /><Roles /><Features /><Solutions /><How /><Gallery /><Demo /><Security /><Faq /><CtaBand /><Contact />
    </main>
  );
}
