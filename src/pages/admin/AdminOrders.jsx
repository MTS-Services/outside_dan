import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { getSocket } from '../../api/socket';

const PAGE_SIZE = 8;
const NEW_STATUSES = ['PENDING'];
const ACCEPTED_STATUSES = ['ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'DECLINED'];

export default function AdminOrders() {
  const audioRef = useRef(null);
  const [busyId, setBusyId] = useState(null);

  const [newRows, setNewRows] = useState({ items: [], total: 0, page: 1, search: '' });
  const [accRows, setAccRows] = useState({ items: [], total: 0, page: 1, search: '' });

  const [promptModal, setPromptModal] = useState({ open: false, title: '', defaultVal: '', onConfirm: null });
  const [viewOrder, setViewOrder] = useState(null);

  const fetchNew = async (page = 1, search = '', showInitialToast = false) => {
    const { data } = await api.get('/orders', {
      params: { statusIn: NEW_STATUSES.join(','), page, pageSize: PAGE_SIZE, search },
    });
    const items = data.items || data;
    const total = data.total ?? items.length;
    setNewRows({ items, total, page, search });
    if (showInitialToast && total > 0) {
      toast(`${total} neue ${total === 1 ? 'Bestellung' : 'Bestellungen'} warten!`, {
        icon: '🔔',
        style: {
          background: '#f59e0b',
          color: '#fff',
        },
      });
    }
  };
  const fetchAcc = async (page = 1, search = '') => {
    const { data } = await api.get('/orders', {
      params: { statusIn: ACCEPTED_STATUSES.join(','), page, pageSize: PAGE_SIZE, search },
    });
    const items = data.items || data;
    const total = data.total ?? items.length;
    setAccRows({ items, total, page, search });
  };

  useEffect(() => {
    fetchNew(1, '', true);
    fetchAcc(1, '');
    const sock = getSocket();
    sock.emit('join:kitchen');
    const onNew = (order) => {
      audioRef.current?.play().catch(() => {});
      toast.success(`🔔 Neue Bestellung ${order.orderNumber} – ${order.customerName}`, { duration: 8000 });
      fetchNew(1, '');
    };
    const onUpdated = () => {
      fetchNew(newRows.page, newRows.search);
      fetchAcc(accRows.page, accRows.search);
    };
    sock.on('order:new', onNew);
    sock.on('order:updated', onUpdated);
    return () => { sock.off('order:new', onNew); sock.off('order:updated', onUpdated); };
    // eslint-disable-next-line
  }, []);

  async function call(orderId, fn) {
    setBusyId(orderId);
    try { await fn(); }
    catch (e) { toast.error(e.displayMessage || 'Aktion fehlgeschlagen'); }
    finally { setBusyId(null); }
  }

  const openPrompt = (title, defaultVal) => new Promise((resolve) => {
    setPromptModal({ open: true, title, defaultVal, onConfirm: (val) => { setPromptModal({ open: false }); resolve(val); } });
  });

  const accept = (o) => call(o.id, async () => {
    const note = await openPrompt('Annahme-Hinweis (für Kunden, optional):', 'Lieferung innerhalb von 30 Minuten');
    if (note === null) return;
    await api.post(`/orders/${o.id}/accept`, { acceptanceNote: note || undefined });
    toast.success('Bestellung akzeptiert');
    fetchNew(newRows.page, newRows.search);
    fetchAcc(1, accRows.search);
  });
  const decline = (o) => call(o.id, async () => {
    const reason = await openPrompt('Grund für Ablehnung (wird dem Kunden gezeigt):', '');
    if (reason === null || !reason.trim()) return;
    await api.post(`/orders/${o.id}/decline`, { reason });
    toast('Bestellung abgelehnt', { icon: '🚫' });
    fetchNew(newRows.page, newRows.search);
    fetchAcc(1, accRows.search);
  });
  const setStatus = (o, status) => call(o.id, async () => {
    await api.post(`/orders/${o.id}/status`, { status });
    fetchAcc(accRows.page, accRows.search);
  });
  const reprint = (o) => call(o.id, async () => {
    const { data } = await api.post(`/orders/${o.id}/print`);
    if (data.printed) toast.success('Bon gedruckt');
    else toast.error(`Drucker: ${data.reason}`);
  });
  const editOrder = (o) => call(o.id, async () => {
    const notes = await openPrompt('Notizen bearbeiten:', o.notes || '');
    if (notes === null) return;
    await api.put(`/orders/${o.id}`, { notes });
    toast.success('Bestellung aktualisiert');
    fetchAcc(accRows.page, accRows.search);
    fetchNew(newRows.page, newRows.search);
  });

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <audio ref={audioRef} src="/notify.mp3" preload="auto" />

      <Section
        title="Neue Bestellungen"
        accent="#f59e0b"
        rows={newRows}
        busyId={busyId}
        onSearch={(s) => fetchNew(1, s)}
        onPage={(p) => fetchNew(p, newRows.search)}
        renderActions={(o) => (
          <div className="flex gap-2">
            <Pill onClick={() => setViewOrder(o)} className="bg-white/10 text-white/80 border-white/20">Ansehen</Pill>
            <Pill onClick={() => decline(o)} disabled={busyId === o.id} className="bg-red-500/15 text-red-400 border-red-500/25">Ablehnen</Pill>
            <Pill onClick={() => accept(o)} disabled={busyId === o.id} className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Akzeptieren</Pill>
          </div>
        )}
      />

      <Section
        title="Akzeptierte Bestellungen"
        accent="#3b82f6"
        rows={accRows}
        busyId={busyId}
        onSearch={(s) => fetchAcc(1, s)}
        onPage={(p) => fetchAcc(p, accRows.search)}
        renderActions={(o) => (
          <div className="flex flex-wrap gap-1.5">
            <Pill onClick={() => setViewOrder(o)} className="bg-white/10 text-white/80 border-white/20">Ansehen</Pill>
          </div>
        )}
      />

      <PromptModal
        open={promptModal.open}
        title={promptModal.title}
        defaultVal={promptModal.defaultVal}
        onConfirm={promptModal.onConfirm}
      />

      <OrderDetailsModal
        order={viewOrder}
        onClose={() => setViewOrder(null)}
      />
    </div>
  );
}

function Pill({ children, className = '', ...rest }) {
  return (
    <button
      {...rest}
      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition disabled:opacity-40 hover:brightness-110 ${className}`}
    >
      {children}
    </button>
  );
}

const STATUS_MAP = {
  PENDING_PAYMENT: 'Zahlung ausstehend',
  PENDING:         'Eingegangen',
  ACCEPTED:        'Akzeptiert',
  DECLINED:        'Abgelehnt',
  PREPARING:       'Kochend',
  READY:           'Bereit',
  OUT_FOR_DELIVERY:'Unterwegs',
  DELIVERED:       'Geliefert',
  CANCELLED:       'Storniert',
};

const PAYMENT_MAP = {
  CASH:   'Barzahlung',
  PAYPAL: 'PayPal',
  ONLINE: 'Online',
};

function Section({ title, accent, rows, onSearch, onPage, renderActions }) {
  const totalPages = Math.max(1, Math.ceil((rows.total || 0) / PAGE_SIZE));
  return (
    <section className="rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden">
      <header className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-white/5 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: accent }} />
          <h2 className="font-display tracking-widest text-sm">{title}</h2>
          <span className="text-xs text-white/40">{rows.total} gesamt</span>
        </div>
        <input
          defaultValue={rows.search}
          onKeyDown={(e) => { if (e.key === 'Enter') onSearch(e.target.value); }}
          placeholder="Suchen…"
          className="input h-9 w-full sm:w-56 text-sm"
        />
      </header>

      <div className="divide-y divide-white/5">
        {rows.items.length === 0 ? (
          <div className="p-8 text-center text-white/35 text-sm">Keine Einträge</div>
        ) : rows.items.map((o) => (
          <article key={o.id} className="p-4 flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="lg:w-48 shrink-0">
              <div className="font-mono font-bold text-sm mb-1">{o.orderNumber}</div>
              <div className="text-[11px] text-white/50"><span className="text-white/30 mr-1">Datum:</span>{new Date(o.createdAt).toLocaleString('de-AT')}</div>
              <div className="text-[11px] text-white/50 mt-0.5"><span className="text-white/30 mr-1">Zahlung:</span>{PAYMENT_MAP[o.paymentMethod] || o.paymentMethod}</div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate"><span className="text-white/50 font-normal mr-1">Kunde:</span>{o.customerName} <span className="mx-1 text-white/20">|</span> <span className="text-white/50 font-normal mr-1">Tel:</span>{o.customerPhone}</div>
              <div className="text-[11px] text-white/50 truncate mt-0.5"><span className="text-white/30 mr-1">Lieferadresse:</span>{o.street}, {o.postalCode} {o.city}</div>

              {o.acceptedBy && <div className="text-[11px] text-emerald-400/80 mt-2">Akzeptiert von: {o.acceptedBy.name}</div>}
              {o.acceptanceNote && <div className="text-[11px] text-emerald-300/70">Hinweis: {o.acceptanceNote}</div>}
              {o.declinedReason && <div className="text-[11px] text-red-300/80">Abgelehnt: {o.declinedReason}</div>}
            </div>
            <div className="lg:w-24 text-right shrink-0">
              <div className="font-bold">€ {Number(o.total).toFixed(2)}</div>
            </div>
            <div className="lg:w-auto shrink-0">{renderActions(o)}</div>
          </article>
        ))}
      </div>

      {totalPages > 1 && (
        <footer className="flex items-center justify-between px-5 py-3 border-t border-white/5 text-xs">
          <span className="text-white/40">Seite {rows.page} von {totalPages}</span>
          <div className="flex gap-2">
            <Pill onClick={() => onPage(rows.page - 1)} disabled={rows.page <= 1} className="bg-white/5 text-white/70 border-white/10">← Zurück</Pill>
            <Pill onClick={() => onPage(rows.page + 1)} disabled={rows.page >= totalPages} className="bg-white/5 text-white/70 border-white/10">Weiter →</Pill>
          </div>
        </footer>
      )}
    </section>
  );
}

function PromptModal({ open, title, defaultVal, onConfirm }) {
  const [val, setVal] = useState(defaultVal);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setVal(defaultVal);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open, defaultVal]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#111] border border-white/10 p-6 rounded-2xl w-full max-w-sm shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-xl font-display mb-4">{title}</h3>
        <input
          ref={inputRef}
          type="text"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onConfirm(val); if (e.key === 'Escape') onConfirm(null); }}
          className="input w-full mb-6"
        />
        <div className="flex gap-3 justify-end">
          <button onClick={() => onConfirm(null)} className="btn-ghost">Abbrechen</button>
          <button onClick={() => onConfirm(val)} className="btn-primary">OK</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function OrderDetailsModal({ order, onClose }) {
  if (!order) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-3xl shadow-2xl relative flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        <header className="flex justify-between items-center p-4 sm:p-6 border-b border-white/5 shrink-0">
          <h2 className="text-xl sm:text-2xl font-display">Bestellung {order.orderNumber}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white p-2 text-2xl leading-none">&times;</button>
        </header>

        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto min-h-0">
          {/* Customer & Order Meta */}
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold tracking-widest text-brand-500 mb-3 uppercase">Kunde</h3>
              <div className="space-y-1 text-sm bg-white/5 p-4 rounded-xl border border-white/5">
                <div className="flex justify-between"><span className="text-white/50">Name</span> <span>{order.customerName}</span></div>
                <div className="flex justify-between"><span className="text-white/50">Telefon</span> <span>{order.customerPhone}</span></div>
                <div className="flex justify-between"><span className="text-white/50">Adresse</span> <span className="text-right">{order.street}<br/>{order.postalCode} {order.city}</span></div>
                {order.notes && (
                   <div className="mt-3 pt-3 border-t border-white/10 text-yellow-400">
                     <span className="font-semibold block mb-1">Liefernotiz:</span>
                     {order.notes}
                   </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold tracking-widest text-brand-500 mb-3 uppercase">Status & Zahlung</h3>
              <div className="space-y-2 text-sm bg-white/5 p-4 rounded-xl border border-white/5">
                <div className="flex justify-between"><span className="text-white/50">Status</span> <span className="font-bold">{order.status}</span></div>
                <div className="flex justify-between"><span className="text-white/50">Methode</span> <span>{order.paymentMethod}</span></div>
                <div className="flex justify-between"><span className="text-white/50">Zahlungsstatus</span> <span>{order.paymentStatus}</span></div>
                <div className="flex justify-between"><span className="text-white/50">Datum</span> <span>{new Date(order.createdAt).toLocaleString('de-AT')}</span></div>
                {order.acceptedBy && (
                   <div className="mt-2 pt-2 border-t border-white/10 flex justify-between text-emerald-400"><span className="text-emerald-400/50">Akzeptiert von</span> <span>{order.acceptedBy.name}</span></div>
                )}
                {order.acceptanceNote && (
                   <div className="flex justify-between text-emerald-400"><span className="text-emerald-400/50">Hinweis</span> <span>{order.acceptanceNote}</span></div>
                )}
                {order.declinedReason && (
                   <div className="flex justify-between text-red-400"><span className="text-red-400/50">Ablehnungsgrund</span> <span>{order.declinedReason}</span></div>
                )}
              </div>
            </div>
          </div>

          {/* Items & Totals */}
          <div>
            <h3 className="text-sm font-semibold tracking-widest text-brand-500 mb-3 uppercase">Artikel ({order.items.length})</h3>
            <ul className="space-y-4 mb-6">
              {order.items.map((it) => {
                const itemTotal = Number(it.price) * it.quantity + (it.extras?.reduce((sum, ext) => sum + Number(ext.price) * ext.quantity, 0) || 0);
                const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
                const imageUrl = it.menuItem?.imageUrl;
                const imgSrc = imageUrl?.startsWith('/uploads/') ? `${baseUrl}${imageUrl}` : imageUrl;

                const groupedExtras = {};
                it.extras?.forEach(e => {
                  if (!groupedExtras[e.name]) groupedExtras[e.name] = { ...e, selectCount: 0 };
                  groupedExtras[e.name].selectCount += 1;
                });
                const extrasList = Object.values(groupedExtras);

                return (
                  <li key={it.id} className="flex flex-col gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex gap-4">
                      {imgSrc ? (
                        <img src={imgSrc} alt={it.name} className="w-16 h-16 object-cover rounded-lg shrink-0 border border-white/10" />
                      ) : (
                        <div className="w-16 h-16 bg-white/5 rounded-lg flex items-center justify-center text-white/20 text-xs shrink-0 border border-white/10">Ohne Bild</div>
                      )}
                      
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex items-start justify-between gap-4">
                          <span className="font-bold text-base leading-tight text-white/90">{it.quantity} × {it.name}</span>
                          <span className="font-bold text-base shrink-0 text-white/90">€ {(Number(it.price) * it.quantity).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    
                    {extrasList.length > 0 && (
                      <div className="text-[13px] text-white/60 space-y-1.5 pl-2 border-l-2 border-brand-500/30 ml-1">
                        {extrasList.map(e => {
                          const extraQty = e.selectCount * it.quantity;
                          const extraTotal = Number(e.price) * extraQty;
                          return (
                            <div key={e.id} className="flex justify-between items-center bg-white/[0.02] p-1.5 rounded">
                              <span className="truncate mr-4">+ {extraQty > 1 ? `${extraQty}× ` : ''}{e.name}</span>
                              <span className="shrink-0">
                                € {Number(e.price).toFixed(2)} × {extraQty} = <strong className="text-white/80 font-mono">€ {extraTotal.toFixed(2)}</strong>
                              </span>
                            </div>
                          );
                        })}
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/10 font-bold text-white/80">
                          <span>Artikel Gesamt</span>
                          <span className="font-mono text-brand-400">€ {itemTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                    
                    {it.notes && (
                      <div className="text-xs text-yellow-500/80 mt-1 bg-yellow-500/10 p-2.5 rounded-lg border border-yellow-500/20">
                        <span className="font-bold tracking-wider uppercase text-[10px] block mb-1 opacity-70">Anmerkung:</span>
                        {it.notes}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="space-y-2 bg-white/5 p-4 rounded-xl border border-white/5 text-sm">
              <div className="flex justify-between text-white/60"><span>Zwischensumme</span><span>€ {Number(order.subtotal).toFixed(2)}</span></div>
              <div className="flex justify-between text-white/60"><span>Lieferung</span><span>€ {Number(order.deliveryFee).toFixed(2)}</span></div>
              <div className="flex justify-between text-lg font-bold mt-2 pt-2 border-t border-white/10 text-brand-500">
                <span>Gesamt</span>
                <span>€ {Number(order.total).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <footer className="p-4 sm:p-6 border-t border-white/5 flex flex-wrap gap-2 justify-end bg-black/20 shrink-0">
           <button onClick={onClose} className="btn-outline text-sm py-2 px-4 h-auto">Schließen</button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
