import{leadPayload,contactMessage}from'./model.mjs';
export async function captureSelection({unit,fields,consent,tracking,href,submit}){
 if(consent!==true)throw Error('Consentimento obrigatório');
 if(!fields.nome.trim()||!/^[0-9]{10,15}$/.test(fields.telefone.replace(/\D/g,'')))throw Error('Nome e WhatsApp válidos são obrigatórios');
 const payload=leadPayload(unit,fields,tracking,href);
 const result=await submit(payload);
 if(result?.success!==true||result?.supabase!==true)throw Error('Persistência não confirmada');
 return{payload,message:`Olá, meu nome é ${payload.nome}. ${contactMessage(unit)}`};
}
