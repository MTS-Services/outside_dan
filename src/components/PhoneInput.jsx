import { useEffect, useRef, useState } from 'react';
import { COUNTRIES, findCountry } from '../data/countries';
import FlagIcon from './FlagIcon';

/** Phone input with country flag + dial-code dropdown.
 *  value: { phone (digits, no dial), country (ISO-2) }
 *  onChange({ phone, country })
 */
export default function PhoneInput({ value, onChange, required, placeholder = '660 1234567' }) {
  const country = findCountry(value?.country || 'AT');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    setSearch('');
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  function pickCountry(code) {
    onChange({ phone: value?.phone || '', country: code });
    setOpen(false);
  }

  function onPhoneChange(e) {
    // strip non-digit/space; keep leading + optionally
    const digits = e.target.value.replace(/[^0-9 ]/g, '');
    onChange({ phone: digits, country: country.code });
  }

  return (
    <div ref={ref} className="relative flex items-stretch">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 rounded-l-lg border border-r-0 border-white/10 bg-white/5 hover:bg-white/10 text-sm font-semibold transition shrink-0"
        aria-label="Land auswählen"
      >
        <FlagIcon code={country.code} className="text-base w-5 h-4 object-cover" />
        <span className="text-white/70">{country.dial}</span>
        <svg viewBox="0 0 24 24" className="w-3 h-3 stroke-white/60 stroke-2 fill-none">
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <input
        type="tel"
        inputMode="tel"
        required={required}
        value={value?.phone || ''}
        onChange={onPhoneChange}
        placeholder={placeholder}
        className="input rounded-l-none flex-1"
      />

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-72 rounded-xl bg-[#1c1917] border border-white/10 shadow-2xl flex flex-col" style={{ maxHeight: '288px' }}>
          {/* Search */}
          <div className="px-3 pt-2 pb-1.5 shrink-0">
            <div className="flex items-center gap-2 px-3 h-8 rounded-lg bg-white/5 border border-white/10">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-white/40 stroke-2 fill-none shrink-0">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search country…"
                className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          {/* List */}
          <ul className="overflow-y-auto flex-1 py-1" data-lenis-prevent>
            {COUNTRIES.filter((c) =>
              !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.dial.includes(search)
            ).map((c) => (
              <li key={c.code}>
                <button
                  type="button"
                  onClick={() => pickCountry(c.code)}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-white/5 transition ${
                    c.code === country.code ? 'bg-brand-500/10 text-brand-300' : 'text-white/80'
                  }`}
                >
                  <FlagIcon code={c.code} className="w-5 h-4 shrink-0" />
                  <span className="flex-1 text-left truncate">{c.name}</span>
                  <span className="text-white/40">{c.dial}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
