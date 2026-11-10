const units=[["21","130,81 m²","R$ 2.127.213,56","R$ 16.261,86"],["32","130,795 m²","R$ 2.149.323,74","R$ 16.432,77"],["31","130,81 m²","R$ 2.149.488,06","R$ 16.432,14"],["62","130,795 m²","R$ 2.187.187,46","R$ 16.722,26"],["61","130,81 m²","R$ 2.187.354,68","R$ 16.721,62"],["72","130,795 m²","R$ 2.205.005,69","R$ 16.858,49"],["71","130,81 m²","R$ 2.205.174,27","R$ 16.857,84"],["82","130,795 m²","R$ 2.209.460,23","R$ 16.892,54"],["81","130,81 m²","R$ 2.209.629,16","R$ 16.891,90"],["92","130,795 m²","R$ 2.216.142,08","R$ 16.943,63"],["91","130,81 m²","R$ 2.216.311,52","R$ 16.942,98"],["101","130,81 m²","R$ 2.227.448,75","R$ 17.028,12"],["112","130,795 m²","R$ 2.249.551,25","R$ 17.199,06"],["111","130,81 m²","R$ 2.249.723,24","R$ 17.198,40"],["122","130,06 m²","R$ 2.271.824,05","R$ 17.467,51"],["131","130,81 m²","R$ 2.305.409,46","R$ 17.624,11"],["142","130,795 m²","R$ 2.316.369,61","R$ 17.709,92"],["152","130,795 m²","R$ 2.327.506,01","R$ 17.795,07"],["162","130,795 m²","R$ 2.338.642,40","R$ 17.880,21"],["151","131,45 m²","R$ 2.339.072,35","R$ 17.794,39"],["172","130,795 m²","R$ 2.349.778,53","R$ 17.965,35"],["171","131,45 m²","R$ 2.361.455,82","R$ 17.964,67"],["202","130,795 m²","R$ 2.383.187,96","R$ 18.220,79"],["191","131,45 m²","R$ 2.383.839,30","R$ 18.134,95"],["212","130,795 m²","R$ 2.387.642,52","R$ 18.254,85"],["222","130,795 m²","R$ 2.392.097,08","R$ 18.288,90"],["181","131,45 m²","R$ 2.536.878,27","R$ 19.299,19"],["11","130,81 m²","R$ 2.627.644,23","R$ 20.087,49"],["12","217,325 m²","R$ 2.728.746,35","R$ 12.556,06"]];
const refs=[['Joaquim','171,88 m²','R$ 2.389.486,00','4º andar · final 2 · 2 vagas','out/2026'],['MAC Brooklin','138,74 m²','R$ 2.487.920,40','1º andar · final 3','nov/2026'],['Infinity Brooklin','143,00 m²','R$ 2.697.018,00','Torre West · 8º andar · final 3','nov/2026']];
const get=id=>document.getElementById(id);
const make=(tag,content,cls)=>{const node=document.createElement(tag);node.textContent=content;if(cls)node.className=cls;return node;};
const cards=get('selection-cards');
const sky=make('article','','selection-card');
const select=make('select','');select.id='select-skyline';
for(const [id,area,price] of units){const option=make('option',id+' · '+area+' · '+price);option.value=id;select.append(option);}
const label=make('label','Unidade da tabela');label.htmlFor=select.id;
const price=make('p','','selection-price'), meta=make('p','','selection-meta');
sky.append(make('p','01 / EXKALLA','number'),make('h3','Skyline'),make('p','Brooklin Novo · nov/2026','developer'),label,select,price,meta);
cards.append(sky);
for(const [i,[name,area,total,unit,ref]] of refs.entries()){
 const card=make('article','','selection-card');
 card.append(make('p','0'+(i+2)+' / SUGESTÃO','number'),make('h3',name),make('p','Brooklin · '+ref,'developer'),make('p',unit,'selection-meta'),make('p',total,'selection-price'),make('p',area,'selection-meta'));cards.append(card);
}
const initial=new URL(location.href).searchParams.get('skyline');
select.value=units.some(u=>u[0]===initial)?initial:'21';
function render(){
 const [id,area,total,sqm]=units.find(u=>u[0]===select.value);
 price.textContent=total;meta.textContent=area+' · 2 vagas';
 const cells=get('sky-row').cells;
 cells[1].textContent='Unidade '+id+' · 2 vagas';cells[2].textContent=area;cells[3].textContent=total;cells[4].textContent=sqm;
 cells[5].textContent='Novembro/2026 · p. '+(['112','122','131','142','151','152','162','171','172','181','191','202','212','222'].includes(id)?'2':'1');
 get('selection-status').textContent='Comparando a unidade '+id+' do Skyline com três referências.';
 const url=new URL(location.href);url.searchParams.set('skyline',id);history.replaceState(null,'',url);
 get('contact-link').href='https://wa.me/5511992976368?text='+encodeURIComponent('Olá, gostaria de confirmar as condições da unidade '+id+' do Skyline e das sugestões. '+url.href);
}
select.addEventListener('change',render);
get('share').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href);get('share-feedback').textContent='Link da seleção copiado.';}catch{get('share-feedback').textContent=location.href;}});
render();