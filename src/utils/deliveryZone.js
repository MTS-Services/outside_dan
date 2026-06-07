/** Format stored order address as a delivery zone label, e.g. "8770 – St. Michael". */
export function formatDeliveryZone(postalCode, city) {
  const plz = (postalCode || '').trim();
  const area = (city || '').trim();
  if (!plz) return area || '–';
  return area ? `${plz} – ${area}` : plz;
}
