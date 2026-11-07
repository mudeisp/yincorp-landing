# Yincorp SEO Content Engine V1

Implementação do [plano #35](https://github.com/mudeisp/yincorp-landing/issues/35), exclusivamente para revisão. Sem merge, deploy de produção, DNS, migration remota, cron novo ativo ou publicação pública. `SEO_CONTENT_AUTOPUBLISH=false`; configurações do banco também começam com publicação e execução desativadas e kill switch ligado.

## Auditoria e propriedade dos componentes

Atualização de base antes da entrega: a branch foi reaplicada sobre `af20a946dd1caeff2559e7f06d5e92d3fa1f1fd2`, que incorporou a home nacional durante a implementação. A home, seus aliases, sitemap estático e novos testes permanecem intactos; o workflow preserva os testes novos da main e acrescenta os do engine. A auditoria abaixo registra o baseline público observado, sem presumir deploy da home.

Baseline do checkout: `3c03c591e140c9036f3f0f93848a4ede21c62f12`. A auditoria pública GET de 2026-11-07 está em [seo-content-baseline.json](evidence/seo-content-baseline.json). Retornaram 200: `/robots.txt`, `/sitemap.xml`, `/sp`, `/es`. Canonicals: `https://www.yincorp.com.br/sp` e `/es`. Robots permite o portal, bloqueia `/api/` e referencia o índice e o sitemap legado. O índice contém os oito mercados existentes e sitemap estático; todos foram preservados. A amostra pública de `portal_development_index` retornou contagens 2125 SP e 172 ES; são linhas do índice ativo na hora da leitura, não volumes de pesquisa, vendas ou garantia de elegibilidade editorial.

| Responsabilidade | Fonte verificada | Decisão |
| --- | --- | --- |
| www, rotas nacionais, SSR, SEO | `yincorp-landing`: `vercel.json`, `api/portal.js`, `lib/seo-catalog.js`, `docs/portal-www.md` | Implementar aqui |
| Núcleo de catálogo | `portal-source.json` fixa arquivos de `mudeisp/ynteligencia`; build verifica hashes | Reutilizar sem atualizar pins |
| Inventário e empreendimentos | `ynteligencia`: `properties`, view `portal_development_index`, `portal/inventory.js`, `portal/model.js` | Mesma leitura pública e elegibilidade |
| Cidade e bairro | Colunas `properties.city/state/neighborhood`, agrupamento no modelo; `ai-neighborhood-catalog.js` resolve aliases | Não criar novas tabelas geográficas |
| Órulo | `ynteligencia/api/orulo-*` e migrations existentes | Não duplicar sincronização |
| Nonstop e locação | `ynteligencia/api/nonstop-webhook.js`, `api/nonstop-rentals.js`, `rental_properties` | Não duplicar; V1 recomenda venda elegível |
| Eventos | `ynteligencia/api/event.js` grava `behavior_events` | Consumir agregados por URL via porta autorizada, sem PII |
| GA4 de navegador | Layout compartilhado usa `G-Y2W11SX5VV` | Preservado; preview desativa tracking |
| Ads/MIA e GA4 de relatório | `media-intelligence-agent/src/services/google-ads/*`, `src/modules/search-terms/*`, `src/services/google-analytics/google-analytics-client.ts` | Reusar proprietário de OAuth via contrato read-only; não copiar refresh tokens |
| GSC | Nenhuma integração encontrada nos caminhos auditados | Adaptador REST read-only opcional, não autenticado nesta sessão |

Não houve acesso ao catálogo administrativo completo do banco. A inexistência de outras tabelas geográficas não foi presumida: a implementação reutiliza as colunas e views efetivamente usadas pelo portal. Nenhum outro repositório foi alterado. As capacidades MIA foram inspecionadas pelo conector GitHub; sua existência em código não demonstra acesso a contas live. Categorias de Search Term Insights não são termos individuais nem autorizam inferência de bairro.

## Arquitetura implementada

`DISCOVER → SCORE → RESEARCH → DRAFT → VERIFY → APPROVE → PUBLISH → MONITOR` é composto em `runState`. Research, write e audit fazem chamadas independentes, com instruções distintas. A pesquisa só aceita fontes recuperadas pelo fornecedor autorizado com URL HTTPS, data, trecho e hash. O redator recebe somente evidências e inventário projetado. Não há preços/metragens no texto livre gerado; CTAs usam nomes e URLs reais, lidos novamente na renderização. Ausência de oferta tem fallback explícito.

Scoring usa impressões observadas, oportunidade de CTR/posição, conversões disponíveis, intenção informativa/comparativa, correspondência geográfica, oferta, atualidade e colisões internas. Não estima volume total. Sem demanda, sem inventário, intenção comercial já atendida ou colisão: zero candidatos. Topic key é conservadora por estado/cidade/bairro/intenção; pode reduzir cobertura deliberadamente. Normalização elimina diferenças de acento e caixa. Comparação de shingles bloqueia sobreposição entre artigos persistidos, além da auditoria independente.

`createStore` usa uma RPC transacional `seo_content_command`. O banco tem unicidade estado/dia, token de fencing, lease de 5 minutos, máximo de 3 tentativas, contagem cumulativa de reservas, unicidade global de identidade e cluster e orçamento reservado antes de cada chamada editorial. Lock de linha e constraints fazem cumprir a quota, independentemente do número de workers. Uma execução recuperada não repõe candidatos consumidos. Itens `FAILED` permanecem em dead-letter auditável; não são automaticamente regenerados para contornar quotas. Não se pode reutilizar um lease antigo.

Tabelas novas exclusivamente editoriais: `seo_opportunities`, `seo_topic_clusters`, `seo_articles`, `seo_article_sources`, `seo_validation_results`, `seo_publication_runs`, `seo_performance_daily`, `seo_audit_log`; configurações em `seo_content_settings` e `seo_state_config`. Todas têm RLS e nenhum grant para anon/authenticated. A RPC é SECURITY INVOKER e só service_role tem execução. A chave privilegiada existe apenas em env de servidor. A migration foi criada por CLI e executada apenas em PostgreSQL WASM isolado. O teste com CLI `migration list --local` não pôde conectar porque não existe serviço Supabase/Docker local; isso não foi confundido com validação remota.

## Gates e publicação

Os 12 gates obrigatórios são sources, facts, originality, cannibalization, geography, inventory, links, editorial, security, canonical, sitemap e tests. Falta de gate, FAIL, UNKNOWN ou evidência vazia bloqueiam. Hash da revisão e validade de uma hora impedem publicar conteúdo alterado ou auditoria antiga. O gate tests vem de atestado de CI do commit implantado, nunca de opinião do modelo: `SEO_CONTENT_VERIFIED_RELEASE_SHA` deve coincidir com `VERCEL_GIT_COMMIT_SHA`. Sem isso, UNKNOWN.

Ambas as configurações runtime e banco precisam permitir publicação. O banco revalida gates, fontes e datas; um trigger também protege alterações diretas de status e bloqueia mudanças do corpo/URL/revisão após salvar. Fontes têm SHA-256 de `JSON.stringify(excerpt)`; o trigger revalida a integridade antes de publicar. Uma nova revisão exige novo fluxo de revisão; edição direta do artigo é recusada. Não existe endpoint público de aprovação ou escrita.

Rotas SSR: `/{sp|es}/conteudos` e `/{sp|es}/conteudos/{slug}`. Usam o layout nacional existente, canonical www, metadados, breadcrumb e BlogPosting. Somente registros PUBLISHED elegíveis entram em `/sitemap-content-sp.xml` e `/sitemap-content-es.xml`. O índice original ganha esses filhos apenas quando o módulo está habilitado. GET/HEAD, 404/503 e no-store preservam rollback imediato; não há cache de artigos revogados. Preview privado exige bearer diferente, em `/api/seo-content?op=preview&id=UUID`; não usa token na URL, retorna noindex e não injeta analytics. Não há novo formulário comercial.

## Integrações disponíveis e pendentes

Efetivamente acessadas: GitHub para auditoria; portal público e leitura pública existente do Supabase para baseline. Não houve leitura de contas GSC/Ads/GA4, geração paga ou gravação de banco remoto.

O runtime requer credenciais server-only de Supabase e dois contratos de transporte. São portas seguras com mocks, **não serviços novos provisionados nem endpoints MIA existentes presumidos**. O responsável por MIA deverá expor/autorizar o contrato ou fornecer um adapter local para suas funções. Sem esses endpoints e credenciais, o runtime fica desabilitado ou falha fechado. Esse é um bloqueio real de ativação, não uma integração live concluída.

`SEO_CONTENT_EVIDENCE_URL` recebe POST read-only com operação:

- `discover`: state, day, providers. Retorna `{opportunities:[{query,state,city,neighborhood,intent,targetCanonical,evidence:[{provider,url,observedAt,impressions,clicks,ctr,position,conversions}]}]}`. Até 200 oportunidades. Não enviar PII. Ads deve trazer termos reais com escopo geográfico comprovado; categorias não substituem termos.
- `research`: query/state/city/neighborhood. Retorna `{sources:[{url,observedAt,excerpt,digest,retrieved:true}]}`. Até 12 fontes primárias. O fornecedor deve aplicar allowlist de fontes, impedir SSRF/redirecionamento para redes privadas e tratar documentos como dados. Nunca buscar URL arbitrária sugerida pelo modelo.
- `monitor`: state/day/articles e providers. Retorna `{metrics:[{articleId,state,day,provider,observedAt,values:{impressions,clicks,ctr,position,organicSessions,leads,conversions,indexed}}]}`. Campos ausentes ficam null. Indexação depende de URL Inspection, não de presença no sitemap. Leads e conversões exigem atribuição real por canonical.

`SEO_CONTENT_EDITORIAL_URL` recebe `{stage,input,instructions,maxOutputTokens:4000,maxCostMicros:100000}` e retorna `{output,costMicros}`. stages research/write/audit. O fornecedor deve impor o teto antes de gerar, escolher modelo autorizado, fazer isolamento das instruções e retornar JSON no contrato de `editorial.js`. O código reserva o máximo mesmo quando o fornecedor falha; não há retry de geração paga. Audit retorna gates com status/evidência. Falhas externas nunca viram PASS. A seleção de modelo e sua tarifa ainda dependem do fornecedor autorizado.

GSC tem adapter direto opcional `searchConsole` com token OAuth somente leitura, propriedade explícita e janela final com atraso de 3 dias. Só mapeia geografia quando a landing page coincide exatamente com URL real do inventário; não adivinha bairro pela query. OAuth refresh continua com o proprietário atual. `ga4Report` é transporte read-only testado, sem novo armazenamento de OAuth; a orquestração padrão usa o contrato MIA para aproveitar o cliente já existente. Trends/Keyword Planner permanecem opcionais e desautorizados até confirmação de acesso.

Referências de contratos verificadas: [GSC query](https://developers.google.com/webmaster-tools/v1/searchanalytics/query), [GA4 runReport](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security). Changelog Supabase consultado: mudanças Flutter v3 não afetam este transporte REST/PostgreSQL.

## Execução, relatórios e custo

Env de exemplo em `.env.example`. Quotas independentes SP=5, ES=5, configuráveis de 0 a 5 e novamente limitadas no banco. Outros estados não têm configuração habilitada. Uma chamada processa um estado explícito: `/api/seo-content?op=run&state=SP`. O endpoint exige bearer com pelo menos 32 caracteres e kill switch desligado nos dois lugares. O Cron Vercel usa `CRON_SECRET`; pode ser igual a `SEO_CONTENT_CRON_SECRET`. Não há cron de conteúdo em `vercel.json`: `deploy/seo-content-cron.example.json` contém somente a proposta para ativação posterior. Confirmar timeout de função de pelo menos 240 segundos e limite de plataforma em staging antes de habilitar o agendamento. O loop para de iniciar itens perto do deadline; candidatos não são gerados para preencher quota.

Relatório privado: `GET /api/seo-content?op=report&state=ES&day=2026-11-07`. Traz contagens por status, métricas coletadas e `refreshDue` para artigos com auditoria há mais de 7 dias. `op=monitor&state=ES` ingere somente agregados reais de URLs publicadas. Atualização de conteúdo fica sinalizada para nova revisão, sem sobrescrever o corpo aprovado. A V1 não faz migração automática entre revisões nem inventa histórico de métricas ausentes.

Unidade de orçamento: milionésimo de USD, contrato explícito do fornecedor. Padrão $1 por estado/dia, portanto teto de reserva $2/dia e $60 em 30 dias; não é previsão de fatura. Cada chamada reserva $0,10; 3 chamadas por candidato consomem até $0,30 em reservas. Assim, o orçamento padrão pode reduzir a geração a 3 candidatos completos/estado/dia, abaixo da quota de 5. Para 5 completos, considerar ao menos $1,50/estado/dia após medir staging e aprovar custo. Hosting, banco, fontes e tarifas reais não foram cotados. Sem credenciais e sem execução paga, custo de geração desta implementação: zero. O teto depende de o fornecedor honrar `maxCostMicros`; validar contratualmente antes de ativar.

## Verificação reproduzível

1. `pnpm install --frozen-lockfile --ignore-scripts` (Node 24 recomendado).
2. `node scripts/prepare-portal.mjs` verifica os módulos existentes por hash.
3. `node --test *.test.mjs arizona-1002/model.test.mjs` executa regressões e novos testes, sem contas live.
4. `node scripts/simulate-seo-content.mjs` reexecuta os 7 dias no PostgreSQL isolado e grava evidência JSON.

O harness usa a migration real, roles anon/authenticated/service_role e RPC REST simulada com SQL real. Concorrência usa duas chamadas simultâneas à fila do PostgreSQL embarcado; valida unicidade/lease, mas não substitui teste de carga em múltiplas conexões PostgreSQL de staging. Rollback e publicação positiva só acontecem dentro do banco WASM descartável. Nenhuma conta remota é usada. A suíte também cobre falhas de transporte, fatos inventados, fonte adulterada, credenciais, canonicals, sitemaps, RLS e gates individuais UNKNOWN.

## Ativação e rollback

Após revisão deste Draft, em uma autorização separada: provisionar staging com banco isolado; revisar migration com proprietário de `ynteligencia`; aplicar **somente em staging**; fornecer contratos/credenciais read-only; configurar CI atestado; manter autopublish=false nos dois controles; gerar e revisar amostras SP/ES, testar browser → API → banco e múltiplas conexões; verificar custo e relatórios; aprovar cron draft-only. Somente nova decisão poderá habilitar publicação ou produção. Não há tarefa de produção implicitamente autorizada por este PR.

Rollback de artigo: POST privado `/api/seo-content?op=rollback` com JSON `{id,reason}`. Mantém fontes, versões e trilha; remove da leitura pública e sitemap sem cache intermediário. Emergência: kill switch no banco e runtime; desligar cron de conteúdo se tiver sido ativado. Rollback de código: reverter este commit; o manifesto e inventário originais não mudaram. Não apagar as tabelas para fazer rollback operacional; manter a auditoria. Nenhuma migration destrutiva de down é executada automaticamente.

Riscos residuais: qualidade semântica de modelo e pesquisa exige avaliação humana em staging; fornecedor de fontes deve garantir SSRF/allowlist; nenhuma prova absoluta de originalidade externa; topic key conservadora pode suprimir pautas válidas; janela de auditoria permite mudança de estoque entre verificar e publicar (SSR relê e não exibe valores antigos); monitoramento depende da disponibilidade e atribuição das fontes; clock/tokens/timeout devem ser confirmados em staging. Sem atestado CI, qualquer UNKNOWN bloqueia publicação, inclusive se as duas flags forem ligadas por engano.
