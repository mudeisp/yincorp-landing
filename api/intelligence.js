import {compare} from '../lib/intelligence.js';
export default async function handler(req,res){
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'method_not_allowed'})}
  const path=new URL(req.url,'https://www.yincorp.com.br').searchParams.get('path')||'';
  if(path.length>500||path!=='/es/vitoria/investimento-airbnb'&&!/^\/(es|sp)\/[^/]+\/empreendimento\/[^?#]+$/.test(path)&&!/^\/alugar\/imovel\/[a-f0-9-]{36}$/.test(path))return res.status(400).json({error:'invalid_path'});
  try{const data=await compare(path);if(!data)return res.status(404).json({error:'not_found'});res.setHeader('Cache-Control','public, max-age=0, s-maxage=60, stale-while-revalidate=60');return res.status(200).json(data)}catch{res.setHeader('Cache-Control','no-store');return res.status(503).json({error:'comparison_temporarily_unavailable'})}
}

