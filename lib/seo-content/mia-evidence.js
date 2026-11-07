import {extractText} from './sources.js';
import {hash} from './core.js';
export function miaSearchTermSummary({html,url,observedAt}){
  if(url!=='https://media-intelligence-agent-eight.vercel.app/search-terms'||!Number.isFinite(Date.parse(observedAt)))throw Error('mia_scope_rejected');
  const text=extractText(html);
  if(!text.includes('LIVE Fonte: Google Ads API LAST_7_DAYS READ-ONLY')||!text.includes('Mídia real por campanha, grupo e termo.'))throw Error('mia_live_provenance_missing');
  const value=pattern=>{const match=pattern.exec(text);if(!match)throw Error('mia_metric_unavailable');const n=Number(match[1]);if(!Number.isFinite(n)||n<0)throw Error('mia_metric_invalid');return n;};
  return {provider:'existing MIA Google Ads read-only SSR',url,observedAt,window:'LAST_7_DAYS',status:'CONNECTED_READ',termsVisible:value(/Termos visíveis \(por campanha e grupo\) ([\d.]+)/),impressions:value(/Impressões dos termos visíveis ([\d.]+)/),clicks:value(/Cliques dos termos visíveis ([\d.]+)/),costBRL:value(/Custo dos termos visíveis \(BRL\) R\$ ([\d.]+)/),conversionsGoogleAds:value(/Conversões Google Ads dos termos visíveis ([\d.]+)/),htmlDigest:hash(html),limitations:['Aggregated visible-term metrics, not leads or exhaustive traffic','No geographic or article attribution inferred from campaign names','Captured via authenticated Vercel connector; runtime refresh requires scoped read transport']};
}
