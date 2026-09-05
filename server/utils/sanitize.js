const sanitizeHtml = require('sanitize-html');

/**
 * Sanitizes rich article HTML coming from the admin editor before it is
 * ever persisted or rendered publicly. Allowlist matches exactly the
 * formatting tools the article editor exposes (headings, paragraphs,
 * bold/italic/underline/strike, alignment, lists, blockquote, links,
 * images with captions, tables, hr). Everything else — scripts, iframes,
 * event handlers, style/onX attributes, etc — is stripped.
 */
const ARTICLE_HTML_OPTIONS = {
  allowedTags: [
    'h1', 'h2', 'h3', 'p', 'br', 'strong', 'em', 'u', 's',
    'a', 'ul', 'ol', 'li', 'blockquote', 'img', 'figure', 'figcaption',
    'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'span',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    span: ['style'],
    p: ['style'],
    '*': ['class'],
  },
  // Only allow the text-align inline style used by the editor's alignment
  // tool — nothing else in `style` gets through.
  allowedStyles: {
    '*': {
      'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/],
    },
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
  },
};

function sanitizeArticleContent(rawHtml) {
  return sanitizeHtml(rawHtml || '', ARTICLE_HTML_OPTIONS);
}

/**
 * Strips ALL tags — used for plain-text fields like excerpts, submission
 * text, or anywhere HTML has no business appearing at all.
 */
function stripAllHtml(rawText) {
  return sanitizeHtml(rawText || '', { allowedTags: [], allowedAttributes: {} });
}

module.exports = { sanitizeArticleContent, stripAllHtml };
