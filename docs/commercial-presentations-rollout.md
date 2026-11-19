# Expansão de apresentações comerciais — inventário inicial

Fonte: arquivos versionados em `mudeisp/yincorp-landing`, incluindo `docs/guilherme-vita.md`, `mandarim-the-legend/units.json`, `arizona-1002/units.json` e `guilherme.vita/{haus,brooklin}.json`. Inventário parcial: não equivale ao catálogo nacional.

| Empreendimento | Book | Tabela histórica | Registros | Situação |
| --- | --- | --- | ---: | --- |
| Mandarim The Legend | Book julho/2023 | outubro/2026 | 30 | Piloto já implantado na rota Órulo |
| Arizona 1002 | Book Arizona | agosto/2026 | 94 | Página dedicada já tem apresentação e fluxo; verificar correspondência com URL Órulo |
| Haus Mitre Edition NY | PDF de book | outubro/2026 | 16 faixas | Fonte documentada, rota Órulo não verificada |
| Brooklin Senses by Cyrela | PDF de book | outubro/2026 | 37 | Fonte documentada, rota Órulo não verificada |

## Critérios de inclusão

1. Corresponder projeto, incorporadora e endereço à URL canônica do catálogo. Não inferir slug Órulo.
2. Confirmar arquivo do book e tabela histórica, origem, data e unidades.
3. Validar semântica financeira de cada incorporadora. O fluxo do Arizona usa ato, sinal, mensais, anuais, entrega e saldo; não reaproveitar as etapas do Mandarim.
4. Renderizar a apresentação no início do conteúdo, sem duplicar título principal ou alterar a navegação de conversão.
5. Manter canonical, indexação, GA4, Ads, WhatsApp, Resend e Supabase.
6. Testar desktop e 390 px, carregamento de imagens, seletores, valores, arredondamentos, alternativas de financiamento e não regressão de leads.
7. Publicar em lotes pequenos com preview e validação antes do merge.

## Lotes

- **Lote 0**: inventário e correspondência das URLs do catálogo (este PR, sem alteração em produção).
- **Lote 1**: Arizona 1002 após correspondência da URL; reutilizar seu modelo financeiro próprio.
- **Lote 2**: Haus Mitre e Brooklin Senses, após correspondência das URLs e adaptação de condições.
- **Lotes seguintes**: descobrir outros books/tabelas, validar e expandir sem criar preços ou disponibilidade.

## Limitações

O sitemap público não pôde ser recuperado nesta execução. As rotas dinâmicas do portal são servidas pelo código compartilhado `mudeisp/ynteligencia`, e não se deve assumir que as páginas estáticas dedicadas correspondem às URLs Órulo. Não publicar mudanças em massa antes do cruzamento com o catálogo.
