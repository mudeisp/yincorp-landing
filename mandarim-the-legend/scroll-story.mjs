// Mandarim editorial construction: text types in, content assembles on scroll.
// No terminal or oversized standalone images; financial selector and contact stay functional.
const section=document.getElementById('mandarim-book');
if(section){
 section.classList.add('mandarim-assembled');
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const gallery=section.querySelector('div[style*="display:grid"]');
 const heading=section.querySelector('#mandarim-book-title');
 const finance=section.querySelector('#mandarim-finance');
 const figures=gallery?[...gallery.querySelectorAll('figure')]:[];
 const names=['Arquitetura','Skydeck','Lazer','Bem-estar','Plantas','Ambientes'];
 const io=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{
   for(const entry of entries){if(entry.isIntersecting){io.unobserve(entry.target);entry.target.dispatchEvent(new Event('yincorp:assemble'));}}
 },{threshold:.08,rootMargin:'0px 0px -5% 0px'}):null;
 const view=(node,fn)=>{if(!node)return;if(reduced||!io){fn();return;}node.addEventListener('yincorp:assemble',fn,{once:true});io.observe(node);};
 function type(node,speed=38){
   if(!node)return;const full=node.textContent.trim();if(!full)return;
   node.setAttribute('aria-label',full);if(reduced){node.textContent=full;return;}
   const chars=Array.from(full);let i=0;node.textContent='';node.classList.add('ma-typing');
   const step=()=>{i=Math.min(i+1,chars.length);node.textContent=chars.slice(0,i).join('');if(i<chars.length)setTimeout(step,speed);else node.classList.remove('ma-typing');};step();
 }
 if(heading){heading.textContent='Mandarim The Legend';view(heading,()=>type(heading,55));}
 const intro=section.querySelector('#mandarim-book-title + p');
 view(intro,()=>type(intro,14));
 if(gallery){
   gallery.classList.add('ma-gallery');
   figures.forEach((fig,i)=>{
     fig.classList.add('ma-card');
     const img=fig.querySelector('img'),a=img?.closest('a'),caption=fig.querySelector('figcaption');
     const label=document.createElement('h3');label.className='ma-card-title';label.textContent=names[i]||'Descubra';fig.prepend(label);
     if(a){const viewport=document.createElement('div');viewport.className='ma-image-frame';a.parentNode.insertBefore(viewport,a);viewport.append(a);}
     // Floor plans pan horizontally in a bounded frame, rather than showing giant cropped blocks.
     if(i>=4&&img){fig.classList.add('ma-floorplan');img.classList.add('ma-pan-img');}
     view(fig,()=>{
       fig.classList.add('ma-built');type(label,58);if(caption)type(caption,18);
       if(i>=4&&img&&!reduced){
         const frame=fig.querySelector('.ma-image-frame');let canceled=false;
         frame.addEventListener('touchstart',()=>{canceled=true;},{passive:true});
         frame.addEventListener('pointerdown',()=>{canceled=true;},{passive:true});
         const pan=()=>{const max=frame.scrollWidth-frame.clientWidth;if(max<5||canceled)return;
           const t0=performance.now(),duration=Math.min(12000,Math.max(5000,max*16));
           const animate=t=>{if(canceled)return;const x=Math.min(1,(t-t0)/duration);frame.scrollLeft=max*(x*x*(3-2*x));if(x<1)requestAnimationFrame(animate);};
           requestAnimationFrame(animate);
         };
         if(img.complete)pan();else img.addEventListener('load',pan,{once:true});
       }
     });
   });
 }
 if(finance){
   finance.classList.add('ma-finance');
   const title=finance.querySelector('#mandarim-finance-title');
   view(finance,()=>{finance.classList.add('ma-built');type(title,42);});
 }
 const jump=document.createElement('a');jump.className='ma-skip';jump.href='#mandarim-finance';jump.textContent='Explorar unidades e condições ↓';heading?.insertAdjacentElement('afterend',jump);
 // Hide only the duplicate oversized gallery/hero blocks from the original listing,
 // never the booking/contact actions or any gallery inside our premium section.
 const main=section.closest('main');
 if(main){
   const imgs=[...main.querySelectorAll('img')].filter(img=>!section.contains(img));
   imgs.forEach(img=>{
     const src=img.currentSrc||img.getAttribute('src')||'';
     const isHero=img.closest('.hero-photograph,.property-gallery,.development-gallery,.gallery-hero');
     const isDuplicate=figures.some(f=>{const own=f.querySelector('img');return own&&(own.getAttribute('src')===img.getAttribute('src'));});
     if((isHero||isDuplicate)&&img.closest('figure'))img.closest('figure').classList.add('ma-original-image-hidden');
   });
 }
}
