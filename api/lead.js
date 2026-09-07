import crypto from 'crypto';

export default async function handler(req, res) {

  // Aceita somente POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Método não permitido'
    });
  }

  try {

    /*
      Aceita os dois formatos:

      LPs antigas:
      nome
      telefone
      perfil
      origem

      Villa Pompeia:
      name
      phone
      profile
      source
    */

    const nome =
      req.body.nome ||
      req.body.name ||
      '';

    const telefone =
      req.body.telefone ||
      req.body.phone ||
      '';

    const perfil =
      req.body.perfil ||
      req.body.profile ||
      '';

    const origem =
      req.body.origem ||
      req.body.source ||
      '';

    const utms =
      req.body.utms ||
      {};


    /*
      VALIDAÇÃO
    */

    if (!nome || !telefone) {

      return res.status(400).json({
        error: 'Nome e telefone são obrigatórios'
      });

    }


    /*
      META CAPI
    */

    const pixelId =
      process.env.META_PIXEL_ID ||
      '1552958819302786';

    const capiToken =
      process.env.META_CAPI_TOKEN;


    if (capiToken) {

      const cleanPhone =
        telefone.replace(/\D/g, '');

      const cleanName =
        nome.toLowerCase().trim();


      const hashedPhone =
        cleanPhone
          ? crypto
              .createHash('sha256')
              .update(cleanPhone)
              .digest('hex')
          : undefined;


      const hashedName =
        cleanName
          ? crypto
              .createHash('sha256')
              .update(cleanName)
              .digest('hex')
          : undefined;


      const metaPayload = {

        data: [{

          event_name: 'Lead',

          event_time:
            Math.floor(Date.now() / 1000),

          action_source: 'website',

          user_data: {

            fn: hashedName,

            ph: hashedPhone

          },

          custom_data: {

            content_name:
              origem || 'Formulario Yincorp',

            profile:
              perfil || 'Não informado',

            utm_source:
              utms?.utm_source || 'direto',

            utm_campaign:
              utms?.utm_campaign || 'none'

          }

        }]

      };


      const metaResponse =
        await fetch(

          `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${capiToken}`,

          {

            method: 'POST',

            headers: {
              'Content-Type': 'application/json'
            },

            body:
              JSON.stringify(metaPayload)

          }

        );


      if (!metaResponse.ok) {

        console.warn(
          'Erro ao enviar para Meta CAPI:',
          metaResponse.status
        );

      }

    }


    /*
      PRAEDIUM
    */

    const praediumUrl =
      process.env.PRAEDIUM_URL;


    if (!praediumUrl) {

      console.warn(
        'PRAEDIUM_URL não está configurada'
      );

    } else {

      /*
        Envia somente:

        Nome
        Telefone

        Sem e-mail
      */

      const praediumResponse =
        await fetch(

          praediumUrl,

          {

            method: 'POST',

            headers: {
              'Content-Type': 'application/json'
            },

            body:

              JSON.stringify({

                name: nome,

                phone: telefone

              })

          }

        );


      if (!praediumResponse.ok) {

        const errorText =
          await praediumResponse.text();


        console.error(
          'Erro no Praedium:',
          praediumResponse.status,
          errorText
        );

      } else {

        console.log(
          'Lead enviado para o Praedium com sucesso'
        );

      }

    }


    /*
      SUCESSO
    */

    return res.status(200).json({

      success: true,

      message:
        'Lead processado com sucesso'

    });


  } catch (error) {

    console.error(
      'Erro na API /lead:',
      error
    );


    return res.status(500).json({

      error:
        'Erro interno ao processar o lead'

    });

  }

}
