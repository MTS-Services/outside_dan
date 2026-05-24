import { sanitizeHtml, hasHtmlContent } from '../utils/html';

export default function HtmlContent({ html, className = '' }) {
  if (!hasHtmlContent(html)) return null;
  return (
    <div
      className={`rich-text-body rich-text-content ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
    />
  );
}
