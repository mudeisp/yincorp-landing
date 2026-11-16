// Progressive scroll narrative: presentation-only, never blocks original content.
const section=document.getElementById('mandarim-book');
if(section){
  section.classList.add('mandarim-story');
  const gallery=section.querySelector('div[style*="display:grid"]');
  if(gallery){
    gallery.classList.add('mandarim-story-gallery');
    const figures=[...gallery.querySelectorAll('figure')];
    const labels=['A arquitetura','O horizonte','O lazer','O bem-estar','As possibilidades','O seu espaço'];
    figures.forEach((figure,i)=>{
      figure.classList.add('mandarim-story-panel');
      const caption=figure.querySelector('figcaption');
      if(caption){const kicker=document.createElement('span');kicker.className='mandarim-story-kicker';kicker.textContent=String(i+1).padStart(2,'0')+' / '+labels[i];caption.prepend(kicker);}
    });
  }
  const finance=section.querySelector('#mandarim-finance');
  if(finance)finance.classList.add('mandarim-story-finance');
  const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{
    for(const entry of entries){if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}}
  },{rootMargin:'0px 0px -8% 0px',threshold:0.08}):null;
  const panels=[...section.querySelectorAll('.mandarim-story-panel'),finance].filter(Boolean);
  panels.forEach(panel=>{if(observer)observer.observe(panel);else panel.classList.add('is-visible');});
  // Visible shortcut for buyers who want the table immediately.
  if(finance){
    const jump=document.createElement('a');jump.className='mandarim-story-skip';jump.href='#mandarim-finance';jump.textContent='Ir direto às unidades e preços ↓';
    const heading=section.querySelector('#mandarim-book-title');heading?.insertAdjacentElement('afterend',jump);
  }
}
