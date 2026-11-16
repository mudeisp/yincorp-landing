/* Yincorp global editorial motion. Opt-in preview; no lead, analytics or CTA mutations. */
(()=>{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
const root=document.querySelector('main');if(!root)return;
const targets=[...root.querySelectorAll('section,article')].filter(n=>!n.closest('#mandarim-book')&&!n.closest('form')&&n.querySelector('h2,h3')&&n.getBoundingClientRect().height>120).slice(0,18);
const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('yg-visible');observer.unobserve(e.target)}}),{threshold:.08,rootMargin:'0px 0px -8% 0px'});
targets.forEach(n=>{n.classList.add('yg-stage');observer.observe(n)});
const dialog=document.createElement('dialog');dialog.className='yg-lightbox';dialog.innerHTML='<button type="button" aria-label="Fechar fotografia">×</button><img alt="">';document.body.append(dialog);dialog.querySelector('button').onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
const candidates=[...root.querySelectorAll('article img,section img,figure img')].filter(i=>!i.closest('#mandarim-book,form,a,button,[role="button"]')&&!i.closest('header,nav,footer')&&!i.closest('[class*="avatar"],[class*="logo"]')).slice(0,35);
candidates.forEach(img=>{img.classList.add('yg-zoomable');img.tabIndex=0;img.setAttribute('role','button');img.setAttribute('aria-label','Ampliar fotografia');const open=()=>{dialog.querySelector('img').src=img.currentSrc||img.src;dialog.querySelector('img').alt=img.alt||'Fotografia do imóvel';dialog.showModal()};img.addEventListener('click',open);img.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}})});
})();