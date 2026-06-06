import { useEffect, useState } from 'react';
import api from '../api/client';
import HtmlContent from '../components/HtmlContent';

export default function LegalPageView({ slug }) {
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    api.get(`/legal-pages/${slug}`)
      .then((r) => setPage(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center text-white/50">
        <div className="inline-block w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4">Seite wird geladen…</p>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center text-white/50">
        <h1 className="font-display text-4xl text-white mb-3">Seite nicht gefunden</h1>
        <p>Diese Seite ist derzeit nicht verfügbar.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="font-display text-5xl mb-8 tracking-wide">{page.title.toUpperCase()}</h1>
      <HtmlContent html={page.content} className="legal-page-content" />
    </div>
  );
}
