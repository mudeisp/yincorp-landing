export function compactAmenitiesPreview(body, environment = process.env.VERCEL_ENV) {
  if (environment !== 'preview' || typeof body !== 'string') return body;
  return body.replace(/<section\b[^>]*\bid="diferenciais"[^>]*>[\s\S]*?<\/section>/g, section => {
    if (!section.includes('art-amenities--illustrated') || !section.includes('art-amenities-list')) return section;
    return section
      .replace(/<figure\b[^>]*\bclass="art-photo art-street"[^>]*>[\s\S]*?<\/figure>/, '')
      .replace(' art-amenities--illustrated', '');
  });
}
