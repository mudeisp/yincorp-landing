export const footerStyles = '<link rel="stylesheet" href="/home-assets/site-footer.css">';
const privacyLink = '<a href="/politica-de-privacidade">Política de Privacidade</a>';

export function renderSiteFooter({ links = '', details = '', note = '', showPrivacy = true } = {}) {
  return `<footer class="yi-site-footer"><div class="yi-footer-wrap">
    <div class="yi-footer-opening">
      <a class="yi-brand-mark" href="/" aria-label="Yincorp Places Worth Living — início"><strong>yincorp</strong><span>PLACES WORTH LIVING</span></a>
      <p>Lugares onde<br>vale a pena viver.</p>
    </div>
    ${links ? `<nav class="yi-footer-links" aria-label="Explorar a região">${links}</nav>` : ''}
    ${details ? `<div class="yi-footer-details">${details}</div>` : ''}
    ${showPrivacy || note ? `<div class="yi-footer-legal">${showPrivacy ? privacyLink : ''}${note ? `<p>${note}</p>` : ''}</div>` : ''}
  </div></footer>`;
}

const footer = /<footer\b[^>]*>([\s\S]*?)<\/footer>/i;
const anchor = /<a\b[^>]*>[\s\S]*?<\/a>/gi;

function keepLink(link) {
  const href = link.match(/\bhref\s*=\s*["']([^"']+)/i)?.[1] ?? '';
  return !/^(?:https?:\/\/www\.yincorp\.com\.br)?\/sitemap(?:-portal)?\.xml(?:[?#]|$)/i.test(href)
    && !/^https?:\/\/app\.yincorp\.com\.br(?:[/?#]|$)/i.test(href)
    && !/places worth living/i.test(link);
}

// Static presentations can contain bespoke commercial disclosures and controls.
export function applySiteFooter(html, { rental = false } = {}) {
  if (typeof html !== 'string' || !/<\/body>/i.test(html) || !/<\/head>/i.test(html)
    || /<meta\b[^>]*http-equiv=["']?refresh/i.test(html)
    || /<footer class="yi-site-footer"/i.test(html)) return html;

  const existing = html.match(footer)?.[1] ?? '';
  let links = '';
  let note = '';
  let details = existing.replace(anchor, link => keepLink(link) ? link : '')
    .replace(/<p\b[^>]*>\s*Lugares onde(?:\s|<br\s*\/?>)+vale a pena viver\.?\s*<\/p>/gi, '');

  if (rental || /class="footer-copy"/.test(existing)) {
    links = (existing.match(anchor) ?? [])
      .filter(link => keepLink(link) && !/\/politica-de-privacidade\b/i.test(link)).join('');
    note = existing.match(/<p>(Imagens[^<]+)<\/p>/i)?.[1] ?? '';
    details = '';
  }

  const markup = renderSiteFooter({ links, note, details,
    showPrivacy: !/\bhref=["'][^"']*\/politica-de-privacidade(?:\.html)?\/?["']/i.test(details) });
  const result = existing || footer.test(html)
    ? html.replace(footer, () => markup)
    : html.replace(/<\/body>/i, closing => markup + closing);
  return result.replace(/<\/head>/i, closing => footerStyles + closing);
}
