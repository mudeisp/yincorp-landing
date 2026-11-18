import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {createHash,webcrypto} from 'node:crypto';
const read=p=>readFile(new URL(p,import.meta.url),'utf8');

test('all local module imports and WhatsApp asset URLs resolve through the production manifest',async()=>{
  const manifest=JSON.parse(await read('portal-source.json')),config=JSON.parse(await read('vercel.json'));
  for(const f of manifest.files.filter(f=>f.destination.endsWith('.js'))){
    const source=await read(f.destination);
    for(const match of source.matchAll(/(?:from\s*|import\s*\(?\s*)['"](\.\/[^'"]+\.js)['"]/g)){
      const target=f.destination.slice(0,f.destination.lastIndexOf('/')+1)+match[1].slice(2);
      if(!manifest.files.some(f=>f.destination===target))assert.ok((await read(target)).length,`${f.destination} needs ${target}`);
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
  assert.match(html,/<button class="button primary" data-contact="">Consultar disponibilidade ↗<\/button>/);
  assert.doesNotMatch(html,/floating-property-contact|data-whatsapp|Prefiro deixar meus dados/);
  assert.match(html,/"preview":false/);
});

for(const selected of [false,true])test(`generated ES browser mounts one independent icon (${selected?'unit':'development'})`,async()=>{
  const nodes={},events=[],navigations=[];
  const element=()=>({hidden:false,listeners:{},dataset:{},addEventListener(n,fn){this.listeners[n]=fn;},setAttribute(){},focus(){},querySelector(){return element();},replaceChildren(){}});
  const dialog=element();dialog.showModal=()=>dialog.open=true;dialog.close=()=>dialog.open=false;
  const form=element();form.elements={unit:{value:''}};
  const availability=element();availability.dataset.contact='';
  const unit={id:'external-unit',db_id:'unit',name:'Projeto real',city:'Vitória',value:600000};
  nodes['portal-data']={textContent:JSON.stringify({kind:selected?'unit':'development',project:{name:'Projeto real',city:'Vitória',token:'orulo-1',units:[unit]},selectedUnit:selected?'unit':''})};
  nodes['contact-dialog']=dialog;nodes['portal-lead']=form;nodes['contact-feedback']=element();
  const storage={getItem:()=>null,setItem(){}};
  const context=vm.createContext({console,URL,URLSearchParams,Date,Promise,setTimeout,clearTimeout,crypto:webcrypto,localStorage:storage,sessionStorage:storage,
    window:{},location:{pathname:'/es/serra/empreendimento/projeto',search:'',hostname:'www.yincorp.com.br',href:'https://www.yincorp.com.br/es/serra/empreendimento/projeto',assign:u=>navigations.push(u)},
    document:{body:{appendChild:e=>nodes[e.id]=e},referrer:'',createElement:tag=>{const el=element();if(tag==='dialog'){const parts={};el.querySelector=selector=>parts[selector]??=element();el.showModal=()=>el.open=true;el.close=()=>el.open=false;}return el;},getElementById:id=>nodes[id],querySelector:s=>s.startsWith('dialog[open]')&&dialog.open?dialog:null,querySelectorAll:s=>s==='[data-contact]'?[availability]:[],addEventListener(){}},
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
  icon.listeners.click();
   const registration=nodes['ynt-whatsapp-registration'];assert.ok(registration);assert.equal(registration.open,true);
   assert.deepEqual(events,[]);assert.equal(navigations.length,0);
   registration.querySelector('.wa-registration-skip').listeners.click();
   await new Promise(r=>setTimeout(r,10));
  assert.deepEqual(events,['whatsapp_cta_clicked','whatsapp_cta_clicked']);assert.equal(dialog.open,false);
  assert.equal(navigations.length,1);assert.match(navigations[0],/^https:\/\/wa.me\//);
});

test('approved Travertino presentation retains reviewed integrity hashes',async()=>{
  assert.equal(createHash('sha256').update(await read('.portal-shared/architecture.js')).digest('hex'),'fb5f3535868175ade595bf72c6a0386a7250076b3ff7c3acf5034d57ca2df66c');
  assert.equal(createHash('sha256').update(await read('.portal-shared/editorial.js')).digest('hex'),'ba01973c067ca68e27e7df1a3875f83b7469c3ec831c27aa1a8a14ec178814b7');
  assert.equal(createHash('sha256').update(await read('portal-assets/portal-editorial.css')).digest('hex'),'7471cf71029c9d459e8ab700a37d5af84a8622d5d8d9e30ffb3d22ca10ce2e4c');
  assert.equal(createHash('sha256').update(await read('portal-assets/property-story.css')).digest('hex'),'cc97420bb4de53703157a94be103ac6fb379857ad1933417ddf2fcc2c7d50579');
});
