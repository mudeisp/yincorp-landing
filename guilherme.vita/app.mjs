import{brl,decimal,describe,stages,nominalSum,resolveUnit,selectedURL,summary}from'./model.mjs';
const $=id=>document.getElementById(id),live=['www.yincorp.com.br','yincorp.com.br'].includes(location.hostname);let projects=[],selection={},tracking=null;
const el=(tag,text,className)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;};
const link=(text,href)=>{const a=el('a',text);a.href=href;return a;};
const reference=p=>p.reference==='2026-08'?'ago/2026':'out/2026';
const delivery=p=>({'2028-06':'junho/2028','2027-09':'setembro/2027','2028-10':'outubro/2028','2027-10':'outubro/2027'}[p.delivery]||'Consultar PDF');
const event=(name,extra={})=>tracking?.track?.(name,{presentation:'guilherme.vita',purpose:'VENDA',operation:'VENDA',...extra})?.catch?.(()=>{});
function buildCards(){
 for(const [i,p]of projects.entries()){
  const article=el('article',undefined,'selection-card');article.append(el('p',`0${i+1} / ${p.developer.toUpperCase()}`,'number'),el('h3',p.project),el('p',`Brooklin · referência ${reference(p)}`,'developer'));
  const label=el('label',p.key==='haus'?'Faixa residencial de andares':'Unidade da tabela');label.htmlFor='select-'+p.key;const select=el('select');select.id='select-'+p.key;
  for(const u of p.units){const option=el('option',`${describe(u)} · ${brl(u.total)}`);option.value=u.id;select.append(option);}select.value=selection[p.key].id;
  select.addEventListener('change',()=>{selection[p.key]=resolveUnit(p,select.value);render();event('presentation_unit_selected',{project_name:p.project,unit_id:select.value});});
  const price=el('p',undefined,'selection-price');price.id='price-'+p.key;const meta=el('p',undefined,'selection-meta');meta.id='meta-'+p.key;const source=el('p',undefined,'selection-source');source.id='source-'+p.key;
  article.append(label,select,price,meta,source,link('Plantas e lazer ↓','#projeto-'+p.key));$('selection-cards').append(article);
 }
}
function renderTable(){
 const head=el('tr');head.append(el('th','Referência'));for(const p of projects)head.append(el('th',p.short));for(const th of head.children)th.scope='col';$('compare-head').replaceChildren(head);
 const rows=[
 ['Escolha',p=>describe(selection[p.key])],['Tipologia',p=>selection[p.key].typology],['Área da tabela',p=>decimal(selection[p.key].area)+' m²'],['Área do apartamento, sem depósito',p=>p.key==='arizona'?decimal(selection[p.key].privateArea)+' m²':'Sem área separada de depósito informada nesta leitura'],['Vagas',p=>selection[p.key].parking+' vaga(s)'],['Preço impresso',p=>brl(selection[p.key].total),'price-row'],['Preço / m² da tabela',p=>brl(selection[p.key].total/selection[p.key].area)],['Ato / entrada',p=>brl(p.key==='arizona'?selection[p.key].ato:selection[p.key].entrance)],['Saldo / principal nominal',p=>brl(selection[p.key].principal)],['Entrega / habite-se previsto na tabela',p=>delivery(p)],['Referência comercial',p=>reference(p)+' · tabela p. '+selection[p.key].sourcePage],['O que muda na área',p=>p.areaNote],['Lazer em destaque',p=>p.highlights.join(' · ')]
 ];
 $('compare-body').replaceChildren(...rows.map(([label,fn,cls])=>{const tr=el('tr',undefined,cls);const th=el('th',label);th.scope='row';tr.append(th);for(const p of projects)tr.append(el('td',fn(p)));return tr;}));
}
function renderPayments(){
 $('payments').replaceChildren(...projects.map(p=>{
  const u=selection[p.key],article=el('article',undefined,'payment-panel');article.append(el('p',reference(p).toUpperCase()+' · FLUXO NOMINAL','eyebrow'),el('h3',p.project),el('p',describe(u),'payment-selection'));
  const list=el('ul',undefined,'payment-list');for(const [name,date,count,each]of stages(p.key,u)){const li=el('li');const label=el('span',name);label.append(el('small',date));const value=el('span');value.append(el('strong',(count>1?count+' × ':'')+brl(each)),el('small','Total da etapa: '+brl(count*each)));li.append(label,value);list.append(li);}article.append(list);
  if(u.financing){const alt=el('div',undefined,'alternative');alt.append(el('strong',`Coluna alternativa · ${p.key==='brooklin'?'dez/2028':'dez/2027'}`),el('p',brl(u.financing)+' · substitui o principal nessa leitura; não somar os dois saldos.'));article.append(alt);}
  const sum=nominalSum(p.key,u),diff=u.total-sum;article.append(el('p',`Soma nominal: ${brl(sum)}. Preço impresso: ${brl(u.total)}.${diff?' Diferença de arredondamento: '+brl(Math.abs(diff))+'.':''}`,'payment-note'),el('p',p.paymentNote,'payment-note'));
  const source=link('Conferir tabela · página '+u.sourcePage+' ↗',p.tableUrl+'#page='+u.sourcePage);source.target='_blank';source.rel='noopener';source.className='caption';article.append(source);return article;
 }));
}
function galleryItem(p,item){
 const fig=el('figure'),button=el('button');button.type='button';button.setAttribute('aria-label','Ampliar '+item.label);const img=el('img');img.src=item.src;img.alt=item.label;img.loading='lazy';img.decoding='async';button.append(img,el('span','Ampliar ↗','zoom-label'));
 button.addEventListener('click',()=>{const modal=$('gallery');$('gallery-title').textContent=p.project+' · '+item.label;$('gallery-image').src=item.src;$('gallery-image').alt=item.label;$('gallery-original').href=item.src;$('gallery-caption').textContent=`${p.project} · book original${item.page?', página '+item.page:''}. Planta ou perspectiva ilustrativa, com sugestão de decoração. Consulte andares, finais, acabamentos e ressalvas no PDF. Não há vinculação automática com a unidade selecionada.`;modal.showModal();event('presentation_gallery_interaction',{project_name:p.project,image:item.src});});
 fig.append(button,el('figcaption',item.label+(item.page?' · book, p. '+item.page:'')));return fig;
}
function buildProjects(){
 for(const [i,p]of projects.entries()){
  const section=el('section',undefined,'project-section');section.id='projeto-'+p.key;const wrap=el('div',undefined,'wrap'),overview=el('div',undefined,'project-overview'),photo=el('img');photo.src=p.hero;photo.alt='Perspectiva ilustrada · '+p.project;photo.loading='lazy';const copy=el('div');copy.append(el('p',`0${i+1} / ${p.developer.toUpperCase()}`,'eyebrow'),el('h2',p.project),el('p',p.address),el('p','Previsão indicada na tabela: '+delivery(p)+'.'));
  const highlights=el('ul',undefined,'highlight-list');for(const h of p.highlights)highlights.append(el('li',h));copy.append(highlights,el('p',p.tableNote,'project-note'),link('Voltar ao comparativo ↑','#comparativo'));overview.append(photo,copy);wrap.append(overview,el('h3','Espaço para o seu jeito de viver.','gallery-title'),el('p',p.areaNote+' As plantas abaixo mantêm suas referências originais.','project-note'));
  const plans=el('div',undefined,'gv-gallery');for(const item of p.plans)plans.append(galleryItem(p,item));wrap.append(plans,el('h3','A vida além da porta.','gallery-title'),el('p','Ambientes ilustrados no book. Entrega e acesso aos espaços conforme o contrato e o Memorial Descritivo.','project-note'));const leisure=el('div',undefined,'gv-gallery leisure-gallery');for(const item of p.leisure)leisure.append(galleryItem(p,item));wrap.append(leisure);section.append(wrap);$('project-details').append(section);
 }
}
function currentSummary(){return summary(projects,selection);}
function contactMessage(){return`Olá, sou Guilherme. Gostaria de conversar sobre estas escolhas da apresentação Yincorp:\n\n${currentSummary()}\n\nPodemos confirmar disponibilidade, valores atuais e condições?\n${selectedURL(projects,selection)}`;}
function render(){
 for(const p of projects){const u=selection[p.key];$('select-'+p.key).value=u.id;$('price-'+p.key).textContent=brl(u.total);$('meta-'+p.key).textContent=`${decimal(u.area)} m² · ${brl(u.total/u.area)} / m²`;$('source-'+p.key).textContent=`${u.parking} vaga(s) · tabela p. ${u.sourcePage}`;}
 renderTable();renderPayments();$('selection-status').textContent='Sua comparação reúne quatro escolhas. Troque os andares e acompanhe as diferenças.';$('contact-summary').textContent=projects.map(p=>p.short+' · '+describe(selection[p.key])).join(' / ');
 const url=new URL(location.href);for(const p of projects)url.searchParams.set(p.key,selection[p.key].id);history.replaceState(null,'',url.pathname+url.search+url.hash);
 const wa=$('whatsapp');if(window.YntWhatsAppContact?.url&&live){wa.href=window.YntWhatsAppContact.url(contactMessage());wa.removeAttribute('aria-disabled');}else{wa.setAttribute('aria-disabled','true');$('contact-note').textContent=live?'O atendimento está indisponível neste momento. Copie o resumo para compartilhar com a Yincorp.':'Prévia local · envio ao WhatsApp e rastreamento desativados. Você pode testar seleções, imagens e copiar o resumo.';}
}
$('close-gallery').addEventListener('click',()=>$('gallery').close());
$('gallery').addEventListener('click',e=>{if(e.target===$('gallery')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
$('whatsapp').addEventListener('click',e=>{if(e.currentTarget.getAttribute('aria-disabled')==='true'){e.preventDefault();return;}event('presentation_whatsapp_click',{project_name:'Comparativo Guilherme.vita',selection:projects.map(p=>({project:p.key,unit:selection[p.key].id}))});});
$('share').addEventListener('click',async()=>{const url=selectedURL(projects,selection,live?'https://www.yincorp.com.br':location.origin);try{if(navigator.share)await navigator.share({title:'Guilherme.vita · Yincorp',text:'Quatro escolhas no Brooklin, lado a lado.',url});else{await navigator.clipboard.writeText(url);$('share-feedback').textContent='Link da comparação copiado.';}}catch(e){if(e.name!=='AbortError')$('share-feedback').textContent='Compartilhe este link: '+url;}});
$('copy-summary').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(currentSummary()+'\n'+selectedURL(projects,selection,live?'https://www.yincorp.com.br':location.origin));$('copy-feedback').textContent='Resumo copiado.';}catch{$('copy-feedback').textContent=currentSummary();}});
try{
 const response=await fetch('/guilherme.vita/projects.json');if(!response.ok)throw Error('Dados indisponíveis');projects=await response.json();const params=new URL(location.href).searchParams;
 for(const p of projects)selection[p.key]=resolveUnit(p,params.get(p.key));
 buildCards();buildProjects();render();
 if(live){try{tracking=await import('/assets/js/portal-session.js');event('presentation_view',{project_name:'Comparativo Guilherme.vita'});}catch{}}
}catch(error){$('load-error').hidden=false;console.error('Comparativo indisponível',error);}
