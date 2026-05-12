import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import scrollToTop from '../utils/scrollToTop';
import api from '../api/client';

const DEFAULT_HOURS = [
  { day: 'Montag',     times: ['12:00 – 14:30', '17:00 – 22:00'], closed: false },
  { day: 'Dienstag',   times: ['12:00 – 14:30', '17:00 – 22:00'], closed: false },
  { day: 'Mittwoch',   times: [], closed: true },
  { day: 'Donnerstag', times: ['12:00 – 14:30', '12:00 – 22:00'], closed: false },
  { day: 'Freitag',    times: ['08:00 – 22:00'], closed: false },
  { day: 'Samstag',    times: ['08:00 – 22:00'], closed: false },
  { day: 'Sonntag',    times: ['12:00 – 22:00'], closed: false },
];

export default function Footer() {
  const [s, setS] = useState({});

  useEffect(() => {
    api.get('/site-settings').then((r) => setS(r.data || {})).catch(() => {});
  }, []);

  const name    = s.restaurant_name    || 'ROCKIN RUMBLE';
  const desc    = s.footer_description || 'Lautes Essen, schnelle Lieferung. Handgemachte Burger, knusprige Pizza, eiskalte Getränke — direkt aus unserer Küche zu dir nach Hause.';
  const address = s.restaurant_address || 'Musterstraße 1, 1010 Wien, Österreich';
  const phone   = s.restaurant_phone   || '+43 1 234 5678';
  const email   = s.restaurant_email   || 'hello@rockin-rumble.com';
  const fbUrl   = s.restaurant_facebook  || 'https://facebook.com';
  const igUrl   = s.restaurant_instagram || 'https://instagram.com';

  let hours = DEFAULT_HOURS;
  if (s.opening_hours) {
    try { hours = Array.isArray(s.opening_hours) ? s.opening_hours : JSON.parse(s.opening_hours); } catch { /* keep default */ }
  }

  return (
    <footer className="bg-ink-800/80 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-10">
        {/* Brand */}
        <div>
          <div className="mb-4">
            <img src="/logo.png" alt="Tarantella" className="h-24 w-auto object-contain" />
          </div>
          <p className="text-white/55 text-sm leading-relaxed mb-5">{desc}</p>
          <div className="flex gap-3">
            <a href={fbUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook"
              className="w-9 h-9 rounded-full bg-white/5 grid place-items-center hover:bg-brand-500/30 transition">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white/70"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            </a>
            <a href={igUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram"
              className="w-9 h-9 rounded-full bg-white/5 grid place-items-center hover:bg-brand-500/30 transition">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-white/70 stroke-2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="white" className="stroke-0"/></svg>
            </a>
          </div>
        </div>

        {/* Opening hours */}
        <div>
          <h4 className="font-display text-lg tracking-wider mb-4 text-brand-400">ÖFFNUNGSZEITEN</h4>
          <ul className="space-y-2">
            {hours.map((h) => {
              const times = h.closed
                ? ['Geschlossen']
                : (Array.isArray(h.times) ? h.times : h.time ? [h.time] : []).filter(Boolean);
              return (
                <li key={h.day} className="flex justify-between gap-3 text-sm">
                  <span className={`shrink-0 font-medium ${h.closed ? 'text-white/35' : 'text-brand-300'}`}>{h.day}</span>
                  <div className={`text-right ${h.closed ? 'text-red-400/55' : 'text-white/65'}`}>
                    {times.map((t, i) => <div key={i}>{t}</div>)}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Visit */}
        <div>
          <h4 className="font-display text-lg tracking-wider mb-4 text-brand-400">FINDEN SIE UNS</h4>
          <address className="not-italic space-y-2 text-sm text-white/65">
            <div>{address.split(',').map((l, i, arr) => (
              <span key={i}>{l.trim()}{i < arr.length - 1 ? <br /> : ''}</span>
            ))}</div>
            <a href={`tel:${phone.replace(/\s/g, '')}`} className="block hover:text-white transition">{phone}</a>
            <a href={`mailto:${email}`} className="block hover:text-white transition">{email}</a>
          </address>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/5 py-5 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/35">
          <span>© {new Date().getFullYear()} {name} — Alle Rechte vorbehalten.</span>
          <div className="flex gap-5">
            <Link to="/impressum" onClick={() => scrollToTop()} className="hover:text-white/60 transition">Impressum</Link>
            <Link to="/datenschutz" onClick={() => scrollToTop()} className="hover:text-white/60 transition">Datenschutz</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

