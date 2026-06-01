import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import api from '../../api/client';
import OrdersAcceptedToggle from '../../components/OrdersAcceptedToggle';

/* ── icons (inline SVG to avoid extra deps) ─────────────── */
const icons = {
  revenue:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  pending:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
  orders:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>,
  today:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  top:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
};

export default function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);

  useEffect(() => {
    api.get('/orders/admin/dashboard')
      .then((r) => setStats(r.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!stats || !containerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo('.stat-card',
        { opacity: 0, y: 30, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.08, ease: 'power3.out' }
      );
      gsap.fromTo('.chart-card',
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.12, ease: 'power3.out', delay: 0.4 }
      );
    }, containerRef);
    return () => ctx.revert();
  }, [stats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!stats) {
    return <div className="p-8 text-white/50">Daten konnten nicht geladen werden.</div>;
  }

  const cards = [
    { label: 'Gesamtumsatz',   value: `€ ${Number(stats.totalPayment || 0).toFixed(2)}`,  accent: '#D9AF47', icon: icons.revenue, bg: 'from-[#D9AF47]/20 to-[#D9AF47]/5' },
    { label: 'Ausstehend',     value: stats.pendingOrders ?? 0,                           accent: '#D9AF47', icon: icons.pending, bg: 'from-[#D9AF47]/20 to-[#D9AF47]/5' },
    { label: 'Bestellungen',   value: stats.totalOrders || 0,                              accent: '#D9AF47', icon: icons.orders,  bg: 'from-[#D9AF47]/20 to-[#D9AF47]/5' },
    { label: 'Umsatz (heute)', value: `€ ${Number(stats.revenue || 0).toFixed(2)}`,        accent: '#D9AF47', icon: icons.today,   bg: 'from-[#D9AF47]/20 to-[#D9AF47]/5' },
  ];

  return (
    <div ref={containerRef} className="p-4 sm:p-6 space-y-6">
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-white">Übersicht</h1>
          <p className="text-sm text-white/40 mt-0.5">Echtzeit-Statistiken deines Restaurants</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-[#D9AF47] font-semibold bg-[#D9AF47]/10 px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D9AF47]" />
          Live
        </span>
      </div>

      <OrdersAcceptedToggle />

      {/* stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`stat-card relative rounded-2xl overflow-hidden border border-white/5 p-5 bg-gradient-to-br ${c.bg}`}
          >
            {/* glow dot top-right */}
            <div className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/5" style={{ color: c.accent }}>
              {c.icon}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-white/40 mb-3 pr-8">{c.label}</div>
            <div className="text-xl font-bold leading-tight truncate" style={{ color: c.accent }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* charts */}
      <div className="grid lg:grid-cols-2 gap-4">
        <BarChart
          title="Bestellungen pro Stunde (heute)"
          subtitle="Letzte 24 Stunden"
          data={stats.hourBuckets || []}
          accent="#D9AF47"
          labels={Array.from({ length: 24 }, (_, i) => `${i}h`)}
          formatValue={(v) => `${v}`}
        />
        <AreaChart
          title="Umsatz letzte 14 Tage"
          subtitle="Tagesverlauf"
          data={(stats.days || []).map((d) => Number(d.total) || 0)}
          accent="#3b82f6"
          labels={(stats.days || []).map((d) => (d.date || '').slice(5))}
          formatValue={(v) => `€ ${v.toFixed(2)}`}
        />
      </div>

      {/* dual line chart: new vs accepted orders */}
      <DualLineChart
        title="Neue vs. akzeptierte Bestellungen"
        subtitle="Letzte 14 Tage"
        labels={(stats.orderFlow || []).map((d) => (d.date || '').slice(5))}
        seriesA={{ name: 'Neue Bestellungen', accent: '#D9AF47', data: (stats.orderFlow || []).map((d) => Number(d.newOrders) || 0) }}
        seriesB={{ name: 'Akzeptiert',        accent: '#10b981', data: (stats.orderFlow || []).map((d) => Number(d.accepted)  || 0) }}
      />
    </div>
  );
}

/* ── Bar chart with gsap height-grow animation + hover tooltip ─────────── */
function BarChart({ title, subtitle, data, accent, labels, formatValue }) {
  const ref = useRef(null);
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...data);
  const w = 600, h = 200, padX = 32, padY = 28;
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;
  const gap = 3;
  const barW = data.length ? Math.max(2, (innerW - gap * (data.length - 1)) / data.length) : 0;
  const gradId = `bgrad-${accent.replace('#', '')}`;

  useEffect(() => {
    if (!ref.current || !data.length) return;
    gsap.fromTo(
      ref.current.querySelectorAll('.bar-rect'),
      { scaleY: 0, transformOrigin: 'bottom' },
      { scaleY: 1, duration: 0.8, stagger: 0.02, ease: 'power3.out', delay: 0.5 }
    );
  }, [data]);

  return (
    <div className="chart-card rounded-2xl bg-white/[0.03] border border-white/5 p-5 relative">
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm font-semibold text-white/80">{title}</div>
        <div className="text-[10px] text-white/30 font-medium uppercase tracking-wide">Max: {formatValue(max)}</div>
      </div>
      <div className="text-xs text-white/30 mb-4">{subtitle}</div>
      {data.length === 0 ? (
        <div className="h-44 grid place-items-center text-white/25 text-sm">Keine Daten vorhanden</div>
      ) : (
        <svg ref={ref} viewBox={`0 0 ${w} ${h}`} className="w-full h-48" preserveAspectRatio="none">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="1" />
              <stop offset="100%" stopColor={accent} stopOpacity="0.25" />
            </linearGradient>
          </defs>
          {/* grid */}
          {[0.25, 0.5, 0.75, 1].map((t) => {
            const y = h - padY - t * innerH;
            return <line key={t} x1={padX} y1={y} x2={w - padX} y2={y} stroke="white" strokeOpacity="0.05" strokeWidth="1" />;
          })}
          {/* bars */}
          {data.map((v, i) => {
            const bh = (v / max) * innerH;
            const x = padX + i * (barW + gap);
            const y = h - padY - bh;
            return (
              <g key={i}>
                <rect
                  className="bar-rect"
                  x={x}
                  y={y}
                  width={barW}
                  height={Math.max(bh, 0.5)}
                  rx={Math.min(3, barW / 2)}
                  fill={`url(#${gradId})`}
                  onMouseEnter={() => setHover({ i, v, x: x + barW / 2, y })}
                  onMouseLeave={() => setHover(null)}
                  style={{ cursor: 'pointer' }}
                />
              </g>
            );
          })}
          {/* x-axis labels every 4th */}
          {labels.map((l, i) =>
            i % 4 === 0 ? (
              <text key={i} x={padX + i * (barW + gap) + barW / 2} y={h - 8} fill="white" fillOpacity="0.3" fontSize="10" textAnchor="middle">
                {l}
              </text>
            ) : null
          )}
        </svg>
      )}
      {hover && (
        <div
          className="absolute pointer-events-none px-2.5 py-1.5 rounded-lg bg-black/90 border border-white/10 text-xs text-white shadow-xl"
          style={{
            left: `${(hover.x / w) * 100}%`,
            top: `calc(${(hover.y / h) * 100}% + 40px)`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="font-semibold" style={{ color: accent }}>{formatValue(hover.v)}</div>
          <div className="text-[10px] text-white/50">{labels[hover.i]}</div>
        </div>
      )}
    </div>
  );
}

/* ── Smooth area chart with animated path ─────────────────────────────── */
function AreaChart({ title, subtitle, data, accent, labels, formatValue }) {
  const ref = useRef(null);
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...data);
  const w = 600, h = 200, padX = 32, padY = 28;
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;
  const pts = data.map((v, i) => [padX + i * stepX, h - padY - (v / max) * innerH]);
  // smooth bezier path
  const smooth = (() => {
    if (pts.length < 2) return '';
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      const cx = (x0 + x1) / 2;
      d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
    }
    return d;
  })();
  const areaD = pts.length ? `${smooth} L ${pts[pts.length - 1][0]} ${h - padY} L ${pts[0][0]} ${h - padY} Z` : '';
  const gradId = `agrad-${accent.replace('#', '')}`;

  useEffect(() => {
    if (!ref.current || !data.length) return;
    const line = ref.current.querySelector('.area-line');
    const len = line?.getTotalLength?.() || 0;
    if (len) {
      gsap.fromTo(
        line,
        { strokeDasharray: len, strokeDashoffset: len },
        { strokeDashoffset: 0, duration: 1.4, ease: 'power2.out', delay: 0.5 }
      );
    }
    gsap.fromTo(
      ref.current.querySelector('.area-fill'),
      { opacity: 0 },
      { opacity: 1, duration: 1, delay: 1.2, ease: 'power2.out' }
    );
    gsap.fromTo(
      ref.current.querySelectorAll('.area-dot'),
      { opacity: 0, scale: 0 },
      { opacity: 1, scale: 1, duration: 0.3, stagger: 0.05, ease: 'back.out(2)', delay: 1.5 }
    );
  }, [data]);

  return (
    <div className="chart-card rounded-2xl bg-white/[0.03] border border-white/5 p-5 relative">
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm font-semibold text-white/80">{title}</div>
        <div className="text-[10px] text-white/30 font-medium uppercase tracking-wide">Max: {formatValue(max)}</div>
      </div>
      <div className="text-xs text-white/30 mb-4">{subtitle}</div>
      {data.length === 0 ? (
        <div className="h-44 grid place-items-center text-white/25 text-sm">Keine Daten vorhanden</div>
      ) : (
        <svg ref={ref} viewBox={`0 0 ${w} ${h}`} className="w-full h-48">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.4" />
              <stop offset="100%" stopColor={accent} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75, 1].map((t) => {
            const y = h - padY - t * innerH;
            return <line key={t} x1={padX} y1={y} x2={w - padX} y2={y} stroke="white" strokeOpacity="0.05" strokeWidth="1" />;
          })}
          <path className="area-fill" d={areaD} fill={`url(#${gradId})`} />
          <path className="area-line" d={smooth} fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {pts.map(([x, y], i) => (
            <circle
              key={i}
              className="area-dot"
              cx={x}
              cy={y}
              r="4"
              fill={accent}
              stroke="#0f0f0f"
              strokeWidth="1.5"
              onMouseEnter={() => setHover({ i, v: data[i], x, y })}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: 'pointer' }}
            />
          ))}
          {labels.map((l, i) =>
            i % 2 === 0 ? (
              <text key={i} x={padX + i * stepX} y={h - 8} fill="white" fillOpacity="0.3" fontSize="10" textAnchor="middle">
                {l}
              </text>
            ) : null
          )}
        </svg>
      )}
      {hover && (
        <div
          className="absolute pointer-events-none px-2.5 py-1.5 rounded-lg bg-black/90 border border-white/10 text-xs text-white shadow-xl"
          style={{
            left: `${(hover.x / w) * 100}%`,
            top: `calc(${(hover.y / h) * 100}% + 40px)`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="font-semibold" style={{ color: accent }}>{formatValue(hover.v)}</div>
          <div className="text-[10px] text-white/50">{labels[hover.i]}</div>
        </div>
      )}
    </div>
  );
}


/* -- Dual line chart: compares two series (e.g. new vs accepted) -- */
function DualLineChart({ title, subtitle, labels, seriesA, seriesB }) {
  const ref = useRef(null);
  const [hover, setHover] = useState(null);
  const w = 1200, h = 240, padX = 40, padY = 32;
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;
  const len = Math.max(seriesA.data.length, seriesB.data.length);
  const max = Math.max(1, ...seriesA.data, ...seriesB.data);
  const stepX = len > 1 ? innerW / (len - 1) : 0;

  const buildPts = (data) => data.map((v, i) => [padX + i * stepX, h - padY - (v / max) * innerH]);
  const buildSmooth = (pts) => {
    if (pts.length < 2) return '';
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      const cx = (x0 + x1) / 2;
      d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
    }
    return d;
  };

  const ptsA = buildPts(seriesA.data);
  const ptsB = buildPts(seriesB.data);
  const pathA = buildSmooth(ptsA);
  const pathB = buildSmooth(ptsB);
  const gradA = `dgrad-a-${seriesA.accent.replace('#', '')}`;
  const gradB = `dgrad-b-${seriesB.accent.replace('#', '')}`;
  const areaA = ptsA.length ? `${pathA} L ${ptsA[ptsA.length - 1][0]} ${h - padY} L ${ptsA[0][0]} ${h - padY} Z` : '';
  const areaB = ptsB.length ? `${pathB} L ${ptsB[ptsB.length - 1][0]} ${h - padY} L ${ptsB[0][0]} ${h - padY} Z` : '';

  useEffect(() => {
    if (!ref.current) return;
    const lines = ref.current.querySelectorAll('.dual-line');
    lines.forEach((line) => {
      const total = line.getTotalLength?.() || 0;
      if (total) {
        gsap.fromTo(
          line,
          { strokeDasharray: total, strokeDashoffset: total },
          { strokeDashoffset: 0, duration: 1.4, ease: 'power2.out', delay: 0.5 }
        );
      }
    });
    gsap.fromTo(
      ref.current.querySelectorAll('.dual-fill'),
      { opacity: 0 },
      { opacity: 1, duration: 1, delay: 1.2, ease: 'power2.out' }
    );
    gsap.fromTo(
      ref.current.querySelectorAll('.dual-dot'),
      { opacity: 0, scale: 0 },
      { opacity: 1, scale: 1, duration: 0.3, stagger: 0.04, ease: 'back.out(2)', delay: 1.4 }
    );
  }, [seriesA.data, seriesB.data]);

  return (
    <div className="chart-card rounded-2xl bg-white/[0.03] border border-white/5 p-5 relative">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <div>
          <div className="text-sm font-semibold text-white/80">{title}</div>
          <div className="text-xs text-white/30">{subtitle}</div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-white/70">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: seriesA.accent }} />
            {seriesA.name}
          </span>
          <span className="flex items-center gap-1.5 text-white/70">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: seriesB.accent }} />
            {seriesB.name}
          </span>
          <span className="text-[10px] text-white/30 font-medium uppercase tracking-wide">Max: {max}</span>
        </div>
      </div>
      {len === 0 ? (
        <div className="h-56 grid place-items-center text-white/25 text-sm">Keine Daten vorhanden</div>
      ) : (
        <svg ref={ref} viewBox={`0 0 ${w} ${h}`} className="w-full h-56 mt-3">
          <defs>
            <linearGradient id={gradA} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={seriesA.accent} stopOpacity="0.35" />
              <stop offset="100%" stopColor={seriesA.accent} stopOpacity="0" />
            </linearGradient>
            <linearGradient id={gradB} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={seriesB.accent} stopOpacity="0.35" />
              <stop offset="100%" stopColor={seriesB.accent} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75, 1].map((t) => {
            const y = h - padY - t * innerH;
            return <line key={t} x1={padX} y1={y} x2={w - padX} y2={y} stroke="white" strokeOpacity="0.05" strokeWidth="1" />;
          })}
          <path className="dual-fill" d={areaA} fill={`url(#${gradA})`} />
          <path className="dual-fill" d={areaB} fill={`url(#${gradB})`} />
          <path className="dual-line" d={pathA} fill="none" stroke={seriesA.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path className="dual-line" d={pathB} fill="none" stroke={seriesB.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {ptsA.map(([x, y], i) => (
            <circle
              key={`a-${i}`}
              className="dual-dot"
              cx={x}
              cy={y}
              r="4"
              fill={seriesA.accent}
              stroke="#0f0f0f"
              strokeWidth="1.5"
              onMouseEnter={() => setHover({ i, x, y, accent: seriesA.accent, name: seriesA.name, v: seriesA.data[i], other: { name: seriesB.name, v: seriesB.data[i], accent: seriesB.accent } })}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: 'pointer' }}
            />
          ))}
          {ptsB.map(([x, y], i) => (
            <circle
              key={`b-${i}`}
              className="dual-dot"
              cx={x}
              cy={y}
              r="4"
              fill={seriesB.accent}
              stroke="#0f0f0f"
              strokeWidth="1.5"
              onMouseEnter={() => setHover({ i, x, y, accent: seriesB.accent, name: seriesB.name, v: seriesB.data[i], other: { name: seriesA.name, v: seriesA.data[i], accent: seriesA.accent } })}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: 'pointer' }}
            />
          ))}
          {labels.map((l, i) =>
            i % 2 === 0 ? (
              <text key={i} x={padX + i * stepX} y={h - 10} fill="white" fillOpacity="0.3" fontSize="10" textAnchor="middle">
                {l}
              </text>
            ) : null
          )}
        </svg>
      )}
      {hover && (
        <div
          className="absolute pointer-events-none px-3 py-2 rounded-lg bg-black/90 border border-white/10 text-xs text-white shadow-xl"
          style={{
            left: `${(hover.x / w) * 100}%`,
            top: `calc(${(hover.y / h) * 100}% + 60px)`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="text-[10px] text-white/50 mb-1">{labels[hover.i]}</div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: hover.accent }} />
            <span className="font-semibold" style={{ color: hover.accent }}>{hover.v}</span>
            <span className="text-white/50">{hover.name}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full" style={{ background: hover.other.accent }} />
            <span className="font-semibold" style={{ color: hover.other.accent }}>{hover.other.v}</span>
            <span className="text-white/50">{hover.other.name}</span>
          </div>
        </div>
      )}
    </div>
  );
}