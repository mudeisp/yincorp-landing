import crypto from 'crypto';

export default async function handler(req, res) {
  // Garantir que aceita apenas requisições POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { nome, telefone, perfil, origem, utms } = req.body;

    // 1. Pegar credenciais das Variáveis de Ambiente da Vercel
    const pixelId = process.env.META_PIXEL_ID || '1552958819302786';
    const capiToken = process.env.META_CAPI_TOKEN;

    // 2. Se o token da CAPI estiver configurado, envia o evento Server-Side para o Meta
    if (capiToken) {
      const cleanPhone = telefone ? telefone.replace(/\D/g, '') : '';
      const cleanName = nome ? nome.toLowerCase().trim() : '';

      // Hash SHA256 exigido pelo Meta para dados de privacidade
      const hashedPhone = cleanPhone ? crypto.createHash('sha256').update(cleanPhone).digest('hex') : undefined;
      const hashedName = cleanName ? crypto.createHash('sha256').update(cleanName).digest('hex') : undefined;

      const payload = {
        data: [{
          event_name: 'Lead',
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'website',
          user_data: {
            fn: hashedName,
            ph: hashedPhone
          },
          custom_data: {
            content_name: 'Formulario ROBOT.NIC 100Leads',
            profile: perfil || 'Não informado',
            utm_source: utms?.utm_source || 'direto',
            utm_campaign: utms?.utm_campaign || 'none'
          }
        }]
      };

      await fetch(`https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${capiToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    // 3. Retorno de sucesso para o site
    return res.status(200).json({ 
      success: true, 
      message: 'Lead registrado com sucesso e enviado via Meta CAPI!' 
    });

  } catch (error) {
    console.error('Erro na API /lead:', error);
    return res.status(500).json({ error: 'Erro interno ao processar o lead' });
  }
}
