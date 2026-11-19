// V2 visual-only reveal: original Arizona HTML/CSS/JS, no PDF parsing or agent stream.
const main=document.getElementById('conteudo');
const nodes=[...main.children,document.querySelector('footer')].filter(Boolean);
const start=document.getElementById('lab-start');
const reset=document.getElementById('lab-reset');
const status=document.getElementById('lab-status');
const progress=document.getElementById('lab-progress');
let current=0,interval=null;
const titles=['Apresentação e fachada','Visão geral','Lazer e galeria','Plantas e tipologias','Seleção, comparação e fluxo financeiro','Atendimento','Informações e fontes'];
const stages=nodes.map((node,i)=>({node,title:titles[i]||'Seção '+(i+1)}));
function restore(){if(interval)clearInterval(interval);interval=null;current=0;stages.forEach(s=>{s.node.classList.add('lab-pending');s.node.classList.remove('lab-enter')});status.textContent='Pronto para iniciar';progress.style.width='0%';start.disabled=false}
function next(){if(current>=stages.length){clearInterval(interval);interval=null;status.textContent='Interface completa · simulação concluída';start.disabled=false;return}const s=stages[current++];s.node.classList.remove('lab-pending');s.node.classList.add('lab-enter');status.textContent=s.title;progress.style.width=Math.round(current/stages.length*100)+'%';if(current===stages.length){clearInterval(interval);interval=null;status.textContent='Interface completa · simulação concluída';start.disabled=false}}
start.addEventListener('click',()=>{restore();start.disabled=true;next();interval=setInterval(next,1700)});
reset.addEventListener('click',restore);
restore();
