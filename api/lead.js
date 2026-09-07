const crypto = require('crypto');

module.exports = async function handler(req, res) {

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Método não permitido'
    });
  }

  try {

    const {
      name,
      phone,
      profile,
      property,
      source,
      nome,
      telefone,
      perfil,
      origem,
      utms
    } = req.body || {};

    const leadName =
      (name || nome || '').trim();

    const leadPhone =
      (phone || telefone || '')
        .replace(/\D/g, '');

    const leadProfile =
      profile ||
      perfil ||
      'Não informado';

    const leadProperty =
      property ||
      'Villa Pompeia Welconx';

    const leadSource =
      source ||
      origem ||
      'site';


    if (!leadName || !leadPhone) {
      return res.status(400).json({
        success: false,
        error: 'Nome e telefone são obrigatórios'
      });
    }


    /*
     * ============================
     * PRAEDIUM
     * ============================
     */

    const praediumUrl =
      process.env.PRAEDIUM_URL;

    let praediumSuccess = false;


    if (praediumUrl) {

      try {

        const praediumResponse =
          await fetch(
            praediumUrl,
            {
              method: 'POST',

              headers: {
                'Content-Type': 'application/json'
              },

              body: JSON.stringify({

                Nome: leadName,

                WhatsApp: leadPhone

              })
            }
          );


        if (!praediumResponse.ok) {

          const responseText =
            await praediumResponse
              .text()
              .catch(() => '');

          console.error(
            'Erro Praedium:',
            praediumResponse.status,
            responseText
          );

        } else {

          praediumSuccess = true;

          console.log(
            'Lead enviado para o Praedium com sucesso.'
          );

        }

      } catch (praediumError) {

        console.error(
          'Erro ao conectar com o Praedium:',
          praediumError
        );

      }

    } else {

      console.warn(
        'PRAEDIUM_URL não configurada na Vercel.'
      );

    }


    /*
     * ============================
     * META CAPI
     * ============================
     */

    const pixelId =
      process.env.META_PIXEL_ID ||
      '1552958819302786';

    const capiToken =
      process.env.META_CAPI_TOKEN;

    let metaSuccess = false;


    if (capiToken) {

      try {

        const cleanName =
          leadName
            .toLowerCase()
            .trim();


        const hashedPhone =
          crypto
            .createHash('sha256')
            .update(leadPhone)
            .digest('hex');


        const hashedName =
          crypto
            .createHash('sha256')
            .update(cleanName)
            .digest('hex');


        const metaPayload = {

          data: [

            {

              event_name:
                'Lead',

              event_time:
                Math.floor(
                  Date.now() / 1000
                ),

              action_source:
                'website',

              user_data: {

                fn:
                  hashedName,

                ph:
                  hashedPhone

              },

              custom_data: {

                content_name:
                  leadProperty,

                profile:
                  leadProfile,

                source:
                  leadSource,

                utm_source:
                  utms?.utm_source ||
                  'direto',

                utm_campaign:
                  utms?.utm_campaign ||
                  'none'

              }

            }

          ]

        };


        const metaResponse =
          await fetch(

            `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${capiToken}`,

            {

              method: 'POST',

              headers: {

                'Content-Type':
                  'application/json'

              },

              body:
                JSON.stringify(
                  metaPayload
                )

            }

          );


        if (!metaResponse.ok) {

          const metaError =
            await metaResponse
              .text()
              .catch(() => '');

          console.error(
            'Erro Meta CAPI:',
            metaResponse.status,
            metaError
          );

        } else {

          metaSuccess = true;

          console.log(
            'Lead enviado para Meta CAPI.'
          );

        }

      } catch (metaError) {

        console.error(
          'Erro ao enviar para Meta CAPI:',
          metaError
        );

      }

    }


    /*
     * ============================
     * RESPOSTA
     * ============================
     */

    return res.status(200).json({

      success: true,

      message:
        'Lead processado com sucesso.',

      integrations: {

        praedium:
          praediumSuccess,

        meta:
          metaSuccess

      }

    });


  } catch (error) {

    console.error(
      'Erro na API /lead:',
      error
    );

    return res.status(500).json({

      success: false,

      error:
        'Erro interno ao processar o lead'

    });

  }

};
