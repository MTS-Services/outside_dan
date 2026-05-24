/**
 * Renders a country flag using the flag-icons CSS library.
 * Works on all platforms including Windows where flag emojis are unsupported.
 * code: ISO-2 country code e.g. "AT", "DE"
 */
export default function FlagIcon({ code, className = '' }) {
  if (!code) return null;
  return (
    <span
      className={`fi fi-${code.toLowerCase()} ${className}`}
      style={{ borderRadius: '2px', display: 'inline-block' }}
    />
  );
}
