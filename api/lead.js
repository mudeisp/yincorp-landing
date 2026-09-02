export default async function handler(req, res) {
  // Configuração dos cabeçalhos para evitar bloqueio de CORS no navegador
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const { nome, telefone, perfil } = req.body;

    // URL Exata e Autenticada do Webhook do Praedium
    const PRAEDIUM_WEBHOOK_URL = "https://api.praedium.com.br/v1/12052/eff285d6-a704-11f1-b277-0affe18deec3/conversion?access_token=2e1b0a3576408d4e14780289654053fbb99ad2c023c19785d4a81658d355d77c";

    const response = await fetch(PRAEDIUM_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nome: nome,
        telefone: telefone,
        origem: "Landing Page - Well Perdizes",
        perfil: perfil,
        data: new Date().toISOString()
      })
    });

    const data = await response.text();
    return res.status(200).json({ success: true, response: data });

  } catch (error) {
    console.error("Erro no proxy de Lead:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
