const root=document.getElementById('mandarim-book');
if(root){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const seen=new WeakSet();
 function type(el,speed){if(seen.has(el))return;seen.add(el);const full=el.textContent;el.setAttribute('aria-label',full);if(reduced)return;const chars=Array.from(full);let i=0;el.textContent='';el.classList.add('mexp-cursor');function tick(){i=Math.min(chars.length,i+1);el.textContent=chars.slice(0,i).join('');if(i<chars.length)setTimeout(tick,speed);else el.classList.remove('mexp-cursor')}tick()}
 const chapters=[...root.querySelectorAll('.mexp-intro,.mexp-chapter,.mexp-finance-wrap')];
 const reveal=node=>{
  node.classList.add('mexp-visible');
  node.querySelectorAll('.mexp-type').forEach((el,i)=>setTimeout(()=>type(el,el.tagName.match(/^H/)?52:19),i*240));
  const frame=node.matches('.mexp-wide')?node.querySelector('.mexp-visual'):null;
  if(frame&&!reduced){const img=frame.querySelector('img');let canceled=false;frame.addEventListener('pointerdown',()=>canceled=true,{passive:true});frame.addEventListener('touchstart',()=>canceled=true,{passive:true});const pan=()=>{const max=frame.scrollWidth-frame.clientWidth;if(max<4)return;const start=performance.now();const tick=t=>{if(canceled)return;const v=Math.min(1,(t-start)/10000);frame.scrollLeft=max*(v*v*(3-2*v));if(v<1)requestAnimationFrame(tick)};requestAnimationFrame(tick)};if(img.complete)pan();else img.addEventListener('load',pan,{once:true});}
 };
 if('IntersectionObserver'in window){const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){io.unobserve(e.target);reveal(e.target)}}),{threshold:.12});chapters.forEach(c=>io.observe(c));}else chapters.forEach(reveal);
}
