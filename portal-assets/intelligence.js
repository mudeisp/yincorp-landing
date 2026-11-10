(()=>{'use strict';
const context=document.querySelector('#portal-data');let ctx;try{ctx=JSON.parse(context?.textContent||'{}')}catch{return}
if(!['development','unit','rental_property','investment-story'].includes(ctx.kind))return;
const anchor=document.querySelector('#investment-motor-anchor,#essencia,.rental-essence,.property-keyfacts,.property-facts');if(!anchor)return;
const root=document.createElement('section');root.id='yincorp-intelligence';root.className='ynti';root.setAttribute('aria-label','Outras possibilidades para sua escolha');
root.innerHTML='<div class="ynti-head"><div><small>✳ YINCORP INTELLIGENCE</small><h2>Enquanto você conhece este imóvel…</h2><p>Conectamos alternativas para ampliar sua perspectiva.</p></div><span class="ynti-live">Preparando sua análise</span></div><div class="ynti-content" hidden></div>';
anchor.after(root);const content=root.querySelector('.ynti-content'),live=root.querySelector('.ynti-live');
const num=(v,d=0)=>v==null?'A confirmar':Number(v).toLocaleString('pt-BR',{maximumFractionDigits:d});const cash=v=>v==null?'A confirmar':'R$ '+num(v);
const text=(tag,value,cls)=>{const e=document.createElement(tag);e.textContent=value;if(cls)e.className=cls;return e};
const markets=new Set((document.currentScript?.dataset.markets||'').split(','));
const safePath=p=>{const sale=typeof p==='string'&&/^\/([a-z]{2})\/[a-z0-9-]+\/empreendimento\/[a-z0-9-]+(?:\/tipologia\/[a-f0-9-]{36})?$/.exec(p);return p==='/es/vitoria/investimento-airbnb'||Boolean(sale&&markets.has(sale[1]))||typeof p==='string'&&/^\/alugar\/imovel\/[a-f0-9-]{36}$/.test(p)};
const path=location.pathname;let payload=null,started=false,paused=false,step=0,elapsed=0,last=0,priority='geral';const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),25000);
const loading=fetch('/api/intelligence?'+new URLSearchParams({path}),{signal:controller.signal,credentials:'same-origin'}).then(r=>{if(!r.ok)throw Error('unavailable');return r.json()}).then(data=>{if(!data.base||!Array.isArray(data.items))throw Error('invalid');payload=data;return data}).finally(()=>clearTimeout(timeout));loading.catch(()=>{if(!started)root.hidden=true});
const investment=ctx.kind==='investment-story';if(investment){root.querySelector('h2').textContent='Uma seleção. Diferentes caminhos para investigar.';root.querySelector('.ynti-head p').textContent='Capital, área e prazo se conectam automaticamente; sem formulário ou simulador.';}
let back;try{back=JSON.parse(sessionStorage.getItem('ynt-intelligence-return')||'null')}catch{}
if(back&&back.to===path&&safePath(back.from)&&Date.now()-back.at<1800000){const nav=text('nav','', 'ynti-return');nav.setAttribute('aria-label','Sua comparação');nav.append(text('span','Você veio de '+String(back.name||'outro imóvel').slice(0,100)));const a=text('a','Voltar à comparação ↗');a.href=back.from+'#yincorp-intelligence';nav.append(a);const first=document.querySelector('main');first?.prepend(nav)}
function link(item,label){const a=text('a',label,'ynti-link');a.href=safePath(item.path)?item.path:'#';a.addEventListener('click',()=>{try{sessionStorage.setItem('ynt-intelligence-return',JSON.stringify({from:path,to:item.path,name:payload.base.name,at:Date.now()}))}catch{}});return a}
function sameArea(a,b){return a.city===b.city&&a.neighborhood===b.neighborhood}
function explain(item){const base=payload.base,rent=payload.kind==='rent';const diff=item.price-base.price;let why=investment?'Configuração compacta em Vitória. A seleção reúne faixas de preço e bairros diferentes.':sameArea(item,base)?'Mesmo bairro e faixa de valor.':'Mesmo município e faixa de valor; outro bairro.';
let gain='Aluguel '+(diff<=0?cash(-diff)+' menor':cash(diff)+' maior')+' que o imóvel aberto.';
if(!rent)gain='Preço '+(diff<=0?cash(-diff)+' menor':cash(diff)+' maior')+' que a configuração de referência.';
if(base.area&&item.area)gain+=' '+num(Math.abs(item.area-base.area),2)+' m² '+(item.area>=base.area?'a mais.':'a menos.');
let trade=rent?'Compare trajeto, garantias e estado atual do imóvel.':'Compare planta, tipologia, estágio e prazo contratual.';
if(rent&&base.subtotal!==null&&item.subtotal!==null){const d=item.subtotal-base.subtotal;trade='Aluguel + condomínio: '+cash(item.subtotal)+'/mês, '+cash(Math.abs(d))+(d<=0?' abaixo':' acima')+' do imóvel aberto. Sem IPTU e demais encargos.'}
if(item.bedrooms!==null&&base.bedrooms!==null&&item.bedrooms<base.bedrooms)trade+=' Oferece menos dormitórios.';
if(investment)trade+=' Autorização para locação curta e custos de operação não verificados.';return {why,gain,trade}}
function conclusion(){const base=payload.base,list=payload.items;if(!list.length)return 'Não encontramos alternativas compatíveis neste recorte. Você pode continuar pelas configurações e pelo atendimento deste imóvel.';
let pool=investment?[base,...list]:list.slice();if(priority==='prazo')pool.sort((a,b)=>{const ready=p=>/pronto|entregue|conclu/i.test(p.status)?0:1;const date=p=>p.delivery?Date.parse(p.delivery.split('/').reverse().join('-')):Infinity;return ready(a)-ready(b)||date(a)-date(b)||a.price-b.price});if(priority==='espaco')pool.sort((a,b)=>(b.area??-1)-(a.area??-1));if(priority==='quartos')pool.sort((a,b)=>(b.bedrooms??-1)-(a.bedrooms??-1));if(priority==='custo')pool=pool.filter(i=>payload.kind!=='rent'||i.subtotal!==null).sort((a,b)=>(payload.kind==='rent'?a.subtotal:a.price)-(payload.kind==='rent'?b.subtotal:b.price));
const item=pool[0];if(!item)return 'Há encargos não informados. Confirme condomínio e periodicidade do IPTU para comparar o custo mensal.';
if(investment&&priority==='geral'){const capital=[base,...list].slice().sort((a,b)=>a.price-b.price)[0];const area=[base,...list].slice().filter(p=>p.area).sort((a,b)=>b.area-a.area)[0];return capital.name+' tem o menor capital de compra neste recorte: '+cash(capital.price)+'. '+(area?area.name+' oferece a maior área de referência: '+num(area.area,2)+' m². ':'')+'São critérios diferentes, não um ranking de retorno. Confirme prazo, regras de uso e custos antes de definir a operação.';}if(investment&&priority==='custo')return item.name+' exige o menor capital de compra neste recorte: '+cash(item.price)+', na configuração '+(item.reference||item.type)+' de '+num(item.area,2)+' m². Esse valor não inclui mobília, implantação, impostos e custos de operação; menor preço não comprova maior retorno.';if(investment&&priority==='espaco')return item.name+' oferece a maior área da seleção: '+num(item.area,2)+' m², por '+cash(item.price)+'. Compare distribuição da planta, vagas e prazo. Área maior, sozinha, não comprova diária ou receita maiores.';if(investment&&priority==='prazo')return item.name+': '+(item.delivery?'entrega informada '+item.delivery:item.status||'prazo a confirmar')+'. O prazo é apenas um dado do catálogo; não comprova disponibilidade para receber hóspedes. Compare contrato, documentação e implantação.';const e=explain(item);return 'Vale conhecer '+item.name+'. '+e.gain+' '+e.trade;}
let tbody,insight,cards,progress,controls;
function build(){const rent=payload.kind==='rent';content.hidden=false;root.classList.add('ynti-active');
progress=document.createElement('div');progress.className='ynti-progress';progress.innerHTML='<i></i>';content.append(progress);
const wrap=document.createElement('div');wrap.className='ynti-table';const table=document.createElement('table');const thead=document.createElement('thead'),tr=document.createElement('tr');(rent?['Imóvel','Aluguel','Condomínio','Subtotal*','Área']:['Configuração','Preço','Área','Quartos','Entrega / estágio']).forEach(s=>tr.append(text('th',s)));thead.append(tr);tbody=document.createElement('tbody');table.append(thead,tbody);wrap.append(table);content.append(wrap);
content.append(text('p',rent?'*Aluguel + condomínio. IPTU sem periodicidade confirmada fica separado; subtotal não inclui consumos e outros encargos.':'Preços e áreas pertencem à configuração indicada; a seleção não representa todas as unidades do empreendimento.','ynti-note'));
const options=document.createElement('div');options.className='ynti-priorities';options.append(text('span','Seu olhar:'));[['geral','Visão geral'],['custo',rent?'Menor subtotal':investment?'Menor capital':'Menor preço'],['espaco','Mais espaço'],[investment?'prazo':'quartos',investment?'Prazo informado':'Mais quartos']].forEach(([key,label])=>{const b=text('button',label);b.type='button';b.setAttribute('aria-pressed',key===priority);b.onclick=()=>{priority=key;options.querySelectorAll('button').forEach(el=>el.setAttribute('aria-pressed',el===b));if(step>=4)updateInsight()};options.append(b)});content.append(options);
insight=text('p','Estamos conectando as diferenças que importam.','ynti-insight');insight.setAttribute('aria-live','polite');content.append(insight);cards=document.createElement('div');cards.className='ynti-cards';content.append(cards);
const details=document.createElement('details');details.className='ynti-method';details.append(text('summary','Como esta comparação foi construída'));details.append(text('p',payload.criteria+' Comparação por dados do inventário, sem projeção de retorno. Valores e disponibilidade sujeitos a confirmação.'));details.append(text('p','Consulta: '+new Date(payload.checkedAt).toLocaleString('pt-BR')+'. Fluxo de compra, garantias e custos ausentes não foram estimados.'));content.append(details);
controls=document.createElement('div');controls.className='ynti-controls';const pause=text('button','Pausar movimento');pause.type='button';pause.onclick=()=>{paused=!paused;pause.textContent=paused?'Retomar movimento':'Pausar movimento';root.querySelectorAll('*').forEach(e=>e.getAnimations().forEach(a=>paused?a.pause():a.play()))};const replay=text('button','↻ Rever construção');replay.type='button';replay.onclick=()=>{const done=step===5;step=0;elapsed=0;tbody.replaceChildren();cards.replaceChildren();insight.textContent='Estamos conectando as diferenças que importam.';render();if(done){last=0;requestAnimationFrame(tick)}};controls.append(pause,replay);content.append(controls);render()}
function updateInsight(){insight.textContent=conclusion();if(!reduced)insight.animate([{opacity:.2,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:650});}
function render(){const rent=payload.kind==='rent',all=[payload.base,...payload.items],count=Math.min(all.length,step+1);for(let i=tbody.children.length;i<count;i++){const item=all[i],tr=document.createElement('tr');if(i===0)tr.className='ynti-current';const first=document.createElement('td');first.append(text('strong',item.name),text('small',(rent?item.neighborhood:(item.type+(item.reference?' · ref. '+item.reference:'')))||'Referência do catálogo'));tr.append(first);for(let k=0;k<4;k++)tr.append(text('td','—'));tbody.append(tr);if(!reduced)tr.animate([{opacity:0,transform:'translateX(25px)'},{opacity:1,transform:'none'}],{duration:800});}
  [...tbody.children].forEach((row,i)=>{const item=all[i];const cells=[cash(item.price),...(rent?[cash(item.condo),cash(item.subtotal),num(item.area,2)+' m²']:[num(item.area,2)+' m²',num(item.bedrooms),/pronto|entregue|conclu/i.test(item.status)?item.status:item.delivery||item.status||'A confirmar'])];cells.forEach((v,k)=>{const td=row.children[k+1];const ready=k===0||step>=3;if(ready&&td.textContent!==v){td.textContent=v;td.className='ynti-reveal';}})});
progress.firstChild.style.width=Math.min(100,(step+1)/6*100)+'%';live.textContent=['Conhecendo este imóvel','Encontrando alternativas','Conectando possibilidades','Cruzando os dados','Explicando as diferenças','Sua análise está pronta'][step];if(step>=4){updateInsight();if(!cards.children.length)payload.items.forEach(item=>{const e=explain(item),card=document.createElement('article');card.append(text('h3',item.name),text('p',e.why,'ynti-why'),text('p',e.gain),text('p',e.trade));if(rent)card.append(text('small','IPTU informado: '+cash(item.tax)+' · periodicidade a confirmar'));card.append(link(item,'Conhecer este imóvel ↗'));cards.append(card);if(!reduced)card.animate([{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'none'}],{duration:700,delay:cards.children.length*150,fill:'both'});});}}

function buildGallery(){
  content.hidden=false;
  root.classList.add('ynti-premium','ynti-active');
  live.textContent='Sua análise está pronta';
  const base=payload.base;
  const rent=payload.kind==='rent';
  const reference=text('div','','ynti-reference');
  reference.append(text('small','IMÓVEL DE REFERÊNCIA'),text('strong',base.name),
    text('span',[base.neighborhood,base.city,cash(base.price)+(rent?' / mês':'')].filter(Boolean).join(' · ')));
  content.append(reference);
  const filters=text('div','','ynti-priorities');
  filters.setAttribute('aria-label','Ordenar alternativas');
  const viewport=text('ul','','ynti-gallery');
  viewport.id='ynti-gallery';
  const navigation=text('div','','ynti-gallery-nav');
  const position=text('span','1/'+payload.items.length);
  const previous=text('button','←');
  const next=text('button','→');
  for(const [button,label] of [[previous,'Alternativa anterior'],[next,'Próxima alternativa']]){
    button.type='button';
    button.setAttribute('aria-label',label);
    button.setAttribute('aria-controls',viewport.id);
  }
  navigation.append(previous,position,next);
  let current=0;
  function sync(){
    const items=[...viewport.children];
    if(!items.length)return;
    const left=viewport.getBoundingClientRect().left;
    current=items.reduce((best,item,index)=>Math.abs(item.getBoundingClientRect().left-left)<Math.abs(items[best].getBoundingClientRect().left-left)?index:best,0);
    position.textContent=(current+1)+'/'+items.length;
    previous.disabled=current===0;
    next.disabled=current===items.length-1;
  }
  function move(offset){
    const item=viewport.children[current+offset];
    if(item)viewport.scrollTo({left:viewport.scrollLeft+item.getBoundingClientRect().left-viewport.getBoundingClientRect().left,behavior:reduced?'instant':'smooth'});
  }
  previous.onclick=()=>move(-1);
  next.onclick=()=>move(1);
  viewport.addEventListener('scroll',sync,{passive:true});
  const explanation=text('div','','ynti-insight');
  explanation.setAttribute('aria-live','polite');
  function card(item){
    const cell=text('li','','ynti-gallery-item');
    const anchor=safePath(item.path)?link(item,''):text('div','','ynti-link');
    if(anchor.tagName==='A')anchor.setAttribute('aria-label','Conhecer '+item.name+' · '+cash(item.price));
    const media=text('div','','ynti-photo');
    const fallback=text('span','Imagem indisponível');
    media.append(fallback);
    try{
      const url=new URL(item.image);
      if(url.protocol==='https:'&&!url.username&&!url.password){
        const image=document.createElement('img');
        image.alt='';
        image.loading='lazy';
        image.decoding='async';
        image.width=640;
        image.height=480;
        image.addEventListener('error',()=>image.remove(),{once:true});
        image.src=url.href;
        media.append(image);
      }
    }catch{}
    const body=text('div','','ynti-card-body');
    body.append(text('p',[item.neighborhood,item.city].filter(Boolean).join(' · '),'ynti-location'),
      text('h3',item.name),text('p',[item.area==null?'Área a confirmar':num(item.area,2)+' m²',item.bedrooms==null?'Dormitórios a confirmar':num(item.bedrooms)+(item.bedrooms===1?' dormitório':' dormitórios')].join(' · ')),
      text('strong',cash(item.price)+(rent?' / mês':''),'ynti-price'));
    if(rent)body.append(text('p','Condomínio '+cash(item.condo)+' · Subtotal '+cash(item.subtotal)),text('p','IPTU '+cash(item.tax)+' · periodicidade a confirmar'));
    if(anchor.tagName==='A'){
      const arrow=text('span','↗','ynti-arrow');
      arrow.setAttribute('aria-hidden','true');
      body.append(arrow);
    }
    anchor.append(media,body);
    cell.append(anchor);
    return cell;
  }
  function update(){
    const ordered=payload.items.slice();
    const cost=item=>rent?(item.subtotal??Infinity):item.price;
    if(priority==='custo')ordered.sort((a,b)=>cost(a)-cost(b));
    if(priority==='espaco')ordered.sort((a,b)=>(b.area??-1)-(a.area??-1));
    if(priority==='quartos')ordered.sort((a,b)=>(b.bedrooms??-1)-(a.bedrooms??-1));
    viewport.replaceChildren(...ordered.map(card));
    viewport.scrollTo({left:0,behavior:'instant'});
    sync();
    const message=conclusion();
    explanation.textContent=message;
    const match=ordered.find(item=>message.startsWith('Vale conhecer '+item.name+'.'));
    if(match)explanation.replaceChildren(text('strong','Vale conhecer '+match.name+'.'),document.createTextNode(message.slice(('Vale conhecer '+match.name+'.').length)));
  }
  if(payload.items.length){
    for(const [key,label] of [['geral','Visão geral'],['custo',rent?'Menor subtotal':'Menor preço'],['espaco','Mais espaço'],['quartos','Mais quartos']]){
      const button=text('button',label);
      button.type='button';
      button.setAttribute('aria-pressed',String(key===priority));
      button.onclick=()=>{
        priority=key;
        for(const option of filters.children)option.setAttribute('aria-pressed',String(option===button));
        update();
      };
      filters.append(button);
    }
    content.append(filters,viewport);
    if(payload.items.length>1)content.append(navigation);
  }
  content.append(explanation);
  const details=text('details','','ynti-method');
  details.append(text('summary','Como esta comparação foi construída'),text('p',payload.criteria),
    text('p','Consulta: '+new Date(payload.checkedAt).toLocaleString('pt-BR')+'. Preços e áreas pertencem à configuração indicada. Valores e disponibilidade sujeitos a confirmação.'));
  if(rent)details.append(text('p','Subtotal é aluguel + condomínio. IPTU sem periodicidade confirmada fica separado. Outros encargos não estão incluídos.'));
  content.append(details);
  update();
}

async function start(){if(started)return;started=true;live.textContent='Conectando outras possibilidades…';try{await loading;if(investment){build();requestAnimationFrame(tick)}else buildGallery()}catch{live.textContent='Você pode continuar conhecendo este imóvel';content.hidden=false;content.append(text('p','A comparação está temporariamente indisponível. Explore as configurações e consulte o atendimento.','ynti-note'))}}
function tick(now){if(last&&!paused&&!document.hidden&&step<5){elapsed+=Math.min(100,now-last);if(elapsed>(step===4?4500:1800)){elapsed=0;step++;render()}}last=now;if(step<5)requestAnimationFrame(tick)}
const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){start();observer.disconnect()}},{threshold:.15});observer.observe(root);window.addEventListener('scroll',()=>{if(!started&&root.getBoundingClientRect().top<innerHeight*.85){start();observer.disconnect()}},{passive:true});if(location.hash==='#yincorp-intelligence')start();
})();



