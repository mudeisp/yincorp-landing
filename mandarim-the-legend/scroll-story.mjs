// Premium typewriter presentation. No terminal, code snippets or artificial loading screens.
const section=document.getElementById('mandarim-book');
if(section){
 section.classList.add('mandarim-typewriter');
 const gallery=section.querySelector('div[style*="display:grid"]');
 const heading=section.querySelector('#mandarim-book-title');
 const finance=section.querySelector('#mandarim-finance');
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const figures=gallery?[...gallery.querySelectorAll('figure')]:[];
 const labels=['Arquitetura','Skydeck','Lazer','Bem-estar','Plantas','Ambientes'];
 const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{
   for(const entry of entries){if(entry.isIntersecting){observer.unobserve(entry.target);entry.target.dispatchEvent(new Event('yincorp:reveal'));}}
 },{threshold:.12,rootMargin:'0px 0px -6% 0px'}):null;
 function onView(node,callback){if(reduced||!observer){callback();return;}node.addEventListener('yincorp:reveal',callback,{once:true});observer.observe(node);}
 function typeText(node,delay=34){
   if(!node)return;
   const full=node.textContent.trim();if(!full)return;
   node.setAttribute('aria-label',full);
   if(reduced){node.textContent=full;return;}
   // Keep text accessible and layout stable while characters appear.
   node.textContent='';node.classList.add('mtw-writing');
   let i=0;const chars=Array.from(full);
   const tick=()=>{i=Math.min(chars.length,i+1);node.textContent=chars.slice(0,i).join('');if(i<chars.length){setTimeout(tick,delay);}else{node.classList.remove('mtw-writing');}};
   tick();
 }
 onView(heading,()=>typeText(heading,55));
 const intro=heading?.nextElementSibling?.tagName==='P'?heading.nextElementSibling:null;
 if(intro)onView(intro,()=>typeText(intro,12));
 figures.forEach((fig,i)=>{
   fig.classList.add('mtw-panel');
   const caption=fig.querySelector('figcaption');
   if(caption){
     const kicker=document.createElement('h3');kicker.className='mtw-kicker';kicker.textContent=labels[i]||'Descubra';
     fig.insertBefore(kicker,fig.firstChild);
     onView(fig,()=>{fig.classList.add('mtw-visible');typeText(kicker,65);typeText(caption,22);});
   }
   const image=fig.querySelector('img');
   const anchor=image?.closest('a');
   if(!image||!anchor)return;
   // Plans and other landscape artwork retain natural aspect ratio and pan sideways.
   const wide=i>=4;
   if(!wide)return;
   const viewport=document.createElement('div');viewport.className='mtw-pan';viewport.setAttribute('aria-label','Imagem panorâmica; deslize para explorar');
   anchor.parentNode.insertBefore(viewport,anchor);viewport.appendChild(anchor);
   image.classList.add('mtw-pan-image');
   let raf=0,started=false,interrupted=false;
   const startPan=()=>{
     if(started||interrupted||reduced)return;started=true;
     const run=()=>{
       const max=viewport.scrollWidth-viewport.clientWidth;
       if(max<=2)return;
       const duration=Math.min(15000,Math.max(6500,max*14));
       const begin=performance.now();
       const step=now=>{if(interrupted)return;const t=Math.min(1,(now-begin)/duration);viewport.scrollLeft=max*(t*t*(3-2*t));if(t<1)raf=requestAnimationFrame(step);};
       raf=requestAnimationFrame(step);
     };
     if(image.complete)run();else image.addEventListener('load',run,{once:true});
   };
   const stop=()=>{interrupted=true;cancelAnimationFrame(raf);};
   viewport.addEventListener('touchstart',stop,{passive:true});
   viewport.addEventListener('pointerdown',stop,{passive:true});
   viewport.addEventListener('wheel',stop,{passive:true});
   onView(viewport,startPan);
 });
 if(finance){
   const title=finance.querySelector('#mandarim-finance-title');
   if(title)onView(title,()=>typeText(title,35));
 }
 const skip=document.createElement('a');skip.className='mtw-skip';skip.href='#mandarim-finance';skip.textContent='Consultar unidades e valores ↓';
 heading?.insertAdjacentElement('afterend',skip);
}
