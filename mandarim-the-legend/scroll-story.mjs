// Mandarim live-build pilot. Real content stays in the DOM and is never delayed.
const section=document.getElementById('mandarim-book');
if(section){
 section.classList.add('mandarim-live-build');
 const gallery=section.querySelector('div[style*="display:grid"]');
 const finance=section.querySelector('#mandarim-finance');
 const heading=section.querySelector('#mandarim-book-title');
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const scenes=gallery?[...gallery.querySelectorAll('figure')]:[];
 const labels=['arquitetura','horizonte','lazer','bemEstar','plantas','espacos'];
 const snippets=scenes.map((_,i)=>'const '+labels[i]+' = projeto.carregar("'+labels[i]+'");\ninterface.render('+labels[i]+');');
 const terminal=document.createElement('div');terminal.className='mlb-terminal';terminal.setAttribute('aria-hidden','true');
 terminal.innerHTML='<div class="mlb-top"><span class="mlb-dots">● ● ●</span><span>YINCORP / LIVE BUILD</span><span class="mlb-status">READY</span></div><pre class="mlb-code"></pre><div class="mlb-progress"><span></span></div>';
 const pre=terminal.querySelector('pre'),status=terminal.querySelector('.mlb-status'),progress=terminal.querySelector('.mlb-progress span');
 if(heading){heading.insertAdjacentElement('beforebegin',terminal);heading.textContent='Mandarim The Legend';}
 const jump=document.createElement('a');jump.className='mlb-skip';jump.href='#mandarim-finance';jump.textContent='Consultar unidades e valores ↓';
 heading?.insertAdjacentElement('afterend',jump);
 scenes.forEach((fig,i)=>{
   fig.classList.add('mlb-scene');
   fig.dataset.scene=String(i+1);
   const label=document.createElement('div');label.className='mlb-scene-label';label.textContent='0'+(i+1)+' / '+labels[i].replace(/([A-Z])/g,' $1');
   fig.prepend(label);
 });
 if(finance){finance.classList.add('mlb-scene','mlb-finance');finance.dataset.scene=String(scenes.length+1);}
 const targets=[...scenes,...(finance?[finance]:[])];
 let last=-1,timer=0;
 function type(text){
   clearInterval(timer);status.textContent='BUILDING';let i=0;pre.textContent='';
   if(reduced){pre.textContent=text;status.textContent='RENDERED';return;}
   timer=setInterval(()=>{i=Math.min(text.length,i+3);pre.textContent=text.slice(0,i)+(i<text.length?' ▍':'');if(i===text.length){clearInterval(timer);status.textContent='RENDERED';}},20);
 }
 function reveal(el,index){
   el.classList.add('mlb-built');
   if(index>last){last=index;type(index===scenes.length?'const unidades = tabela.historica();\ninterface.montarFluxoFinanceiro(unidades);':snippets[index]);progress.style.width=Math.round((index+1)/targets.length*100)+'%';}
 }
 const io=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){reveal(e.target,targets.indexOf(e.target));io.unobserve(e.target);}});},{threshold:.08,rootMargin:'0px 0px -12% 0px'}):null;
 targets.forEach((el,i)=>{if(io)io.observe(el);else reveal(el,i);});
 type('const empreendimento = "Mandarim The Legend";\ninterface.iniciar(empreendimento);');
 // Navigation and existing commercial forms remain available without waiting for animations.
}
