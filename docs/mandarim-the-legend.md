# Mandarim The Legend — apresentação consultiva

## Fontes e fidelidade comercial

Fontes comerciais exclusivas: `Apresentação.pdf` (43 páginas, impressão julho/2023) e `tabela_mandarim_the_legend_outubro_2026.pdf` (5 páginas, referência outubro/2026). Os PDFs originais são preservados; `mandarim-the-legend/sources.json` registra SHA-256 e origem das imagens por página.

Identificação: Mandarim The Legend, Cyrela, Av. Morumbi 7395, Brooklin, São Paulo. Entrega prevista na tabela: outubro/2027. Não houve consulta ou criação de estoque no Supabase. As 30 combinações históricas são um conjunto documental isolado, não disponibilidade atual.

A tabela de preços é rasterizada. Todas as 30 linhas das páginas 4 e 5 foram transcritas e conferidas visualmente. Áreas de 88,83 a 145,68 m², valores impressos de R$ 1.705.325 a R$ 3.036.554. O fluxo distingue entrada, 2 iniciais, 8 mensais, 1 semestral, 1 única e principal do financiamento. A coluna de financiamento dezembro/2027 é separada e não somada ao principal. Os arredondamentos originais, até R$ 5, são expostos sem modificar preços ou parcelas. Não projetamos índices ou aprovação de crédito.

Áreas variam por andar/final. Plantas completas preservam legendas e notas e não são atribuídas automaticamente às unidades de outra área. Bay Window de 144,46 m² aparece como referência do book sem preço ou estoque inventado. Material preliminar de 2023 e rótulos invertidos nos itens 11/12 da ficha técnica são explicitados. Acabamentos parcialmente excluídos e demais ressalvas são mantidos.

## Arquitetura e captação

Rota pública dedicada: `/sp/empreendimentos/mandarim-the-legend/lucas.schoch`. Arquivos estáticos próprios, sem modificar o Arizona ou os handlers comerciais. Reutiliza os módulos verificados `portal-contact.js`, `portal-session.js` e `whatsapp-contact.js`; `/api/portal/lead` continua apontando para o mesmo serviço. A captação exige consentimento e resposta `success=true` e `supabase=true` antes de liberar o WhatsApp, com empreendimento/unidade, preço histórico e link. Visitor/session, UTMs, GCLID/GBRAID/WBRAID e touches são reaproveitados.

Eventos: property_view, presentation_view, presentation_unit_selected, presentation_comparison, presentation_gallery_interaction, presentation_interest, presentation_lead_created, presentation_whatsapp_click e presentation_share. Classificação VENDA e identificador mandarim-the-legend. Preview/localhost desativam tracking e envios comerciais. Não foram criados leads reais de teste.

Sem novas tabelas, credenciais, serviços ou pixels. Nenhuma alteração em campanhas, MIA, números comerciais, integrações Meta ou operações de locação/venda existentes.

## Validação

Base revisada: af4480e322854938d2fca02ff4a58af1f119076c. Preparação do portal verificou os hashes dos módulos compartilhados. Suíte CI existente ampliada: 87 testes, 87 aprovados. Inclui integridade das 30 unidades, fluxo/rounding, diferenças, deep links, consentimento, falha de persistência e transporte simulado, mais regressão do Arizona, rotas nacionais/SP/ES, locação e privacidade.

QA visual local real em 1440×960 e 390×844: hero, seleção, filtros de família/final, comparação, imagem ampliada, formulário sem envio e ausência de overflow horizontal. Botão flutuante se oculta diante do formulário e na imagem ampliada. Link de alta resolução mantém as legendas completas das plantas.

Preview remoto e Production devem ser conferidos no commit exato, com HTTP 200, canonical, assets e PDF acessíveis. O teste de captação usa transporte simulado; não comprova uma nova gravação real em produção.
