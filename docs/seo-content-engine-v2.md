# SEO Content Engine V2 — execução isolada e bloqueios comprovados

Continuação do PR Draft #36, mesma branch `feat/yincorp-seo-content-engine-v1`, a partir de `94362689967c66d4d42b373a337c76c4aac235df`. Não há novo projeto, migration adicional, deploy de produção, cron ativado ou publicação pública. `SEO_CONTENT_AUTOPUBLISH=false` permanece no exemplo e foi imposto na demonstração.

A entrega foi atualizada sobre `af4480e322854938d2fca02ff4a58af1f119076c` para preservar o GEO V2 incorporado à main durante o trabalho. O helper de entidades nacionais, o wrapper SSR e os 13 testes GEO foram mantidos. A suíte completa final passou com **100/100 testes**. As evidências de execução registram o HEAD do checkout e se havia alterações locais; o JSON inclui hashes dos arquivos executados, evitando confundir um baseline Git com código ainda não commitado.

## O que foi implementado

- Descoberta por clusters geográficos a partir de consultas GSC e correspondência **exata** com URLs canônicas do inventário. A pauta educativa é explicitamente uma hipótese fundamentada em consultas relacionadas, não uma alegação de volume para o título gerado. O timestamp de cache `data_fetched_at` é preservado; reler um export não renova artificialmente a evidência.
- Pesquisa direta com registro de fontes, allowlist de host/caminho, DNS validado e fixado na conexão HTTPS, rejeição de redes privadas/reservadas, credenciais em URL, paths codificados, redirects, conteúdo inadequado, streams grandes e timeout. As fontes não são URLs escolhidas livremente pelo modelo. São recuperadas pelo servidor, com hash do corpo/trecho e data da consulta.
- Adapter real para OpenAI Responses: JSON Schema por etapa, `store:false`, sem ferramentas, modelos configurados explicitamente, auditor diferente do redator, orçamento reservado **antes** do request, limite de bytes/tokens/custo, recusa e resposta incompleta bloqueadas. Nenhuma chave foi criada, extraída ou copiada. Usa apenas `OPENAI_API_KEY` já presente no ambiente proprietário quando existir; nesta execução ela não está disponível.
- A API existente pode usar o adapter direto e pesquisa direta, sem depender obrigatoriamente dos dois gateways abstratos V1. Gateways configurados ainda são suportados para descoberta/modelo; pesquisa no caminho ativo é sempre a recuperação protegida local. Hipóteses de consultas relacionadas exigem `SEO_CONTENT_ALLOW_RELATED_QUERY_HYPOTHESES=true` no runtime, desativado por padrão. Não há ativação implícita.
- O mesmo store ganhou transporte de comandos reutilizável. PostgreSQL nativo local usa esse contrato e a migration V1 original, sem simular o mecanismo de locks com uma única conexão.
- Teste de ponta a ponta **com fixtures sintéticas claramente identificadas**: discovery → reserva → três requests de modelo independentes → auditoria → rascunho completo persistido → SSR privado → bloqueio UNKNOWN → rollback. Isso testa o código, não é apresentado como artigo real ou integração paga.

## 1. Integrações efetivamente acessadas

| Fonte | Resultado nesta execução | Uso/limite |
| --- | --- | --- |
| GSC | **CONNECTED_READ** via Windsor autenticado, propriedade URL-prefix `https://www.yincorp.com.br/` | 326 linhas query/page em 2026-10-08 a 2026-11-04. Export real usado localmente; nenhuma chave OAuth copiada. A propriedade de domínio também está conectada, mas não foi somada à URL-prefix para evitar dupla contagem. |
| Supabase | **CONNECTED_READ** | Mesmo reader público e elegibilidade do portal; somente GET, chave publishable existente, nenhum banco remoto escrito. |
| Pesquisa | **CONNECTED_READ** | Fontes municipais e páginas canônicas do portal recuperadas por HTTPS com DNS fixado. IBGE retornou indisponível nesta execução, registrado sem fabricar seu conteúdo. |
| Google Ads/MIA | **CONNECTED_READ** do relatório SSR read-only existente, via conector autenticado Vercel | 1237 termos visíveis, 3227 impressões, 271 cliques, custo de mídia BRL 582,99 e 0 conversões Google Ads em LAST_7_DAYS na leitura. São métricas de mídia existentes, não custo do engine nem leads. Sem vínculo geográfico por ID disponível no export; não usadas para inferir intenção ou bairro. |
| GA4 | **BLOCKED** | Credenciais configuradas no projeto MIA foram identificadas por metadados; não existe transporte agregado autorizado disponível ao runner local. Nenhuma leitura GA4 live é alegada. |
| IA editorial | **BLOCKED** | Existem chaves sensíveis nos projetos proprietários, mas não estão disponíveis localmente nem há endpoint de inferência reutilizável e isolado. Não foram decriptadas, copiadas ou chamadas através de fluxos comerciais que poderiam gravar conversas/leads. |

O acesso Vercel foi apenas para metadados (`decrypt=false`), configuração de conectores e GET de relatórios read-only. O conector de acesso pode criar/reusar link temporário de autenticação da plataforma; nenhum token/link sensível foi persistido no repositório. Nenhuma env, permissão, integração ou projeto foi alterado. As URLs de banco remoto já presentes no ambiente foram **ignoradas**; os testes nativos não aceitam connection string remota.

Evidências: [integration-audit.json](evidence/v2/integration-audit.json), [mia-read.json](evidence/v2/mia-read.json), [editorial-demo.json](evidence/v2/editorial-demo.json). O export GSC bruto e HTML MIA permanecem somente em `.seo-test/`, ignorado pelo Git. O relatório commitado contém projeções mínimas das oportunidades/fontes, não segredos ou conteúdo integral de relatórios.

## 2. Dois artigos solicitados: bloqueios fundamentados

| Estado | Pauta selecionada automaticamente | Justificativa observada | Resultado |
| --- | --- | --- | --- |
| SP | Como avaliar imóveis em Ipiranga, São Paulo? | 3 combinações query/page da região, 23 impressões observadas; inclui `ares ipiranga`, 21 impressões, zero clique, posição média 9,8095. Score interno 73, não ranking Google. | **BLOCKED: editorial_credentials_unavailable** |
| ES | Como avaliar imóveis em Praia do Canto, Vitória? | 7 combinações query/page da região, 54 impressões observadas; inclui `soul for life`, 27 impressões e 2 cliques. Score interno 74, não ranking Google. | **BLOCKED: editorial_credentials_unavailable** |

São sinais de consultas de empreendimentos existentes. Não foi medida demanda para os novos títulos e não se afirma que todas as consultas sejam informativas. A hipótese educativa é registrada separadamente para revisão de canibalização antes de gerar/publicar.

Pesquisa SP: [histórico municipal de Ipiranga](https://prefeitura.sp.gov.br/web/ipiranga/w/historico/160), Villa Arvo e Versos Ipiranga no portal. Pesquisa ES: [Triângulo das Bermudas e Rua Viva](https://www.vitoria.es.gov.br/semc/triangulo-das-bermudas-e-rua-viva), FIT@370 e Brettas Boutique Residence no portal. URLs, hashes, datas, número de bytes e imóveis elegíveis estão no JSON. A consulta de uma página histórica hoje não a transforma em dado atual de mercado.

Não há artigo gerado, SEO title/meta fictícios, comparação inventada ou auditoria sem autor. `article:null` em ambos os estados. As propostas de pauta não são conteúdo publicado. Fontes insuficientes também bloqueiam; nesta execução final há fonte municipal e fonte de inventário para cada pauta, mas falta o provedor editorial autorizado no ambiente isolado.

## 3. Gates e imóveis reais

Em ambos os casos: `sources=PASS` para recuperação/proveniência técnica e `inventory=PASS` para o snapshot atual de elegibilidade. `facts`, `originality`, `cannibalization`, `geography`, `links`, `editorial`, `security`, `canonical`, `sitemap`, `tests` ficam **UNKNOWN** para o artigo inexistente. Passar testes de software não autoriza atribuir PASS a um artigo que não foi gerado e auditado. Cada gate e sua evidência constam no relatório.

As recomendações SP incluem Villa Arvo e Versos Ipiranga; ES inclui FIT@370, Brettas Boutique Residence, AIR@225, Soul for Life e Forma Praia do Canto. São empreendimentos elegíveis do reader existente, não imóveis/valores criados para a demonstração. Outros itens do snapshot aparecem no JSON. Preço, metragem e prazo não foram copiados para texto editorial. Nome e classificação do fornecedor não provam autorização de uso residencial/locação; o conteúdo futuro terá de respeitar a finalidade de cada unidade.

## 4. Concorrência, segurança e rollback

[postgres-concurrency.json](evidence/v2/postgres-concurrency.json) registra PostgreSQL **nativo** 18.6 em Windows, TCP somente `127.0.0.1` e 8 PIDs de backend diferentes. Não é PGlite nem uma fila JS serializando uma conexão.

- 20 claims simultâneos por estado: exatamente um vencedor por estado/dia.
- 40 tentativas de reserva por estado, incluindo duplicatas: exatamente 5 SP e 5 ES.
- 20 reservas de custo concorrentes: 10 aprovadas, gasto reservado total SP de 1.000.000 micros, sem ultrapassar o orçamento.
- Um backend não vê alteração de configuração não commitada por outro; lock NOWAIT confirma conflito real de locks.
- Reclaim de lease troca token, rejeita worker antigo e não repõe quota consumida. Reexecução concluída é idempotente.
- Roles anon e authenticated não acessam artigos nem executam a RPC. Service role fica confinado às conexões locais de teste.
- Cada gate alternado para FAIL e UNKNOWN bloqueia publicação. Kill switch bloqueia novas execuções.
- Um publish positivo ocorre **somente em fixture descartável local** com flag explicitamente habilitada para testar o caminho positivo; rollback o retira e a flag retorna a false. Zero artigo demonstrativo publicado, zero publicação pública e zero PUBLISHED ao terminar.

Os testes de SSR/canonical/sitemap continuam na suíte existente. O teste E2E novo prova renderização privada/noindex e ausência de analytics de um rascunho sintético. Testes adicionais cobrem SSRF, DNS misto público/privado, redirects, timeout, byte limit, contrato de IA, orçamento antes do request, modelos independentes e limites de geração. [tests.txt](evidence/v2/tests.txt) é o log local completo. O workflow executa também a prova nativa e arquiva o JSON como artifact.

## 5. Custo

Geração editorial nesta execução: **USD 0**, pois nenhum request de inferência foi enviado. Não há estimativa de artigo completo sem escolher modelos e taxas autorizadas. O custo BRL da MIA é gasto histórico de mídia, não geração. As leituras públicas não usaram fornecedor de pesquisa pago; eventuais quotas/custos de conectores existentes não foram atribuídos por artigo.

No adapter direto, `SEO_CONTENT_MODEL_RATES` exige taxas explícitas por etapa. USD por milhão de tokens equivale numericamente a micros/token. Cada request reserva um limite conservador com base em bytes UTF-8, allowance de framing e teto de tokens de saída; o limite existente de USD 0,10 por chamada continua. Uso retornado pelo provedor permite **estimativa** a partir dessas taxas, não fatura. Timeout/erro mantém a reserva: não há geração paga em retry automático. Requer validar tokenização/framing, tarifas vigentes e orçamento de conta no staging antes de qualquer liberação.

## 6. Reprodução e CI

`pnpm install --frozen-lockfile --ignore-scripts` instala dependências fixadas. O PostgreSQL portátil reidrata seus links dentro de node_modules quando necessário. O cluster fica em diretório aleatório dentro de `.seo-test/`, sem instalar serviço Windows, sem criar usuário do sistema, sem usar env de banco remoto e sem remoção recursiva de diretórios. Fecha as conexões e encerra o servidor no finally.

```text
node scripts/prepare-portal.mjs
node --test *.test.mjs arizona-1002/model.test.mjs
node scripts/verify-seo-content-concurrency.mjs
node scripts/run-seo-content-demo.mjs .seo-test/gsc-live.json
```

O último comando requer um export autenticado recente do conector GSC, com conta/janela/origem e timestamp. Não roda em CI com dados sintéticos sob rótulo live. Os testes de CI usam fixtures e banco isolado. Evidências live têm data e hash para distinguir uma execução gravada de um refresh automático. Sem export/credencial local, o script deve bloquear, não inventar dados.

## 7. Critérios objetivos de ativação futura

1. Disponibilizar inferência no **ambiente isolado proprietário**, com modelo pesquisador/redator/auditor, auditor diferente e taxas atuais. Reusar a chave em seu dono ou transporte de credenciais preservadas; não copiar segredos entre projetos.
2. Gerar os dois rascunhos completos, confirmar as fontes, comparar páginas comerciais existentes e exigir qualidade independente. Todos os 12 gates precisam de evidência real; qualquer UNKNOWN continua bloqueando.
3. Fornecer refresh GSC read-only e transporte agregado MIA/GA4 com escopo por URL/estado, sem inferência de bairro por nome de campanha, sem PII e sem usar conversões Ads como leads da aplicação.
4. Repetir a validação nativa em PostgreSQL da versão do staging, com carga, timeout e revisão de RLS/grants/migration. A V2 não aplica migration remota; o serviço Supabase remoto nunca foi alvo destes testes.
5. Confirmar credenciais, custo, CI atestado do commit implantado, preview privado, rollback e kill switch em staging. Publicação automática permanece false até decisão posterior expressa.

Riscos restantes: nenhuma qualidade editorial real pode ser afirmada sem geração/auditoria; fontes podem mudar ou bloquear acesso; o registro de fontes cobre apenas as regiões cadastradas; correspondência GSC é conservadora e as novas pautas são hipóteses; geo/atribuição Ads/GA4 não foram conectados ao pipeline; taxa configurada não substitui fatura; teste local Windows não substitui a plataforma final. A V2 conclui a implementação e a prova técnica autorizadas, **não declara o motor editorial ativável nem finge ter produzido os artigos bloqueados**.

Referências técnicas usadas: [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [PostgreSQL transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html), [Node HTTPS](https://nodejs.org/api/https.html), [embedded-postgres](https://github.com/leinelissen/embedded-postgres). O adapter direto foi escolhido porque os projetos existentes já usam OpenAI; nenhum provider/modelo pago foi ativado por conveniência.
