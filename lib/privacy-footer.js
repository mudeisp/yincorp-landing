export const PRIVACY_PATH='/politica-de-privacidade';
/** Presentation only: preserve non-HTML responses, lead handlers and tracking. */
export function withPrivacyFooter(body){
 if(typeof body!=='string'||!/<footer\b/i.test(body))return body;
 const html=body.replaceAll('href="/politica-de-privacidade.html"',`href="${PRIVACY_PATH}"`);
 if(/<footer\b[\s\S]*?href="\/politica-de-privacidade"[\s\S]*?<\/footer>/i.test(html))return html;
 return html.replace(/<\/footer>/i,`<div class="wrap" style="padding-top:16px;padding-bottom:24px"><a href="${PRIVACY_PATH}">Política de Privacidade</a></div></footer>`);
}
