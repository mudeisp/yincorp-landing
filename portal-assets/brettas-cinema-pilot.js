/* Brettas pilot: home-style scroll cinema; no Intelligence V2 state or events touched. */
(()=>{'use strict';
const route='/es/vitoria/empreendimento/brettas-boutique-residence--orulo-85087';
if(location.pathname.replace(/\/$/,'')!==route)return;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let image=null,frame=null,pending=false;
function findHero(){
 const images=[...document.querySelectorAll('main img, article img')].filter(el=>!el.closest('#yincorp-intelligence,.ynti-premium,[class*="ynti-"]'));
 return images.find(el=>el.naturalWidth>=600&&el.getBoundingClientRect().width>=220&&el.getBoundingClientRect().height>=180)||null;
}
function paint(){
 pending=false;if(!image||!image.isConnected)return;
 if(reduced.matches){image.style.removeProperty('transform');return}
 const rect=frame.getBoundingClientRect();
 if(rect.bottom<0||rect.top>innerHeight)return;
 const progress=Math.max(0,Math.min(1,(innerHeight-rect.top)/(innerHeight+rect.height)));
 const shift=(progress-.5)*Math.min(rect.width*.10,76);
 image.style.transform='translate3d('+shift.toFixed(1)+'px,0,0) scale(1.13)';
}
function tick(){if(!pending){pending=true;requestAnimationFrame(paint)}}
function init(){
 image=findHero();if(!image)return;
 frame=image.parentElement;if(!frame)return;
 frame.classList.add('yi-brettas-cinema-frame');
 image.classList.add('yi-brettas-cinema-image');
 addEventListener('scroll',tick,{passive:true});addEventListener('resize',tick);
 reduced.addEventListener('change',tick);tick();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();