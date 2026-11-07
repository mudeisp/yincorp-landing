const ORIGIN='https://www.yincorp.com.br';
const ORG=ORIGIN+'/#organization';
const SITE=ORIGIN+'/#website';
const REGIONAL=/^\/(?:sp|es|rj|rs|sc|pr|pb|pe)(?:\/|$)/;
const SCRIPT=/(<script\b[^>]*type=["']application\/ld\+json["'][^>]*>)([\s\S]*?)(<\/script>)/gi;

/**
 * Link existing regional WebPage nodes to the canonical national identities.
 * Preserve all other JSON-LD nodes and avoid introducing duplicate identities.
 * Fail closed: unknown schema or invalid JSON is returned unchanged.
 */
export function linkNationalEntities(html,path){
  if(typeof html!=='string'||!REGIONAL.test(path)||!/<html[\s>]/i.test(html))return html;
  return html.replace(SCRIPT,(full,open,source,close)=>{
    let data;
    try{data=JSON.parse(source)}catch{return full}
    const graph=Array.isArray(data?.['@graph'])?data['@graph']:Array.isArray(data)?data:[data];
    if(!graph.some(node=>node&&typeof node==='object'&&hasType(node,'WebPage')))return full;
    let changed=false;
    for(const node of graph){
      if(!node||typeof node!=='object'||!hasType(node,'WebPage'))continue;
      if(node.isPartOf===undefined){node.isPartOf={'@id':SITE};changed=true}
      if(node.publisher===undefined){node.publisher={'@id':ORG};changed=true}
    }
    if(!changed)return full;
    return open+JSON.stringify(data).replace(/</g,'\\u003c')+close;
  });
}
function hasType(node,type){
  return node['@type']===type||(Array.isArray(node['@type'])&&node['@type'].includes(type));
}
