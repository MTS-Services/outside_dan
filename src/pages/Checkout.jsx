import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useCart } from '../store/cart';
import { useAuth } from '../store/auth';
import { ORDERS_CLOSED_MESSAGE, useOrderGuard } from '../store/siteSettings';
import { subscribeToPush, isPushSubscribed } from '../api/push';
import PhoneInput from '../components/PhoneInput';
import DeliveryMapPicker from '../components/DeliveryMapPicker';
import { findCountry } from '../data/countries';

const initial = {
  customerName: '',
  customerPhone: '',
  customerPhoneCountry: 'AT',
  customerEmail: '',
  streetName: '',
  houseNumber: '',
  city: '',
  postalCode: '',
  deliveryZoneId: '',
  deliveryLat: null,
  deliveryLon: null,
  pinSet: false,
  notes: '',
  paymentMethod: 'CASH',
};

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

function PayOption({ form, setForm, value, label, disabled }) {
  return (
    <label className={`
      flex items-center justify-center p-3 rounded-xl border select-none transition-all
      ${disabled
        ? 'border-white/5 text-white/20 cursor-not-allowed opacity-50'
        : form.paymentMethod === value 
          ? 'border-brand-500 bg-brand-500/10 text-brand-400 font-bold cursor-pointer' 
          : 'border-white/10 hover:border-white/30 text-white/70 cursor-pointer'}
    `}>
      <input type="radio" className="hidden" disabled={disabled} checked={form.paymentMethod === value} onChange={() => !disabled && setForm({ ...form, paymentMethod: value })} />
      {label}
    </label>
  );
}

export default function Checkout() {
  const { items, subtotal, clear } = useCart();
  const { user, token } = useAuth();
  const { canOrder, loaded: settingsLoaded } = useOrderGuard();
  const [form, setForm] = useState(initial);
  const [submitting, setSubmitting] = useState(false);
  const [deliveryTooFar, setDeliveryTooFar] = useState(false);

  // PayPal state
  const [paypalConfig, setPaypalConfig] = useState(null); // { clientId, currency, mode }
  const [paypalReady, setPaypalReady] = useState(false);
  const [paypalProcessing, setPaypalProcessing] = useState(false);
  const paypalContainerRef = useRef(null);
  const paypalButtonsRef = useRef(null);

  const navigate = useNavigate();

  // Delivery zones list
  const [zones, setZones] = useState([]);
  const [zonesLoading, setZonesLoading] = useState(true);

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState(null);    // { code, discount }
  const [couponApplying, setCouponApplying] = useState(false);

  useEffect(() => {
    api.get('/delivery-zones')
      .then((r) => setZones((r.data || []).filter((z) => z.isActive)))
      .catch(() => {})
      .finally(() => setZonesLoading(false));
  }, []);

  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        customerName: f.customerName || user.name || '',
        customerEmail: f.customerEmail || user.email || '',
        customerPhone: f.customerPhone || user.phone || '',
        customerPhoneCountry: user.phoneCountry || f.customerPhoneCountry,
      }));
    }
  }, [user]);

  // load PayPal config + sdk on demand
  useEffect(() => {
    api.get('/paypal/config')
      .then((r) => {
        // Backend now doesn't send "enabled" so assume true if client exists
        if (r.data?.clientId) setPaypalConfig(r.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!paypalConfig?.clientId) return;
    if (window.paypal) { setPaypalReady(true); return; }

    // If script is already in DOM (e.g. strict-mode double-invoke), wait for it
    const existing = document.querySelector('script[src*="paypal.com/sdk/js"]');
    if (existing) {
      existing.addEventListener('load', () => setPaypalReady(true));
      return;
    }

    const s = document.createElement('script');
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(paypalConfig.clientId)}&currency=${encodeURIComponent(paypalConfig.currency || 'EUR')}&intent=capture`;
    s.async = true;
    s.onload = () => setPaypalReady(true);
    s.onerror = () => toast.error('PayPal konnte nicht geladen werden');
    document.body.appendChild(s);
  }, [paypalConfig]);

  if (items.length && !token) {
    return <Navigate to="/login?next=/checkout" replace />;
  }

  // staff cannot order
  if (token && user && ['ADMIN', 'SUBADMIN', 'STAFF'].includes(user.role)) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="text-4xl mb-4">Keine Bestellung möglich</h1>
        <p className="text-white/60 mb-6">Mitarbeiter-Konten können keine Bestellungen aufgeben.</p>
        <button className="btn-primary" onClick={() => navigate('/admin')}>Zum Dashboard</button>
      </div>
    );
  }

  const sub = subtotal();
  const selectedZone = useMemo(
    () => zones.find((z) => z.id === form.deliveryZoneId) || null,
    [zones, form.deliveryZoneId]
  );
  const fee = selectedZone ? Number(selectedZone.deliveryFee) : 0;
  const minimumOrder = selectedZone ? Number(selectedZone.minimumOrder) : 0;
  const belowMinimum = minimumOrder > 0 && sub < minimumOrder;
  const discount = coupon ? Number(coupon.discount) : 0;
  const total = sub + fee - discount;
  // VAT 10% is included in product prices (food/beverage for delivery in AT)
  // Delivery is 0% VAT — so VAT is calculated on subtotal only
  const vatAmount = sub * 0.10 / 1.10;

  const fullStreet = [form.streetName.trim(), form.houseNumber.trim()].filter(Boolean).join(' ');

  const infoComplete =
    form.customerName.trim() !== '' &&
    form.customerPhone.trim() !== '' &&
    form.deliveryZoneId !== '' &&
    form.pinSet &&
    form.streetName.trim() !== '' &&
    form.houseNumber.trim() !== '' &&
    form.postalCode.trim() !== '' &&
    form.city.trim() !== '';

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const buildPayload = (paymentMethod, paypalOrderId, paypalCaptureId) => ({
    customerName: form.customerName,
    customerPhone: `${findCountry(form.customerPhoneCountry).dial} ${form.customerPhone}`.trim(),
    customerPhoneCountry: form.customerPhoneCountry,
    customerEmail: form.customerEmail,
    street: fullStreet,
    city: form.city,
    postalCode: form.postalCode,
    deliveryZoneId: form.deliveryZoneId || null,
    deliveryLat: form.deliveryLat,
    deliveryLon: form.deliveryLon,
    notes: form.notes,
    paymentMethod,
    paypalOrderId,
    paypalCaptureId: paypalCaptureId || null,
    couponCode: coupon?.code || null,
    items: items.map((i) => ({
      menuItemId: i.menuItemId,
      quantity: i.quantity,
      notes: i.notes,
      extraIds: (i.extras || []).map((e) => e.id),
    })),
  });

  async function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponApplying(true);
    const start = Date.now();
    const minDelay = () => new Promise((r) => setTimeout(r, Math.max(0, 300 - (Date.now() - start))));
    try {
      const { data } = await api.post('/coupons/validate', { code, orderAmount: sub });
      await minDelay();
      if (!data.valid) {
        setCoupon(null);
        toast.error(data.error || 'Ungültiger Gutscheincode');
        return;
      }
      setCoupon(data);
      setCouponInput('');
      toast.success(`Gutschein angewendet: -€${Number(data.discount).toFixed(2)}`);
    } catch (err) {
      await minDelay();
      setCoupon(null);
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Ungültiger Gutscheincode');
    } finally { setCouponApplying(false); }
  }

  function validateForm() {
    if (!canOrder) { toast.error(ORDERS_CLOSED_MESSAGE); return false; }
    if (!items.length) { toast.error('Warenkorb ist leer'); return false; }
    if (form.customerName.trim().length < 2) { toast.error('Name ist erforderlich (min. 2 Zeichen)'); return false; }
    if (form.customerPhone.trim().length < 5) { toast.error('Telefon ist erforderlich'); return false; }
    if (!form.deliveryZoneId) { toast.error('Bitte wähle eine Lieferzone aus'); return false; }
    if (!form.pinSet || !form.streetName.trim()) { toast.error('Bitte Adresse auf der Karte wählen oder eingeben'); return false; }
    if (deliveryTooFar) { toast.error('Diese Adresse liegt außerhalb des Liefergebiets. Bitte eine nähere Adresse wählen.'); return false; }
    if (!form.houseNumber.trim()) { toast.error('Hausnummer ist erforderlich'); return false; }
    if (fullStreet.length < 3) { toast.error('Adresse ist unvollständig'); return false; }
    if (belowMinimum) {
      toast.error(`Mindestbestellwert: €${minimumOrder.toFixed(2)} (aktuell €${sub.toFixed(2)})`);
      return false;
    }
    return true;
  }

  async function placeOrder(payload) {
    const { data } = await api.post('/orders', payload);
    clear();
    // Always re-subscribe so the DB record is linked to the current userId.
    // If the browser already has a subscription the push manager reuses the
    // same endpoint and the upsert simply updates userId → no extra cost.
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        await subscribeToPush();
      } else if (!(await isPushSubscribed())) {
        await subscribeToPush();
      }
    } catch { /* permission denied or unsupported – ignore */ }
    toast.success('Bestellung aufgegeben!');
    navigate(`/order/${data.id}`);
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;
    if (form.paymentMethod === 'PAYPAL') {
      toast('Bitte schließe die Bezahlung mit dem PayPal-Button ab', { icon: 'ℹ️' });
      return;
    }
    setSubmitting(true);
    try {
      await placeOrder(buildPayload(form.paymentMethod));
    } catch (err) {
      toast.error(err.displayMessage || 'Bestellung fehlgeschlagen');
    } finally {
      setSubmitting(false);
    }
  }

  // (Re)render PayPal Buttons whenever PAYPAL is selected and SDK ready
  useEffect(() => {
    if (form.paymentMethod !== 'PAYPAL' || !paypalReady || !paypalContainerRef.current || !window.paypal) return;
    if (paypalButtonsRef.current) {
      try { paypalButtonsRef.current.close(); } catch { /* ignore */ }
      paypalButtonsRef.current = null;
    }
    paypalContainerRef.current.innerHTML = '';
    const buttons = window.paypal.Buttons({
      style: { layout: 'vertical', shape: 'rect', color: 'gold', label: 'paypal' },
      createOrder: async () => {
        if (!validateForm()) throw new Error('invalid form');
        setPaypalProcessing(true);
        try {
          const { data } = await api.post('/paypal/create-order', { amount: total });
          return data.id;
        } catch (err) {
          toast.error(err.displayMessage || 'Fehler beim Erstellen der PayPal Order');
          throw err;
        } finally {
          setPaypalProcessing(false);
        }
      },
      onApprove: async (data) => {
        setPaypalProcessing(true);
        try {
          const { data: cap } = await api.post('/paypal/capture-order', { paypalOrderId: data.orderID });
          if (!cap?.success) throw new Error('Zahlung nicht erfolgreich');
          await placeOrder(buildPayload('PAYPAL', data.orderID, cap.captureId));
        } catch (err) {
          toast.error(err.displayMessage || err.message || 'PayPal-Zahlung fehlgeschlagen');
        } finally {
          setPaypalProcessing(false);
        }
      },
      onError: (err) => {
        console.error('PayPal error', err);
        toast.error('PayPal-Fehler');
      },
    });
    buttons.render(paypalContainerRef.current);
    paypalButtonsRef.current = buttons;
    return () => {
      try { buttons.close(); } catch { /* ignore */ }
    };
  }, [form.paymentMethod, paypalReady, total, items, form.customerName, form.customerPhone, form.streetName, form.houseNumber, form.deliveryZoneId, form.postalCode, form.city, form.pinSet]); // re-render on relevant changes

  if (!items.length) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="text-4xl mb-4">Dein Warenkorb ist leer</h1>
        <button className="btn-primary" onClick={() => navigate('/menu')}>Zur Speisekarte</button>
      </div>
    );
  }

  if (settingsLoaded && !canOrder) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="text-4xl mb-4">Bestellungen pausiert</h1>
        <p className="text-white/60 mb-8">{ORDERS_CLOSED_MESSAGE}</p>
        <button className="btn-primary" onClick={() => navigate('/menu')}>Zur Speisekarte</button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <h1 className="text-5xl mb-8">KASSE</h1>
      <form onSubmit={onSubmit} className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="card p-6 space-y-5">
          <h3 className="text-2xl">Kontakt</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Vollständiger Name *">
              <input className="input" required value={form.customerName} onChange={update('customerName')} />
            </Field>
            <Field label="Telefon *">
              <PhoneInput
                value={{ phone: form.customerPhone, country: form.customerPhoneCountry }}
                onChange={({ phone, country }) => setForm({ ...form, customerPhone: phone, customerPhoneCountry: country })}
                required
              />
            </Field>
          </div>
          <Field label="E-Mail">
            <input className="input" type="email" value={form.customerEmail} onChange={update('customerEmail')} />
          </Field>

          <h3 className="text-2xl pt-4">Lieferadresse</h3>
          <Field label="Lieferzone *">
            <select
              className="input"
              required
              value={form.deliveryZoneId}
              onChange={(e) => {
                const zone = zones.find((z) => z.id === e.target.value);
                setForm({
                  ...form,
                  deliveryZoneId: e.target.value,
                  postalCode: zone?.postalCode || '',
                  city: zone?.label?.trim() || '',
                  streetName: '',
                  houseNumber: '',
                  pinSet: false,
                  deliveryLat: null,
                  deliveryLon: null,
                });
                setDeliveryTooFar(false);
              }}
            >
              <option value="">{zonesLoading ? 'Wird geladen' : 'Auswählen'}</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.postalCode}{z.label ? ` – ${z.label}` : ''}
                </option>
              ))}
            </select>
          </Field>

          <DeliveryMapPicker
            zone={selectedZone}
            onStreetNameChange={(streetName) => {
              setDeliveryTooFar(false);
              setForm((f) => ({ ...f, streetName }));
            }}
            onHouseNumberChange={(houseNumber) => setForm((f) => ({ ...f, houseNumber }))}
            onPinSet={(pin) => setForm((f) => ({
              ...f,
              pinSet: Boolean(pin),
              deliveryLat: pin?.lat ?? null,
              deliveryLon: pin?.lon ?? null,
            }))}
            onRouteCheck={(result) => setDeliveryTooFar(Boolean(result?.tooFar))}
          />

          <Field label="Hausnummer *">
            <input
              className="input"
              required
              value={form.houseNumber}
              onChange={update('houseNumber')}
              placeholder="z. B. 25"
              disabled={!form.streetName}
            />
          </Field>
          <Field label="Anmerkungen für die Küche / den Fahrer">
            <textarea rows="3" className="input" value={form.notes} onChange={update('notes')} />
          </Field>

          <h3 className="text-2xl pt-4">Zahlung</h3>
          {!infoComplete && (
            <p className="text-sm text-yellow-400/80 bg-yellow-400/10 border border-yellow-400/20 rounded-lg px-3 py-2">
              Bitte fülle zuerst alle Pflichtfelder aus, um eine Zahlungsart auszuwählen.
            </p>
          )}
          <div className={`grid grid-cols-1 gap-3 ${!infoComplete ? 'pointer-events-none' : ''}`}>
            <PayOption form={form} setForm={setForm} value="CASH" label="Bar bei Lieferung" disabled={!infoComplete} />
            {paypalConfig?.clientId && (
              <PayOption form={form} setForm={setForm} value="PAYPAL" label="PayPal" disabled={!infoComplete} />
            )}
          </div>
        </div>

        <div>
          <div className="card p-6 sticky top-[90px]" translate="no">
            <h3 className="font-display text-3xl mb-4">DEINE BESTELLUNG</h3>
            <div className="space-y-4 mb-6">
              {items.map((i, idx) => {
                const isCombo = i.tagIds && i.tagIds.includes('combo_tag_id_placeholder');
                const rowTitle = isCombo ? `Aktionsmenü: ${i.name}` : `${i.quantity} × ${i.name}`;
                
                // Group extras by id/name just like in CartDrawer
                const groupedExtras = Object.values((i.extras || []).reduce((acc, ext) => {
                  const extraId = ext.id || ext.name;
                  if (!acc[extraId]) {
                    acc[extraId] = { ...ext, count: 0 };
                  }
                  acc[extraId].count += 1;
                  return acc;
                }, {}));

                return (
                  <div key={idx} className="flex justify-between text-sm items-start gap-4">
                    <div>
                      <div className="font-bold">{rowTitle}</div>
                      {groupedExtras.map((e, idxE) => (
                        <div key={idxE} className="text-brand-400 text-xs mt-0.5">
                          + {e.name} <span className="text-brand-400/60 ml-1">({e.count} × €{Number(e.price || 0).toFixed(2)})</span>
                        </div>
                      ))}
                    </div>
                    <div className="font-bold shrink-0">
                      €{(i.quantity * Number(i.price) + (i.extras || []).reduce((a, b) => a + Number(b.price || 0), 0)).toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="border-t border-white/10 pt-4 space-y-2 mb-6">
              <div className="flex justify-between text-white/70">
                <span>Zwischensumme</span>
                <span>€{sub.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-white/70">
                <span>Lieferung</span>
                {zonesLoading ? (
                  <span className="text-white/30 text-xs">Wird geladen…</span>
                ) : (
                  <span>{selectedZone ? `€${fee.toFixed(2)}` : '–'}</span>
                )}
              </div>
              {coupon && (
                <div className="flex justify-between text-emerald-400">
                  <span>Gutschein ({coupon.code})</span>
                  <span>−€{discount.toFixed(2)}</span>
                </div>
              )}
              {minimumOrder > 0 && (
                <div className={`text-sm ${belowMinimum ? 'text-red-400' : 'text-white/50'}`}>
                  Mindestbestellwert: €{minimumOrder.toFixed(2)}
                  {belowMinimum && ` (noch €${(minimumOrder - sub).toFixed(2)} fehlen)`}
                </div>
              )}
              <div className="flex justify-between font-bold text-xl pt-2 border-t border-white/10">
                <span>Summe</span>
                <span className="text-brand-500">€{total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-white/50 pt-1">
                <span>davon 10% USt.</span>
                <span>€{vatAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Coupon input */}
            <div className="mb-4">
              {coupon ? (
                <div className="flex items-center justify-between bg-emerald-400/10 border border-emerald-400/20 rounded-xl px-3 py-2">
                  <span className="text-emerald-400 text-sm font-mono font-semibold">{coupon.code} −€{discount.toFixed(2)}</span>
                  <button type="button" onClick={() => { setCoupon(null); setCouponInput(''); }} className="text-white/40 hover:text-white text-xs transition">✕ Entfernen</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    className="input flex-1 font-mono uppercase text-sm"
                    placeholder="Gutschein-Code"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), applyCoupon())}
                  />
                  <button
                    type="button"
                    onClick={applyCoupon}
                    disabled={couponApplying || !couponInput.trim()}
                    className="px-4 py-2 rounded-xl bg-brand-500/20 text-brand-300 text-sm font-semibold hover:bg-brand-500/30 transition disabled:opacity-40"
                  >
                    {couponApplying ? '…' : 'Anwenden'}
                  </button>
                </div>
              )}
            </div>

            {form.paymentMethod === 'PAYPAL' ? (
              <div>
                <p className="text-center text-sm text-white/60 mb-3">
                  Mit PayPal wird der Betrag erst abgebucht, bevor die Bestellung aufgegeben wird.
                </p>
                {paypalProcessing && <p className="text-center text-sm text-brand-400 mb-2">Bitte warten…</p>}
                {!paypalReady && !paypalProcessing && (
                  <p className="text-center text-sm text-white/40 py-3">PayPal wird geladen…</p>
                )}
                <div ref={paypalContainerRef} className="min-h-[50px]" />
              </div>
            ) : (
              <button
                disabled={submitting || zonesLoading || couponApplying || belowMinimum || !form.deliveryZoneId || deliveryTooFar}
                type="submit"
                className="btn-primary w-full justify-center py-4 text-lg shadow-brand disabled:opacity-60 transition-all"
              >
                {zonesLoading || couponApplying
                  ? <span className="flex items-center justify-center gap-2"><svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Wird geladen…</span>
                  : submitting
                    ? <span className="flex items-center justify-center gap-2"><svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Bitte warten…</span>
                    : `Bestellen · €${total.toFixed(2)}`
                }
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}