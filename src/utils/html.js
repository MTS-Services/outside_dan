import DOMPurify from 'dompurify';

export function sanitizeHtml(html) {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'span'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}

export function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function hasHtmlContent(html) {
  return stripHtml(html).length > 0;
}
