/* Progressive editorial headline reveal, non-destructive and accessible. */
(()=>{'use strict';
if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
const run=()=>{
 const root=document.querySelector('main');if(!root)return;
 const targets=[...root.querySelectorAll('h1')].filter(el=>el.textContent.trim().length>=12&&el.textContent.trim().length<=130&&el.children.length===0);
 const target=targets[0];if(!target)return;
 if(target.dataset.yiTyped)return;
 const original=target.textContent;target.dataset.yiTyped='1';
 const observer=new IntersectionObserver(entries=>{
  if(!entries.some(entry=>entry.isIntersecting))return;
  observer.disconnect();
  const total=original.length;const duration=Math.min(2300,Math.max(650,total*38));
  const start=performance.now();
  target.setAttribute('aria-label',original);
  const visible=document.createElement('span');visible.setAttribute('aria-hidden','true');
  visible.className='yi-typed-text';target.textContent='';target.append(visible);
  const tick=now=>{
   if(!target.isConnected)return;
   const count=Math.min(total,Math.ceil((now-start)/duration*total));
   visible.textContent=original.slice(0,count);
   if(count<total)requestAnimationFrame(tick);
   else{target.textContent=original;target.removeAttribute('aria-label');}
  };
  requestAnimationFrame(tick);
 },{threshold:0.2});
 observer.observe(target);
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();