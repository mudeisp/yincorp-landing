import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const read=p=>readFile(new URL(p,import.meta.url),'utf8');

test('all local module imports and WhatsApp asset URLs resolve through the production manifest',async()=>{
  const manifest=JSON.parse(await read('portal-source.json')),config=JSON.parse(await read('vercel.json'));
  for(const f of manifest.files.filter(f=>f.destination.endsWith('.js'))){
    const source=await read(f.destination);
    for(const match of source.matchAll(/(?:from\s*|import\s*\(?\s*)['"](\.\/[^'"]+\.js)['"]/g)){
      const target=f.destination.slice(0,f.destination.lastIndexOf('/')+1)+match[1].slice(2);
      assert.ok(manifest.files.some(f=>f.destination===target),`${f.destination} needs ${target}`);
    }
  }
  for(const [source,destination] of [['/assets/js/whatsapp-contact.js','/portal-assets/whatsapp-contact.js'],['/assets/css/whatsapp-float.css','/portal-assets/whatsapp-float.css']]){
    assert.ok(config.rewrites.some(r=>r.source===source&&r.destination===destination));
    assert.ok(manifest.files.some(f=>'/'+f.destination===destination));
  }
});

test('ES development SSR ships the float stylesheet and keeps availability bound to the form',async()=>{
  const {createPortalHandler}=await import('./.portal-shared/router.js');
  const inventory=async()=>[{id:'unit',building_id:'1',external_id:'orulo:1:1',active:true,state:'ES',city:'Vitória',neighborhood:'Mata da Praia',development_name:'Projeto real',price:600000,area:35,bedrooms:1,typology_type:'Apartamento'}];
  let html;const res={setHeader(){},status(n){assert.equal(n,200);return this;},send(s){html=s;},end(){}};
  const handler=createPortalHandler({inventory,canonicalOrigin:'https://www.yincorp.com.br'});
  await handler({method:'GET',url:'/es'},res);
  const path=html.match(/href="([^"]+\/empreendimento\/[^"?]+)"/)[1];
  await handler({method:'GET',url:path},res);
  assert.match(html,/href="\/assets\/css\/whatsapp-float.css"/);
  assert.match(html,/floating-property-contact[\s\S]*?data-contact=""[^>]*>Consultar disponibilidade/);
  assert.match(html,/"preview":false/);
});

for(const selected of [false,true])test(`generated ES browser mounts one independent icon (${selected?'unit':'development'})`,async()=>{
  const nodes={},events=[],navigations=[];
  const element=()=>({hidden:false,listeners:{},dataset:{},addEventListener(n,fn){this.listeners[n]=fn;},setAttribute(){},querySelector(){return element();},replaceChildren(){}});
  const dialog=element();dialog.showModal=()=>dialog.open=true;dialog.close=()=>dialog.open=false;
  const form=element();form.elements={unit:{value:''}};
  const availability=element();availability.dataset.contact='';
  const unit={id:'external-unit',db_id:'unit',name:'Projeto real',city:'Vitória',value:600000};
  nodes['portal-data']={textContent:JSON.stringify({kind:selected?'unit':'development',project:{name:'Projeto real',city:'Vitória',token:'orulo-1',units:[unit]},selectedUnit:selected?'unit':''})};
  nodes['contact-dialog']=dialog;nodes['portal-lead']=form;nodes['contact-feedback']=element();
  const storage={getItem:()=>null,setItem(){}};
  const context=vm.createContext({console,URL,URLSearchParams,Date,Promise,setTimeout,clearTimeout,localStorage:storage,sessionStorage:storage,
    window:{},location:{pathname:'/es/serra/empreendimento/projeto',search:'',hostname:'www.yincorp.com.br',href:'https://www.yincorp.com.br/es/serra/empreendimento/projeto',assign:u=>navigations.push(u)},
    document:{body:{appendChild:e=>nodes[e.id]=e},referrer:'',createElement:element,getElementById:id=>nodes[id],querySelector:s=>s.startsWith('dialog[open]')&&dialog.open?dialog:null,querySelectorAll:s=>s==='[data-contact]'?[availability]:[],addEventListener(){}},
    __tracking:{sessionId:'test',track:n=>events.push(n),adsTrack:n=>events.push(n),touch(){}},submitInterest(){throw Error('Unexpected lead submission');}
  });
  vm.runInContext(await read('portal-assets/whatsapp-contact.js'),context);
  const portal=(await read('portal-assets/portal.js')).replace(/^import .*;\r?\n/gm,'').replace("await import('./portal-session.js')",'__tracking');
  await vm.runInContext('(async()=>{'+portal+'})()',context);
  const icon=nodes['ynt-whatsapp-float'];assert.ok(icon);assert.equal(icon.hidden,false);
  assert.equal(context.YntWhatsAppContact.mountFloating({resolveProperty:()=>unit}),icon);
  // Restore the real tracking adapters after checking duplicate-mount protection.
  icon.yntContact.getOptions=()=>({track:n=>events.push(n),adsTrack:n=>events.push(n)});
  availability.listeners.click();assert.equal(dialog.open,true);icon.yntRefresh();assert.equal(icon.hidden,true);
  dialog.close();icon.yntRefresh();assert.equal(icon.hidden,false);events.length=0;
  icon.listeners.click();await new Promise(r=>setTimeout(r,10));
  assert.deepEqual(events,['whatsapp_cta_clicked','whatsapp_cta_clicked']);assert.equal(dialog.open,false);
  assert.equal(navigations.length,1);assert.match(navigations[0],/^https:\/\/wa.me\//);
});
