import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCart } from '../store/cart';
import { useAuth } from '../store/auth';
import { ORDERS_CLOSED_MESSAGE, useOrderGuard } from '../store/siteSettings';
import Icon from '../components/Icon';

export default function Cart() {
  const { items, setQty, remove, subtotal } = useCart();
  const { token } = useAuth();
  const { canOrder } = useOrderGuard();
  const sub = subtotal();
  const fee = items.length ? 2.5 : 0;
  const total = sub + fee;
  const checkoutTo = token ? '/checkout' : '/login?next=/checkout';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <h1 className="text-5xl mb-8">DEIN WARENKORB</h1>

      {items.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-white/60 mb-6">Dein Warenkorb ist leer.</p>
          <Link to="/menu" className="btn-primary">Zur Speisekarte</Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          <div className="card divide-y divide-white/5">
            {items.map((i) => {
              const unit = Number(i.price) + (i.extras || []).reduce((s, e) => s + Number(e.price || 0), 0);
              return (
                <div key={i.lineId} className="p-4 flex gap-4 items-center">
                  {i.imageUrl ? (
                    <img src={i.imageUrl} alt={i.name} className="w-20 h-20 rounded-lg object-cover" />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-ink-700" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-xl tracking-wide truncate">{i.name}</div>
                    {i.extras?.length > 0 && (
                        <div className="text-xs text-brand-400 mt-1 max-h-12 overflow-y-auto w-full break-words">
                          + {i.extras.map((e) => e.name).join(', ')}
                        </div>
                      )}
                      {i.notes && (
                        <div className="text-xs text-white/50 italic mt-0.5 max-h-12 overflow-y-auto w-full break-words">
                          Anmerkung: {i.notes}
                        </div>
                      )}
                      <div className="text-white/50 text-sm mt-1">€ {unit.toFixed(2)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setQty(i.lineId, i.quantity - 1)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20">−</button>
                    <span className="w-8 text-center font-semibold">{i.quantity}</span>
                    <button onClick={() => setQty(i.lineId, i.quantity + 1)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20">+</button>
                  </div>
                  <div className="w-20 text-right font-bold">€ {(unit * i.quantity).toFixed(2)}</div>
                  <button onClick={() => remove(i.lineId)} className="text-white/40 hover:text-red-400 p-1" aria-label="Entfernen">
                    <Icon name="close" className="w-5 h-5" />
                  </button>
                </div>
              );
            })}
          </div>
          <aside className="card p-6 h-fit sticky top-20">
            <h3 className="text-2xl mb-4">ZUSAMMENFASSUNG</h3>
            <Row label="Zwischensumme" value={`€ ${sub.toFixed(2)}`} />
            <Row label="Lieferung" value={`€ ${fee.toFixed(2)}`} />
            <div className="border-t border-white/10 my-3" />
            <Row label="Gesamt" value={`€ ${total.toFixed(2)}`} bold />
            {!canOrder && (
              <p className="text-sm text-amber-400/90 mt-4">{ORDERS_CLOSED_MESSAGE}</p>
            )}
            {canOrder ? (
              <Link to={checkoutTo} className="btn-primary w-full mt-6 justify-center">
                Zur Kasse <Icon name="arrowRight" className="w-4 h-4" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => toast.error(ORDERS_CLOSED_MESSAGE)}
                className="btn-primary w-full mt-6 justify-center opacity-50 cursor-not-allowed"
              >
                Zur Kasse <Icon name="arrowRight" className="w-4 h-4" />
              </button>
            )}
            <Link to="/menu" className="btn-ghost w-full mt-2 justify-center">Mehr hinzufügen</Link>
          </aside>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className={`flex justify-between py-1 ${bold ? 'text-lg font-bold' : 'text-white/70'}`}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}
