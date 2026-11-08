# SEO Content Engine V4 — persistência privada

Estado: **implementação local; ativação BLOQUEADA**. PR #36 continua Draft.
Nenhuma inferência paga, migration remota, publicação, merge ou deploy Production
foi executado. Não há prova de persistência entre duas sessões Cloud reais.
O saldo do teto anterior de USD 0,60 permanece **UNKNOWN**.

## Auditoria e recuperação

O runner V3 usava PGlite em memória para quotas/reservas, `.seo-test/` ignorado
pelo Git para artigos/export GSC, contadores em memória na ponte e um relatório
versionado escrito somente ao fim. Uma queda entre envio e relatório podia perder
a única evidência de consumo. Nova sessão/novo UUID reiniciavam o controle local.

No início desta tarefa, `.seo-test/` não existia no checkout Cloud. Não havia
recibos privados nem GSC nas áreas acessíveis shared/downloads, library-files e
scratch. O PR e suas evidências históricas registram somente execuções bloqueadas.
O artefato da CI do HEAD de referência contém validação SQL sintética, não recibos
de geração. Outros executores/vaults privados não estão disponíveis nesta sessão.
Isso é **recuperação não comprovada**, não prova de inexistência de chamadas.
Os diretórios SQL criados pelos novos testes são fixtures, não registros históricos.

GETs oficiais `/v1/organization/usage/completions` e `/v1/organization/costs`
retornaram **403**, usando exclusivamente `SEO_OPENAI_API_KEY`. Nenhuma chave
administrativa foi procurada, copiada ou exportada. Identidade oficial `proj_...`,
janela histórica completa, paginação, atraso de contabilização e total do projeto
`yincorp-seo` não foram confirmados. A janela de um dia desses probes não é uma
reconciliação histórica. [Resultado sanitizado](evidence/v4/reconciliation.json).

Leituras remotas por conector confirmaram `agente.yincorp`, ref
`bgggafirdjvxihqselha`, PostgreSQL 17 e RLS habilitada/forçada nas cinco tabelas
comerciais solicitadas. `seo_engine` ainda não existe. Não foram lidas linhas
comerciais nem alteradas políticas ou permissões existentes.
[Auditoria sanitizada](evidence/v4/storage-audit.json).

## Arquitetura implementada

A migration `20261107205526_seo_engine_private_ledger_v4.sql` cria somente o schema
`seo_engine`, a tabela `seo_engine.ledger`, suas políticas e o login exclusivo
`seo_engine_executor`, inicialmente sem senha. Não depende de `public.seo_*` da
migration V1, não expõe RPC e não altera schemas expostos do PostgREST.
**Não aplicar as migrations históricas V1 ao banco comercial.**

Para este piloto de dois artigos, o ledger é um agregado pequeno criptografado,
com PK fixa de escopo e revisão monotônica no SQL. O agregado contém:

- `runId` UUID, configuração/modelos/tarifas e estados transacionais;
- autorização registrada, reserva acumulada, estimativa dos recibos e reconciliação;
- operação única `SP|ES` + `research|write|audit`, UUID da chamada e hashes;
- requisição sem credenciais, resposta, recibo e resultado validado;
- export GSC integral original, SHA-256 dos bytes UTF-8, objeto e hash JSON;
- artigos completos, versões, fontes e auditorias, sempre `NEEDS_REVIEW`;
- checkpoints imutáveis, códigos de interrupção sanitizados e histórico encadeado.

Uma linha e `SELECT ... FOR UPDATE` tornam orçamento e deduplicação atômicos entre
conexões/máquinas. Cada mutação usa transação e `synchronous_commit=on`. Não se
mantém uma transação aberta durante HTTP. A chave de operação pertence ao escopo,
não ao UUID da sessão: criar outro run não renova orçamento nem permite reenvio.
Novos ciclos/editoriais exigem revisão explícita do escopo, não reset automático.
O limite de 16 MiB da tabela e o lock global são adequados ao piloto; expansão
exige particionar o armazenamento preservando o lock financeiro e as invariantes.

AES-256-GCM usa nonce aleatório por gravação e escopo como AAD. A chave de 32 bytes
em hex fica no secret manager, separada do banco e de seu backup. Sem a chave,
restauração SQL não recupera conteúdo. Histórico encadeado detecta alteração de
eventos dentro do agregado; não substitui backup, controle de acesso nem protege
contra um executor comprometido com acesso à chave. O login não é proprietário,
não tem BYPASSRLS, não cria objetos e não recebe DELETE/TRUNCATE. RLS é forçada.
Nenhuma permissão de tabela comercial é concedida ou revogada.

O runner/CLI recusam login administrativo, outro host/projeto, TLS sem CA,
autopublish diferente de false e credenciais herdadas de outros nomes. O preflight
de acesso bloqueia privilégios em tabelas públicas ou funções ordinárias públicas
SECURITY DEFINER. Helpers de trigger/event_trigger, que não podem ser invocados
como funções SQL ordinárias, não contam como esse acesso. O schema deve ficar
fora da Data API; grants negam acesso a anon/authenticated/service_role mesmo
se houver exposição acidental. Isso ainda requer readback remoto após aplicação.

## Reserva, interrupção e reconciliação

Antes do transporte, a transação grava a reserva e estado `UNKNOWN`. Somente
após COMMIT confirmado o adapter pode enviar. O corpo da resposta bem-sucedida é
persistido antes de parse/schema/recibo; erros HTTP guardam status, sem corpos que
possam repetir fragmentos de credenciais. Não são persistidos headers ou chaves.
Após validar recibo/hash/tokens/envelope, outra transação marca `COMPLETE`.

Resultado completo é reutilizado. Input, instruções ou modelo diferentes na
mesma operação são conflito, nunca autorização de segunda chamada. UNKNOWN em
qualquer operação bloqueia novos envios em todo o escopo. Queda HTTP, processo
morto, timeout ou confirmação perdida de COMMIT conservam a reserva. Sem retries
pagos, liberação por timeout, expiração de lease ou substituição automática do run.
Os 100.000 micros por operação continuam reservados conservadoramente, inclusive
após sucesso. Estimativas são registradas separadamente; não são valores faturados.
Consumo anterior reconciliado reduz o saldo disponível, que não é presumido.

`recover-response SP research` reconstrói resultado e recibo somente de uma
resposta completa já armazenada, sem rede. Resposta ausente/incompleta permanece
UNKNOWN. `store:false` da OpenAI foi preservado; não se presume que o provedor
permita recuperar uma resposta perdida por ID. Uma fatura agregada não prova o
conteúdo de uma chamada, e não permite removê-la/repeti-la automaticamente.

`reconcile` importa evidências oficiais privadas e uma declaração revisada assinada
com Ed25519. A chave privada de revisão fica fora do Cloud; só a pública é vinculada
ao executor. OpenAI não assina esses exports: a assinatura atesta a revisão humana,
não autenticidade criptográfica fornecida pelo provedor. O revisor precisa conferir
projeto, janela completa desde o início, todas as páginas, todas as fontes de uso,
moeda/conversão conservadora em micros, atraso de contabilização e gastos fora do
ledger. `priorSpentMicros` é o gasto anterior/externo ao ledger; não duplicar os
recibos já reservados. A evidência inteira é criptografada no banco.

A declaração inclui `scope`, `projectId`, `projectName=yincorp-seo`,
`authorizationMicros=600000`, `priorSpentMicros`, `windowStart`, `windowEnd`,
`completeOfficialWindow=true`, `reviewedAt`, `evidenceHash` e `snapshotHash`.
`evidence` contém `project:{id,name}`, exports `usage` e `costs`.
Hashes são `sha256(JSON.stringify(value))`; a assinatura usa os bytes exatos de
`JSON.stringify(statement)`. Assinatura alterada, revisão com mais de 24h,
snapshot modificado ou qualquer chamada UNKNOWN bloqueiam a importação.
Esse mecanismo **não foi usado para aprovar saldo real nesta tarefa**.

## Integração e retomada

O comando existente `--inference-v3` agora exige `SEO_CONTENT_RUN_ID` e ledger
persistente inicializado/reconciliado. GSC e configuração vêm do run salvo;
configuração divergente bloqueia. Fontes/inventário são relidos e os inputs pagos
são checkpoints imutáveis; fontes salvas vencidas bloqueiam. Resultados completos
e artigos já salvos são reutilizados. O PGlite restante é somente a validação local
existente; não é o registro financeiro ou editorial definitivo.

Artigos/recibos reais deixam de ser escritos em paths versionados ou cópias locais
em texto claro pelo runner. Relatórios ficam no ledger. O preflight gratuito
continua disponível e não envia inferência. O modo V2 sem flag e a geração no
endpoint público antigo ficam bloqueados para impedir caminho pago sem ledger.
Preview/report/monitor existentes não são convertidos em escritores desse schema.

CLI após provisionamento **futuro autorizado**:

```text
node scripts/seo-content-ledger.mjs initialize
node scripts/seo-content-ledger.mjs prepare <export-GSC-privado.json>
node scripts/seo-content-ledger.mjs status
node scripts/seo-content-ledger.mjs review-request
node scripts/seo-content-ledger.mjs reconcile <revisao-assinada-privada.json>
node scripts/seo-content-ledger.mjs recover-response SP research
```

`initialize` é idempotente e começa UNKNOWN, nunca recria saldo. `prepare` registra
o orçamento previamente autorizado e o export, não reconcilia custos nem envia
inferência. Não criar outro run para retomar: obter o UUID via `status` e vinculá-lo
como `SEO_CONTENT_RUN_ID`. Retomar só depois das pendências abaixo, usando:

```text
node scripts/run-seo-content-demo.mjs --inference-v3
```

Este último comando é pago quando habilitado. Não foi executado nesta tarefa.

## Plano de aplicação posterior — nenhuma etapa remota aplicada

1. Congelar todos os dispatchers SEO; manter inferência não autorizada,
   engine desabilitado, kill switch ativo e `SEO_CONTENT_AUTOPUBLISH=false`.
   Conferir projeto/ref e HEAD do PR; guardar digest da migration revisada.
2. Confirmar no Dashboard os schemas expostos. A sessão SQL retornou null para
   `pgrst.db_schemas`; isso não confirma a configuração da Data API. Verificar
   colisão de role/schema e acesso herdado via PUBLIC, sem tocar tabelas comerciais.
3. Plano atual confirmado: **Free**. Documentação oficial garante backups diários
   nos planos pagos e recomenda exports próprios no Free. Inventário de backups e
   restore deste projeto continuam UNKNOWN. Usar destino privado já existente do
   proprietário para dump e escrow separado da chave, sem contratar serviço.
   Conferir espaço, retenção, hashes e testar restauração offline antes de ativar.
4. Capturar schema-only/ACL/policies/funções das tabelas comerciais e backup privado
   consistente conforme política do proprietário. Export de SQL com dados nunca
   vai ao Git, PR, logs ou artifacts da CI. Medir RPO real; não prometer RPO zero.
5. Após autorização específica de aplicação, executar **somente a migration V4**
   em transação com credencial administrativa temporária do responsável. Não usar
   db push indiscriminado: a V1 histórica cria objetos `public` e não pertence
   a esta aplicação. Nenhuma alteração nos objetos comerciais é necessária.
6. Provisionar senha do novo login fora de logs/Git, sem reaproveitar credenciais
   do agente. Vincular ao Cloud `SEO_CONTENT_LEDGER_DATABASE_URL` (login executor,
   host direto `db.bgggafirdjvxihqselha.supabase.co`, porta 5432, database postgres),
   `SEO_CONTENT_LEDGER_TLS_CA`, `SEO_CONTENT_LEDGER_KEY`, ID oficial `proj_...` em
   `SEO_CONTENT_OPENAI_PROJECT_ID` e chave pública de revisão. Acesso TCP/TLS ao
   host ainda não está configurado na política Cloud. Conferir IPv6/rota suportada;
   se precisar do session pooler, validar endpoint e adaptar a allowlist antes,
   sem desativar TLS ou aceitar banco arbitrário.
7. Readback: schema privado, RLS forçada, grants mínimos, nenhum membro privilegiado
   no executor, nenhuma rota pública e digests comerciais iguais ao preflight.
   Inicializar UNKNOWN. Testar checkpoint sintético em duas sessões Cloud reais
   usando a mesma chave/banco/UUID. Testar também acesso negado anon/authenticated,
   TLS e recuperação após desconexão. Esse teste remoto **ainda não ocorreu**.
8. Obter o export GSC autenticado atual do Windsor e evidências históricas de uso
   com o proprietário autorizado OpenAI. Não elevar escopo da chave SEO em silêncio.
   Armazenar o export privado no ledger e realizar a revisão assinada descrita acima.
9. Revalidar tarifas/modelos/fontes/inventário e testes do HEAD final. Somente após
   saldo comprovado ou nova autorização financeira específica, habilitar inferência
   no processo e retomar o mesmo UUID. Nenhuma publicação automática será habilitada.

Rollback: desligar dispatchers e revogar apenas o login SEO/encerrar suas sessões;
preservar schema/ledger criptografado para auditoria. Não derrubar schema com dados
sem backup verificado e aprovação. Para desfazer instalação vazia, remover somente
os objetos novos e role após confirmar dependências. Não restaurar o banco inteiro
do agente para desfazer SEO. Restaurar dump em banco isolado primeiro, nunca por
cima das tabelas comerciais.

Após qualquer restauração de snapshot/backups, bloquear inferência e marcar
reconciliação UNKNOWN antes de reconectar o executor. Uma restauração pode remover
intents posteriores e reabrir risco de duplicação; a corrente de hashes não detecta
sozinha o rollback integral para snapshot antigo válido. Reconciliar a janela
perdida com registros externos oficiais. Sem isso, não retomar geração.

## Evidências e limites

[Suíte local: 131/131 PASS](evidence/v4/local-tests.txt).
[Concorrência nativa](evidence/v4/native-concurrency.txt) e
[manifesto/hash da migration](evidence/v4/validation.json).

`seo-content-durable.test.mjs` usa PostgreSQL nativo loopback e provedores
explicitamente sintéticos. Cobre reinício do servidor e outro processo, conexões
concorrentes, socket HTTP encerrado após receber POST sintético, SIGKILL do executor, confirmação de
COMMIT perdida, recuperação de resposta salva, recibos ausentes/inconsistentes,
limite com consumo histórico, criptografia, assinatura de revisão, RLS/grants,
login sem privilégios administrativos, preservação de objetos comerciais e versões
com auditorias. Não é teste em Supabase remoto nem entre executores Cloud reais.

Nenhum resultado local deve ser promovido a “persistência Cloud comprovada”.
Pendências: autorização de aplicação, backup/restore privado, conexão do Cloud,
teste real compartilhado, GSC e recibos históricos recuperados ou reconciliados,
identidade OpenAI oficial e saldo. Até lá, operação permanece **BLOCKED**.
