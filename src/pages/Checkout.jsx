import { useState, useEffect, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useCart } from '../store/cart';
import { useAuth } from '../store/auth';
import { subscribeToPush, isPushSubscribed } from '../api/push';
import PhoneInput from '../components/PhoneInput';
import { findCountry } from '../data/countries';

const initial = {
  customerName: '',
  customerPhone: '',
  customerPhoneCountry: 'AT',
  customerEmail: '',
  street: '',
  city: 'Wien',
  postalCode: '',
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

function PayOption({ form, setForm, value, label }) {
  return (
    <label className={`
      flex items-center justify-center p-3 rounded-xl border cursor-pointer select-none transition-all
      ${form.paymentMethod === value 
        ? 'border-brand-500 bg-brand-500/10 text-brand-400 font-bold' 
        : 'border-white/10 hover:border-white/30 text-white/70'}
    `}>
      <input type="radio" className="hidden" checked={form.paymentMethod === value} onChange={() => setForm({ ...form, paymentMethod: value })} />
      {label}
    </label>
  );
}

export default function Checkout() {
  const { items, subtotal, clear } = useCart();
  const { user, token } = useAuth();
  const [form, setForm] = useState(initial);
  const [submitting, setSubmitting] = useState(false);

  // PayPal state
  const [paypalConfig, setPaypalConfig] = useState(null); // { clientId, currency, mode }
  const [paypalReady, setPaypalReady] = useState(false);
  const [paypalProcessing, setPaypalProcessing] = useState(false);
  const paypalContainerRef = useRef(null);
  const paypalButtonsRef = useRef(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        customerName: f.customerName || user.name || '',
        customerEmail: f.customerEmail || user.email || '',
        customerPhone: f.customerPhone || user.phone || '',
        customerPhoneCountry: f.customerPhoneCountry || user.phoneCountry || 'AT',
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
    
    // Check if script is already present
    if (document.querySelector(`script[src*="paypal.com/sdk/js?client-id=${paypalConfig.clientId}"]`)) {
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
  const fee = items.length ? 2.5 : 0;
  const total = sub + fee;

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const buildPayload = (paymentMethod, paypalOrderId) => ({
    customerName: form.customerName,
    customerPhone: `${findCountry(form.customerPhoneCountry).dial} ${form.customerPhone}`.trim(),
    customerPhoneCountry: form.customerPhoneCountry,
    customerEmail: form.customerEmail,
    street: form.street,
    city: form.city,
    postalCode: form.postalCode,
    notes: form.notes,
    paymentMethod,
    paypalOrderId,
    items: items.map((i) => ({
      menuItemId: i.menuItemId,
      quantity: i.quantity,
      notes: i.notes,
      extraIds: (i.extras || []).map((e) => e.id),
    })),
  });

  function validateForm() {
    if (!items.length) { toast.error('Warenkorb ist leer'); return false; }
    if (!form.customerName.trim()) { toast.error('Name ist erforderlich'); return false; }
    if (!form.customerPhone.trim()) { toast.error('Telefon ist erforderlich'); return false; }
    if (!form.street.trim() || !form.postalCode.trim() || !form.city.trim()) {
      toast.error('Lieferadresse ist unvollständig'); return false;
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
          const { data: cap } = await api.post('/paypal/capture-order', { orderId: data.orderID });
          if (!cap?.captured) throw new Error('Zahlung nicht erfolgreich');
          await placeOrder(buildPayload('PAYPAL', data.orderID));
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
  }, [form.paymentMethod, paypalReady, total, items, form.customerName, form.customerPhone, form.street, form.postalCode, form.city]); // re-render on relevant changes

  if (!items.length) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="text-4xl mb-4">Dein Warenkorb ist leer</h1>
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
          <Field label="Straße + Hausnummer *">
            <input className="input" required value={form.street} onChange={update('street')} />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Postleitzahl *">
              <input className="input" required value={form.postalCode} onChange={update('postalCode')} />
            </Field>
            <Field label="Stadt *">
              <input className="input" required value={form.city} onChange={update('city')} />
            </Field>
          </div>
          <Field label="Anmerkungen für die Küche / den Fahrer">
            <textarea rows="3" className="input" value={form.notes} onChange={update('notes')} />
          </Field>

          <h3 className="text-2xl pt-4">Zahlung</h3>
          <div className="grid grid-cols-1 gap-3">
            <PayOption form={form} setForm={setForm} value="CASH" label="Bar bei Lieferung" />
          </div>
        </div>

        <div>
          <div className="card p-6 sticky top-[90px]">
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
                <span>€{fee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-xl pt-2 border-t border-white/10">
                <span>Summe</span>
                <span className="text-brand-500">€{total.toFixed(2)}</span>
              </div>
            </div>

            {form.paymentMethod === 'PAYPAL' ? (
              <div className="text-center text-sm font-medium text-white/60">
                Mit PayPal wird der Betrag erst abgebucht, bevor die Bestellung aufgeben wird.
              </div>
            ) : (
              <button disabled={submitting} type="submit" className="btn-primary w-full justify-center py-4 text-lg shadow-brand">
                {submitting ? 'Bitte warten…' : `Bestellen · €${total.toFixed(2)}`}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}