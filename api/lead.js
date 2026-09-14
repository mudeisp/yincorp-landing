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

      pagina,

      gclid,
      gbraid,
      wbraid,

      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,

      utms
    } = req.body || {};


    /*
     * ============================
     * DADOS DO LEAD
     * ============================
     */

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


    /*
     * ============================
     * ATRIBUIÇÃO / TRACKING
     * ============================
     */

    const tracking = {

      gclid:
        gclid || '',

      gbraid:
        gbraid || '',

      wbraid:
        wbraid || '',

      utm_source:
        utm_source ||
        utms?.utm_source ||
        '',

      utm_medium:
        utm_medium ||
        utms?.utm_medium ||
        '',

      utm_campaign:
        utm_campaign ||
        utms?.utm_campaign ||
        '',

      utm_content:
        utm_content ||
        utms?.utm_content ||
        '',

      utm_term:
        utm_term ||
        utms?.utm_term ||
        '',

      pagina:
        pagina || ''

    };


    if (!leadName || !leadPhone) {

      return res.status(400).json({

        success: false,

        error:
          'Nome e telefone são obrigatórios'

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

        const praediumPayload = {

          Nome:
            leadName,

          WhatsApp:
            leadPhone,

          utm_source:
            tracking.utm_source ||
            leadSource,

          utm_medium:
            tracking.utm_medium,

          utm_campaign:
            tracking.utm_campaign,

          utm_content:
            tracking.utm_content ||
            leadSource,

          utm_term:
            tracking.utm_term,

          gclid:
            tracking.gclid,

          gbraid:
            tracking.gbraid,

          wbraid:
            tracking.wbraid,

          pagina:
            tracking.pagina

        };


        const praediumResponse =
          await fetch(
            praediumUrl,
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json'
              },

              body:
                JSON.stringify(
                  praediumPayload
                )
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
            'Lead enviado para o Praedium com sucesso.',
            {
              origem: leadSource,
              gclid: tracking.gclid
                ? 'capturado'
                : 'não informado'
            }
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
                  tracking.utm_source ||
                  'direto',

                utm_medium:
                  tracking.utm_medium ||
                  'none',

                utm_campaign:
                  tracking.utm_campaign ||
                  'none',

                utm_content:
                  tracking.utm_content ||
                  'none',

                utm_term:
                  tracking.utm_term ||
                  'none'

              }

            }

          ]

        };


        const metaResponse =
          await fetch(

            `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${capiToken}`,

            {

              method:
                'POST',

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

      tracking: {

        gclid:
          !!tracking.gclid,

        gbraid:
          !!tracking.gbraid,

        wbraid:
          !!tracking.wbraid

      },

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
