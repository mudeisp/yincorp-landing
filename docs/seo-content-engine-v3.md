# SEO Content Engine V3 — contrato de inferência e resultado

Atualização: a persistência e retomada agora seguem a [V4](seo-content-engine-v4.md).
Este documento preserva evidências históricas; geração exige o ledger privado e
reconciliação descritos na V4. O saldo atual continua UNKNOWN.

Continuação do PR Draft #36 e da branch existente, sobre `6601f0e7e34f10414937f1163aea65c90fdef964`. Nenhum projeto criado, segredo remoto lido/decriptado, credencial copiada, chamada OpenAI paga executada, migration remota, deploy de produção, cron, merge ou publicação.

## Resultado real

**Ipiranga/SP: não gerado. Praia do Canto/ES: não gerado.**

A execução `node scripts/run-seo-content-demo.mjs --inference-v3` verificou o ambiente isolado e bloqueou antes do provedor. `SEO_OPENAI_API_KEY` e `SEO_CONTENT_EDITORIAL_URL`/token não estão configurados nessa sessão. Também faltam autorização explícita de inferência, teto de gasto, três modelos e respectivas tarifas. A presença de chaves sensíveis em outros projetos, documentada na V2, não as torna acessíveis aqui nem autoriza copiá-las.

O relatório [inference.json](evidence/v3/inference.json) contém os nomes faltantes, os dois casos `article:null`, research/write/audit `NOT_EXECUTED`, todos os gates do artigo `UNKNOWN`, zero requests, zero tokens, custo real de inferência USD 0 e zero publicações. Não há texto manual, mock ou fixture apresentado como artigo gerado por IA. As fontes e imóveis da [V2](evidence/v2/editorial-demo.json) são contexto anterior; não foram falsamente marcados como revalidados nesta execução bloqueada.

## Código executável acrescentado

- `inference-config.js`: preflight sem valores de segredos. Bloqueia na ausência de credencial/contrato autenticado, autorização, orçamento inteiro explícito, tarifas/modelos e `SEO_CONTENT_AUTOPUBLISH=false`. Não há modelo pago ou gasto aprovado por padrão.
- `editorial-bridge.js`: implementa o contrato existente `{stage,input,instructions,maxOutputTokens,maxCostMicros}`. Quando a credencial já estiver provisionada no ambiente isolado, a ponte usa o adapter OpenAI existente; só escuta `127.0.0.1` em porta efêmera e gera bearer aleatório em memória. Não grava/imprime chave, token ou URL autenticada. Não é um serviço de produção nem um deployment.
- Alternativamente, o runner usa `SEO_CONTENT_EDITORIAL_URL` HTTPS e `SEO_CONTENT_EDITORIAL_TOKEN` de um endpoint **já autorizado**, mantendo a chave OpenAI no proprietário do endpoint. Não provisiona outro projeto ou exporta credenciais para viabilizar esse caminho.
- O transporte existente continua HTTPS por padrão. HTTP exige opção explícita do runner isolado e aceita apenas `127.0.0.1:<porta>/editorial`, nunca localhost, outro host/path ou configuração normal de produção.
- A ponte exige autenticação, limita tamanho do request, concorrência a 1 e tokens de saída a 4000. Reserva custo conservador antes de chamar o provedor e não devolve a reserva em erro/timeout. Provider timeout=60s; cliente=75s. Não há retry pago automático.
- O runner aplica um teto aprovado comum aos dois estados, além dos limites do store e da ponte. O contrato reserva no cliente até 100.000 micros por etapa; seis etapas podem reservar até USD 0,60, mesmo quando a estimativa de uso é menor. Esse é um teto técnico, **não autorização para gastar**. O orçamento deve ser fornecido explicitamente.
- O adapter valida localmente a resposta contra o mesmo JSON Schema enviado à OpenAI: campos faltantes/extras, tipos, enums e dados inválidos são rejeitados. `store:false` e geração sem ferramentas foram preservados.
- Recibos registram somente IDs de resposta/modelo, modelo efetivamente resolvido, hashes de entrada/saída, tokens, reserva e custo **estimado** por tarifas. O recibo precisa corresponder ao stage/modelo/payload, limite de tokens e envelope de custo. Falhas sem recibo não são contadas como inferência bem-sucedida; no endpoint remoto o número exato de chamadas upstream fica desconhecido se não for observável.
- A auditoria V3 só pode manter PASS de qualidade com recibo de request independente vinculado ao artigo/fontes. Aliases diferentes que resolvem para o mesmo modelo não bastam. Ausência/inconsistência de recibo converte PASS de fatos/originalidade/geografia/editorial em UNKNOWN. O recibo comprova execução/vínculo, não veracidade: fontes e verificações determinísticas continuam obrigatórias, assim como revisão dos resultados.

Quando a configuração estiver pronta, o mesmo runner seleciona exclusivamente Ipiranga/São Paulo e Praia do Canto/Vitória a partir de inventário e evidências atuais, recupera novamente fontes verificadas e executa research → write → audit pelo contrato. Salva somente `NEEDS_REVIEW`, JSON e SSR noindex em `.seo-test/articles/v3/<uuid>/`, ignorado pelo Git. Não existe chamada de publish nesse caminho. Rascunhos de execuções anteriores não são sobrescritos. Métricas/IDs/gates ficam no relatório; corpos completos ficam privados.

## Ação necessária de provisionamento

**Provisionar `SEO_OPENAI_API_KEY` diretamente no secret store/sessão do ambiente isolado autorizado e injetá-la apenas nesse processo. Não enviar o valor pelo chat, colocar no repositório nem exportá-la de outro projeto.**

A configuração exata está em [deploy/seo-content-inference.example.json](../deploy/seo-content-inference.example.json) e `.env.example`. No mesmo ambiente, o responsável deve definir os valores não secretos autorizados:

```text
SEO_CONTENT_AUTOPUBLISH=false
SEO_CONTENT_INFERENCE_AUTHORIZED=true
SEO_CONTENT_APPROVED_BUDGET_MICROS=<inteiro explicitamente aprovado, sem default>
SEO_CONTENT_RESEARCH_MODEL=<modelo OpenAI autorizado>
SEO_CONTENT_WRITE_MODEL=<modelo OpenAI autorizado>
SEO_CONTENT_AUDIT_MODEL=<modelo independente autorizado>
SEO_CONTENT_MODEL_RATES=<JSON com input/output USD por milhão de tokens para cada etapa>
```

Formato de tarifas, sem valores inventados: `{"research":{"input":N,"output":N},"write":{"input":N,"output":N},"audit":{"input":N,"output":N}}`. Substituir N por tarifas vigentes verificadas para os modelos aprovados. Nenhum valor monetário/modelo foi preenchido como se já estivesse autorizado. Se for usado um endpoint existente, configurar URL HTTPS e token de pelo menos 32 caracteres; não é necessário disponibilizar a chave OpenAI ao cliente.

Com configuração e export GSC recente disponíveis, executar:

```text
node scripts/run-seo-content-demo.mjs .seo-test/gsc-live.json --inference-v3
```

Não é necessário alterar produção, Supabase remoto ou cron para rodar. O runner recusa inferência na falta de qualquer pré-condição; não pede nem aceita segredo pela saída do terminal. Em sessões futuras, carregar a credencial por mecanismo seguro do ambiente, sem incluí-la no comando, arquivo de evidência ou argumento de subprocesso.

## Testes e evidências

[tests.txt](evidence/v3/tests.txt) registra a suíte local. Os novos testes usam um servidor HTTP loopback real com **provedor explicitamente mockado**, exclusivamente para testar autenticação, contrato, schema, limites e recibos. Não são alegados como inferência OpenAI real. Cobrem ausência de credencial/orçamento, HTTPS por padrão, erro sem vazamento de segredo, reserva preservada sem retry, recibo ausente/adulterado e aliases sem independência.

O workflow existente já inclui `seo-content*.test.mjs`; os testes V3 entram na CI, junto com regressões de home/GEO, gates e PostgreSQL multi-conexão. A checagem de produção continua desativada por padrão para conteúdo. Custo de geração desta execução: USD 0; estimativas futuras por token serão identificadas como estimativas, nunca fatura ou prova de débito.

Referência de contrato verificada na [documentação oficial OpenAI de Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs). Não há PASS editorial real nem conclusão de geração enquanto o bloqueio de provisionamento permanecer.

## Isolamento da credencial SEO — revisão de segurança

O motor usa exclusivamente SEO_OPENAI_API_KEY; não há fallback para OPENAI_API_KEY. A chave compartilhada e suas integrações não foram alteradas. Endpoint, ponte local e runner foram atualizados. O gateway HTTPS opcional deve usar a chave dedicada no proprietário do endpoint; não é permitido encaminhar para integrações comerciais compartilhadas.

Metadados Vercel consultados sem descriptografar valores: SEO_OPENAI_API_KEY é sensitive e Preview-only; OPENAI_API_KEY é sensitive e Production-only. Não foram encontrados modelos/tarifas, autorização de gasto ou credenciais de banco SEO dedicadas na listagem. Portanto, o isolamento físico do banco Preview não está comprovado. Nenhuma geração foi executada. O endpoint agora rejeita run, monitor e rollback em VERCEL_ENV=preview antes de criar o store ou chamar provedores, inclusive com bearer válido. Somente leitura autenticada de preview/report permanece possível. O runner local usa banco isolado e não consulta credenciais de banco remoto para persistência.

A chave Preview não é exportada para o executor local. Para uma geração privada futura: disponibilizar execução autorizada no ambiente proprietário da chave; comprovar banco isolado; escolher modelos com Structured Outputs, auditor solicitado e resolvido diferente do redator; configurar tarifas verificadas, orçamento explícito e autorização de gasto. Manter SEO_CONTENT_AUTOPUBLISH=false, kill switch ativo e engine desabilitado até ativação aprovada. O endpoint Preview permanece bloqueado; esta alteração não o habilita.

Validação: suíte completa local e testes explícitos de ausência de fallback, autenticação pública e bloqueio Preview antes de acesso ao banco. O projeto não possui scripts lint/typecheck/build em package.json; sua apresentação é preparada pelo script existente prepare-portal.mjs, como na CI. Evidências históricas V2/V3 não foram reescritas como se fossem novas execuções.

## Preflight privado sem inferência — revisão seguinte

Correção comprovada: o runner V3 encerrava antes de inventário/fontes quando faltava a credencial. Foi acrescentado --preflight-only, exclusivamente junto de --inference-v3. Nesse modo a ponte editorial nunca é iniciada, nenhum adaptador pago é construído e todas as chamadas fetch que não sejam GET são rejeitadas antes do transporte. A pesquisa existente usa HTTPS GET com DNS fixado. O modo não salva artigos nem publica. Somente reservas/estágios de teste são escritos no PostgreSQL embarcado PGlite em memória, encerrado no finally. Não depende de banco Preview ou Production.

O teste seo-content-isolated.test.mjs nega global fetch e Socket.connect, fornece URLs/chave de banco remoto sintéticas como iscas e confirma claim/finish/report locais sem sequer tentar rede. Outro teste rejeita POST/PUT/PATCH/DELETE para Responses e RPC remoto, inclusive objetos Request. Os testes de gates/autopublish e ausência de fallback permanecem.

### Leituras reais desta revisão

Export GSC autenticado por Windsor, conta exclusiva https://www.yincorp.com.br/, 326 linhas query/page, janela 2026-10-08 a 2026-11-04 (último dia consolidado usado; não é dado de hoje nem volume da pauta exata). Export bruto privado em .seo-test/gsc-preflight.json; não foi combinado com a propriedade de domínio. Novo export pode ser obtido pelo mesmo conector, campos query/page/impressions/clicks/ctr/position, atualizando retrievedAt somente quando a leitura realmente ocorrer. O runner exige origem/conta/status/frescura do arquivo.

Inventário atual consultado por GET usando o leitor público existente. Cinco recomendações por estado, incluindo Villa Arvo/Versos Ipiranga e FIT@370/Brettas Boutique Residence; nenhuma estatística, preço ou metragem inventada. Fontes municipais SP/ES e duas páginas canônicas por estado recuperadas e resumidas com hashes no preflight.json. IBGE falhou e foi registrado, sem impedir as demais fontes suficientes. PASS de sources/inventory significa recuperação/integridade/elegibilidade técnica; exatidão geográfica de cada alegação e auditoria editorial permanecem UNKNOWN. Nomes comerciais que mencionem outra região não substituem a validação geográfica independente.

### Modelos e configuração preparados, sem autorização de gasto

Configuração não secreta exata em deploy/seo-content-inference.example.json, campo preparedNonSecretConfiguration. Seleção de custo controlado: research/write gpt-6-luna; audit gpt-5.4-mini-2026-03-17. Ambos suportam Responses e Structured Outputs segundo documentação oficial; auditor solicitado distinto do redator e modelos efetivamente resolvidos também devem diferir. A qualidade só poderá ser julgada depois da execução, nunca pelo nome do modelo. Acesso desses modelos na conta permanece UNKNOWN sem GET autenticado /v1/models. Não houve geração de teste paga.

Tarifas Standard de texto por milhão, verificadas em 2026-11-07: Luna input USD 0.10/output USD 0.50; Mini input USD 0.75/output USD 4.50. Sem descontos de cache/batch/flex, ferramentas ou processamento regional. Referências: https://developers.openai.com/api/docs/models/gpt-6-luna e https://developers.openai.com/api/docs/models/gpt-5.4-mini. Revalidar tarifas antes de autorizar; a tabela agregada pode mostrar outras modalidades. Não se usa preço de assinatura do Codex.

Com até 40000 bytes de payload+instruções, allowance de 2048 tokens e 4000 tokens de saída, reserva conservadora do adapter: Luna 6205 micros/chamada; Mini 49536 micros/chamada. Quatro chamadas Luna e duas Mini: USD 0.123892 no máximo estimado para um ciclo sem retry. O contrato cliente reserva 100000 micros por etapa, seis etapas = USD 0.60; propor teto explícito 600000 micros para permitir as seis reservas. Isso não é autorização nem cobrança real; tamanho excessivo, resposta incompleta e custo excedido continuam bloqueados. Não é garantido que o limite de 4000 tokens comporte todo artigo; jamais elevar limites ou fazer retry pago sem nova avaliação. A autorização atual permanece false e orçamento em branco.

### Executor e bloqueios restantes

O ambiente Cloud yincorp-landing foi listado ready/runnable=true nesta revisão, vinculado por padrão a main. É um candidato autorizado disponível na conta, não o executor desta sessão (Windows local). Selecionar a branch feat/yincorp-seo-content-engine-v1/commit atual para executar. Não foi iniciado outro chat nem criado serviço. Nenhuma ferramenta disponível aqui permite atestar a readiness do segredo dentro desse executor.

Provisionar diretamente no gerenciador de segredos do executor uma credencial SEO dedicada sob SEO_OPENAI_API_KEY, usando referência segura de vault/origem autorizada, nunca exportando a chave da Vercel. Credenciais HTTP de Cloud podem usar placeholders substituídos pelo proxy: exigir binding de nome SEO_OPENAI_API_KEY, readiness atual e destino HTTPS api.openai.com; não renomear/usar a chave compartilhada. Verificar se a variável/placeholder realmente chega ao processo, exibindo somente booleano. A mera existência do ambiente/configuração não prova isso. O segredo OPENAI_API_KEY não é aceito como fallback.

Permitir GET público para wzaegidwtdjuhqchpdpd.supabase.co, www.yincorp.com.br, prefeitura.sp.gov.br e www.vitoria.es.gov.br. IBGE é opcional e permanece com falha nesta revisão. Confirmar que o transporte HTTPS com DNS fixado é compatível com a política do executor Cloud; não desativar SSRF/TLS para contornar proxy. API OpenAI respondeu 401 a GET sem autenticação no executor local após permissão de rede: HTTPS alcançável, credencial/acesso à conta ainda não validados. No executor com segredo, fazer somente GET /v1/models e confirmar os dois IDs; nunca imprimir Authorization, headers ou o segredo.

Configuração privada não secreta preparada localmente em .seo-test/seo-private.env (ignorada por Git), com AUTOPUBLISH=false, INFERENCE_AUTHORIZED=false e orçamento vazio. Para reproduzir em outro executor, gravar somente preparedNonSecretConfiguration nesse arquivo; o segredo deve vir separadamente do gerenciador, não do arquivo. Executar preflight gratuito:

node --env-file=.seo-test/seo-private.env scripts/run-seo-content-demo.mjs .seo-test/gsc-preflight.json --inference-v3 --preflight-only

Conclusão: BLOCKED para geração. Restam segredo/binding comprovado no executor, acesso autenticado aos dois modelos e aprovação explícita de orçamento (proposta USD 0.60). Só depois da autorização, definir SEO_CONTENT_INFERENCE_AUTHORIZED=true e SEO_CONTENT_APPROVED_BUDGET_MICROS=600000 no processo; manter AUTOPUBLISH=false. Revalidar export/fontes/inventário se perderem frescor. O comando sem --preflight-only é pago e não foi executado. Nenhum banco remoto precisa ser provisionado ou desbloqueado para o runner.

Evidências: docs/evidence/v3/preflight.json e docs/evidence/v3/private-preflight-tests.txt. O HEAD do checkout local pode permanecer anterior ao commit remoto por restrição de escrita em .git; os hashes de conteúdo e worktreeDirty no relatório identificam exatamente o código executado. A publicação do patch usa o conector GitHub com conferência do parent remoto, sem sobrescrever alterações concorrentes.
