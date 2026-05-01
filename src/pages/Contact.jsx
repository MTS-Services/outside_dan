import { useRef, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Icon from '../components/Icon';
import api from '../api/client';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const DEFAULT_HOURS = [
  { day: 'Montag',     times: ['12:00 – 14:30', '17:00 – 22:00'], closed: false },
  { day: 'Dienstag',   times: ['12:00 – 14:30', '17:00 – 22:00'], closed: false },
  { day: 'Mittwoch',   times: [], closed: true },
  { day: 'Donnerstag', times: ['12:00 – 14:30', '12:00 – 22:00'], closed: false },
  { day: 'Freitag',    times: ['08:00 – 22:00'], closed: false },
  { day: 'Samstag',    times: ['08:00 – 22:00'], closed: false },
  { day: 'Sonntag',    times: ['12:00 – 22:00'], closed: false },
];

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [contactHero, setContactHero] = useState(null);
  const [siteSettings, setSiteSettings] = useState({});
  const main = useRef(null);

  useEffect(() => {
    api.get('/site-images/contact_hero').then((r) => {
      if (r.data?.url) setContactHero(r.data.url.startsWith('/uploads/') ? `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${r.data.url}` : r.data.url);
    }).catch(() => {});
    api.get('/site-settings').then((r) => setSiteSettings(r.data || {})).catch(() => {});
  }, []);

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  function onSubmit(e) {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      toast.success('Nachricht gesendet! Wir melden uns in Kürze.');
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    }, 1200);
  }

  useGSAP(
    () => {
      gsap.to('.contact-hero-bg', {
        yPercent: 30,
        ease: 'none',
        scrollTrigger: { trigger: '.contact-hero', start: 'top top', end: 'bottom top', scrub: true },
      });
      gsap.from('.contact-hero-anim', { y: 40, opacity: 0, duration: 1, stagger: 0.1, ease: 'power3.out' });

      gsap.from('.info-card', {
        y: 60, opacity: 0, scale: 0.92, stagger: 0.1, duration: 0.7, ease: 'back.out(1.4)',
        scrollTrigger: { trigger: '.info-grid', start: 'top 85%' },
      });

      gsap.utils.toArray('.reveal').forEach((el) => {
        gsap.from(el, {
          y: 60, opacity: 0, duration: 0.9, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 85%' },
        });
      });
    },
    { scope: main }
  );

  return (
    <div ref={main}>
      {/* HERO */}
      <section className="contact-hero relative h-[55vh] flex items-center overflow-hidden">
        {contactHero && (
          <img
            src={contactHero}
            alt="Restaurant contact"
            className="contact-hero-bg absolute inset-0 w-full h-full object-cover object-center will-change-transform"
          />
        )}
        <div className="absolute inset-0 bg-ink-900/80" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center w-full">
          <span className="contact-hero-anim chip bg-brand-500/20 text-brand-300 mb-4 inline-block">Schreib uns</span>
          <h1 className="contact-hero-anim font-display text-6xl md:text-7xl mt-3">KONTAKT</h1>
          <p className="contact-hero-anim text-white/60 mt-4 text-lg">Wir freuen uns auf deine Nachricht.</p>
        </div>
      </section>

      {/* INFO CARDS */}
      <section className="info-grid max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { icon: 'pin',   label: 'Adresse',  lines: (siteSettings.restaurant_address || 'Musterstraße 1, 1010 Wien, Österreich').split(',') },
          { icon: 'phone', label: 'Telefon',  lines: [siteSettings.restaurant_phone || '+43 1 234 5678'] },
          { icon: 'mail',  label: 'E-Mail',   lines: [siteSettings.restaurant_email || 'hallo@rockin-rumble.com'] },
          { icon: 'clock', label: 'Öffnungszeiten', lines: (() => {
            let h = siteSettings.opening_hours;
            if (!h) return ['Mo–So 12:00–22:00'];
            if (typeof h === 'string') { try { h = JSON.parse(h); } catch { return [h]; } }
            const first = h.find((x) => !x.closed);
            if (!first) return ['Heute geschlossen'];
            const t = Array.isArray(first.times) ? first.times[0] : first.time;
            return [`${first.day} ${t || ''}`];
          })() },
        ].map((c) => (
          <div key={c.label} className="info-card card p-6 flex flex-col items-center text-center hover:border-brand-500/30 transition-colors">
            <div className="w-14 h-14 grid place-items-center rounded-2xl bg-brand-500/15 border border-brand-500/20 text-brand-400 mb-4">
              <Icon name={c.icon} className="w-7 h-7" />
            </div>
            <div className="text-xs uppercase tracking-widest text-brand-400 mb-2">{c.label}</div>
            {c.lines.map((l) => <div key={l} className="text-white/80 font-medium">{l.trim()}</div>)}
          </div>
        ))}
      </section>

      {/* FORM + HOURS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 grid lg:grid-cols-[1fr_380px] gap-8 items-start">
        <div className="card p-8 reveal self-start">
          <h2 className="font-display text-3xl mb-1">SCHREIB UNS EINE NACHRICHT</h2>
          <div className="w-12 h-1 bg-brand-500 rounded-full mb-6" />
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="label">Name *</span>
                <input className="input" required value={form.name} onChange={update('name')} placeholder="Daniel" />
              </label>
              <label className="block">
                <span className="label">E-Mail *</span>
                <input className="input" type="email" required value={form.email} onChange={update('email')} placeholder="dein@beispiel.at" />
              </label>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="label">Telefon</span>
                <input className="input" value={form.phone} onChange={update('phone')} placeholder="+43 …" />
              </label>
              <label className="block">
                <span className="label">Betreff</span>
                <select className="input" value={form.subject} onChange={update('subject')}>
                  <option value="">Thema wählen</option>
                  <option>Bestellanfrage</option>
                  <option>Feedback</option>
                  <option>Catering / Event</option>
                  <option>Partnerschaft</option>
                  <option>Sonstiges</option>
                </select>
              </label>
            </div>
            <label className="block">
              <span className="label">Nachricht *</span>
              <textarea
                className="input"
                rows={10}
                required
                value={form.message}
                onChange={update('message')}
                placeholder="Wie können wir helfen?…"
              />
            </label>
            <button disabled={sending} className="btn-primary w-full py-3 text-base">
              {sending ? 'Senden…' : (<>Nachricht senden <Icon name="arrowRight" className="w-4 h-4" /></>)}
            </button>
          </form>
        </div>

        <aside className="space-y-5 reveal self-start">
          <div className="card p-6">
            <h3 className="font-display text-2xl mb-1">ÖFFNUNGSZEITEN</h3>
            <div className="w-10 h-1 bg-brand-500 rounded-full mb-5" />
            <ul className="space-y-2">
              {((() => { let h = siteSettings.opening_hours; if (!h) return DEFAULT_HOURS; if (typeof h === 'string') { try { h = JSON.parse(h); } catch { return DEFAULT_HOURS; } } return h; })()).map((h) => {
                const today = new Date().toLocaleDateString('de-AT', { weekday: 'long' });
                const isToday = h.day === today;
                return (
                  <li key={h.day} className={`grid grid-cols-[auto_1fr] gap-x-4 py-2 border-b border-white/5 last:border-0 ${
                    isToday ? 'text-brand-300 font-semibold' : h.closed ? 'text-white/30' : 'text-white/75'
                  }`}>
                    <span className="whitespace-nowrap">{h.day}{isToday && <span className="ml-2 text-xs bg-brand-500/20 text-brand-300 px-2 py-0.5 rounded-full">Heute</span>}</span>
                    <div className={`text-right ${h.closed ? 'text-red-400/70' : ''}`}>
                      {(h.closed
                        ? ['Geschlossen']
                        : (Array.isArray(h.times) ? h.times : h.time ? [h.time] : []).filter(Boolean)
                      ).map((t, ti) => <div key={ti}>{t}</div>)}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="card p-6">
            <h3 className="font-display text-xl mb-4">FOLGE UNS</h3>
            <div className="flex gap-3">
              {[
                { label: 'Facebook',  href: siteSettings.restaurant_facebook  || 'https://facebook.com',  icon: 'facebook',  bg: 'bg-blue-600' },
                { label: 'Instagram', href: siteSettings.restaurant_instagram || 'https://instagram.com', icon: 'instagram', bg: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400' },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${s.bg} flex-1 text-white font-semibold py-2.5 rounded-lg text-center text-sm transition hover:opacity-90 flex items-center justify-center gap-2`}
                >
                  <Icon name={s.icon} className="w-4 h-4" />
                  {s.label}
                </a>
              ))}
            </div>
          </div>
        </aside>
      </section>

      {/* MAP – full width */}
      <section className="reveal">
        <div className="relative">
          <iframe
            title="Standort"
            src={`https://maps.google.com/maps?q=${encodeURIComponent(siteSettings.restaurant_address || 'Wien, Österreich')}&output=embed&z=18&t=k`}
            className="w-full h-[500px] border-0 block"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-ink-900/90 backdrop-blur-sm border border-white/10 rounded-xl px-5 py-3 shadow-xl">
            <Icon name="pin" className="w-4 h-4 text-brand-400 shrink-0" />
            <span className="text-sm text-white/80">{siteSettings.restaurant_address || 'Musterstraße 1, 1010 Wien'}</span>
            <a
              href={siteSettings.maps_url || `https://maps.google.com/?q=${encodeURIComponent(siteSettings.restaurant_address || 'Wien, Österreich')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-sm py-1.5 px-4 shrink-0"
            >
              Öffnen
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
