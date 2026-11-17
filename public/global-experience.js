/* Property image dialogs and the commercial gallery reveal. */
(()=>{
const root=document.querySelector('main');if(!root)return;
const dialog=document.createElement('dialog');dialog.className='yg-lightbox';dialog.innerHTML='<button type="button" aria-label="Fechar fotografia">×</button><img alt="">';document.body.append(dialog);dialog.querySelector('button').onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
const candidates=[...root.querySelectorAll('article img,section img,figure img')].filter(i=>!i.closest('#mandarim-book,form,a,button,[role="button"]')&&!i.closest('header,nav,footer')&&!i.closest('[class*="avatar"],[class*="logo"]')).slice(0,35);
candidates.forEach(img=>{img.classList.add('yg-zoomable');img.tabIndex=0;img.setAttribute('role','button');img.setAttribute('aria-label','Ampliar fotografia: '+(img.alt||'imagem do imóvel'));const open=()=>{dialog.querySelector('img').src=img.currentSrc||img.src;dialog.querySelector('img').alt=img.alt||'Fotografia do imóvel';dialog.showModal()};img.addEventListener('click',open);img.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}})});

/* Full editorial chapters for all structured commercial presentations. */
const book=root.querySelector('.commercial-book');
if(book){
 const gallery=book.querySelector('.commercial-gallery');
 gallery?.addEventListener('click',e=>{const link=e.target.closest('figure a');if(!link)return;const img=link.querySelector('img');if(!img)return;e.preventDefault();dialog.querySelector('img').src=img.currentSrc||img.src;dialog.querySelector('img').alt=img.alt||'Imagem do empreendimento';dialog.showModal()});

}

})();