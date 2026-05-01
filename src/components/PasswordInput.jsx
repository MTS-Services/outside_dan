import { useState } from 'react';

/**
 * Reusable password input with toggleable visibility.
 */
export default function PasswordInput(props) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative flex items-center">
      <input
        {...props}
        type={show ? 'text' : 'password'}
        className={`${props.className || ''} pr-10`.trim()}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-0 top-0 h-full px-3 text-white/50 hover:text-white/80 transition flex items-center justify-center"
        aria-label={show ? 'Passwort verbergen' : 'Passwort anzeigen'}
        tabIndex="-1"
      >
        {show ? (
          <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current stroke-2 fill-none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current stroke-2 fill-none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
