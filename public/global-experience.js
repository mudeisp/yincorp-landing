/* Yincorp global editorial motion. Opt-in preview; no lead, analytics or CTA mutations. */
(()=>{
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const root=document.querySelector('main');if(!root)return;
const targets=[...root.querySelectorAll('section,article')].filter(n=>!n.closest('#mandarim-book')&&!n.closest('form')&&n.querySelector('h2,h3')&&n.getBoundingClientRect().height>120).slice(0,18);
if(!reduced&&'IntersectionObserver' in window){
 const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('yg-visible');observer.unobserve(e.target)}}),{threshold:.08,rootMargin:'0px 0px -8% 0px'});
 targets.forEach(n=>{n.classList.add('yg-stage');observer.observe(n)});
 // Typewriter is opt-in to editorial headings only; do not alter interactive controls.
 const typed=new WeakSet();
 const typeHeading=el=>{
  if(typed.has(el)||el.children.length||el.closest('a,button,form,nav,[contenteditable],#mandarim-book'))return;
  const full=el.textContent.trim();if(!full||full.length>110)return;
  typed.add(el);el.setAttribute('aria-label',full);
  const chars=Array.from(full);let i=0;el.textContent='';el.classList.add('yg-typing');
  const step=()=>{i=Math.min(chars.length,i+1);el.textContent=chars.slice(0,i).join('');if(i<chars.length)setTimeout(step,40);else el.classList.remove('yg-typing')};step();
 };
 const titleObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){titleObserver.unobserve(e.target);typeHeading(e.target)}}),{threshold:.3});
 targets.forEach(n=>{const title=n.querySelector('h2,h3');if(title)titleObserver.observe(title)});
}
const dialog=document.createElement('dialog');dialog.className='yg-lightbox';dialog.innerHTML='<button type="button" aria-label="Fechar fotografia">×</button><img alt="">';document.body.append(dialog);dialog.querySelector('button').onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
const candidates=[...root.querySelectorAll('article img,section img,figure img')].filter(i=>!i.closest('#mandarim-book,form,a,button,[role="button"]')&&!i.closest('header,nav,footer')&&!i.closest('[class*="avatar"],[class*="logo"]')).slice(0,35);
candidates.forEach(img=>{img.classList.add('yg-zoomable');img.tabIndex=0;img.setAttribute('role','button');img.setAttribute('aria-label','Ampliar fotografia: '+(img.alt||'imagem do imóvel'));const open=()=>{dialog.querySelector('img').src=img.currentSrc||img.src;dialog.querySelector('img').alt=img.alt||'Fotografia do imóvel';dialog.showModal()};img.addEventListener('click',open);img.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}})});
})();