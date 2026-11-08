# V4.1 — auditoria e simulação determinística dos dois bairros

Referência auditada: PR Draft #36, e5f35bfe0b63116eaa171d0047bf29ac08a3d23a.
Não houve inferência paga, publicação, autenticação PostgreSQL repetida, migration,
alteração de credenciais/permissões, merge ou deploy. Flags de execução:
SEO_CONTENT_AUTOPUBLISH=false e SEO_CONTENT_INFERENCE_AUTHORIZED=false.

## Arquitetura e contratos existentes

O portal usa HTML SSR nos handlers Node/Vercel existentes, leitura de inventário
compartilhada e rotas estaduais/nacionais. O pipeline é discovery/score/research/
draft/verify/approval/publication/monitoring, com quotas, deduplicação e gates.
O modo real do runner exige ledger durável, UUID de run existente, configuração
idêntica à salva, reconciliação RECONCILED e ausência de chamadas UNKNOWN.
Não cria saldo ou run para contornar bloqueio; chamadas completas podem ser reutilizadas.

O ledger é um agregado AES-256-GCM com AAD do escopo fixo, revisão monotônica,
histórico encadeado e transações SELECT FOR UPDATE. Reserva e UNKNOWN são
persistidos antes do envio pago; respostas são salvas antes de parse/auditoria.
Não existe retry pago automático. O limite financeiro é conjunto, não por bairro.
Preflight/simulação usam o PGlite local existente, sem inicializar ou escrever
no ledger compartilhado. Nenhum orçamento real é reservado pela simulação.

O adapter PostgreSQL aceita a conexão direta validada pelo operador e o Session
Pooler explicitamente pinado. CA, certificado/hostname, usuário dedicado, porta5432,
database e projeto são obrigatórios. Não foi repetida a autenticação já concluída.
O atual executor Windows não dispõe das variáveis de conexão; isso não comprova
ausência no Cloud. Persistência entre sessões Cloud reais não foi alegada.

Credenciais necessárias ao modo real: SEO_CONTENT_LEDGER_DATABASE_URL,
SEO_CONTENT_LEDGER_TLS_CA, SEO_CONTENT_LEDGER_KEY estável e
SEO_CONTENT_OPENAI_PROJECT_ID oficial; depois SEO_OPENAI_API_KEY exclusiva,
modelos/tarifas e autorização de gasto. Neste dry-run nenhuma dessas credenciais
de escrita/inferência foi utilizada. O export GSC autenticado anterior foi usado
sem modificar retrievedAt: 326 linhas, conta URL-prefix www exclusiva, janela
08/10–04/11, consulta de export em 07/11. A demanda da pauta educativa é hipótese
relacionada às consultas existentes, não volume medido para o título sugerido.

## Problemas corrigidos

1. O runner real fornecia pages=[] para a auditoria. Uma asserção PASS do modelo
   poderia aprovar canibalização sem corpus. Agora canibalização e originalidade
   ficam UNKNOWN quando o corpus não está disponível, mesmo se o modelo disser
   PASS. Um corpus real de comparação ainda precisa ser conectado; não foi
   fabricada uma lista vazia como prova de inexistência de concorrência interna.
2. O gate de inventário verificava estado/cidade/atualidade, mas não bairro.
   Agora exige também bairro normalizado igual ao da oportunidade.
3. Acrescentado --deterministic-dry-run ao runner existente, somente em conjunto
   com --inference-v3 --preflight-only e ambas as flags explicitamente false.
   Reutiliza discovery, fontes, inventário, agentes editoriais, verificação,
   persistência PGlite e SSR existentes; não é um motor editorial paralelo.

O redator da simulação é um port determinístico explicitamente sintético. O
auditor sintético retorna UNKNOWN, sem recibos OpenAI falsos. Os textos são
identificados como simulação e não constituem os artigos editoriais finais.
O corpo contém apenas nomes do inventário consultado e orientações genéricas
de confirmação; não apresenta preços, metragens, valorização ou estatísticas.

## Execução e evidências

```text
node --env-file=.seo-test/safety.env scripts/run-seo-content-demo.mjs .seo-test/gsc-preflight.json --inference-v3 --preflight-only --deterministic-dry-run
```

O arquivo safety.env é privado/ignorado e contém somente as duas flags false.
Cada execução recebe diretório privado próprio para preservar resultados prévios.
JSON/HTML completos e relatório local ficam em .seo-test/deterministic-dry-run/UUID/;
nenhum corpo foi adicionado ao Git. A execução auditada ocorreu no snapshot de
validação .seo-test/v41-validation com os módulos do HEAD remoto e o patch,
preservando o checkout local anterior. Hashes/worktreeDirty constam na evidência.

Foram selecionados Ipiranga/São Paulo/SP e Praia do Canto/Vitória/ES pelo vínculo
exato entre GSC e inventário atual. Cinco recomendações consultadas por estado,
incluindo Villa Arvo/Versos Ipiranga e FIT@370/Brettas Boutique Residence. O
cadastro geográfico do inventário é evidência técnica; exatidão dos endereços
e informações de bairro continua sujeita à auditoria independente.

Por estado, foram recuperadas uma fonte municipal e duas páginas canônicas de
imóveis com HTTPS/DNS pinado e hashes de integridade. IBGE falhou e foi registrado.
Os checks técnicos passaram nos dois casos: geografia cadastral exata, um H1,
H2/H3 válidos, limites de título/descrição, canonical www coerente, noindex e
ausência de valores/preços/metragens no texto. Links internos são limitados ao
pilar estadual e imóveis consultados; a checagem de links existentes foi executada.

Todos os gates editoriais permanecem UNKNOWN, pois não houve auditoria editorial
real nem corpus completo de comparação. Isso não é aprovação para publicação.
Sitemap real não foi alterado. O teste SSR existente confirma Article/BreadcrumbList
no cenário publicado sintético; previews privados ficam noindex e não são
tratados como artigos publicados. A simulação gravou somente NEEDS_REVIEW no
PostgreSQL local e comprovou zero publicações.

[Resumo minimizado](evidence/v4/deterministic-dry-run.json) e
[17 testes locais aprovados](evidence/v4/deterministic-dry-run-tests.txt).
Cobrem SQL/quotas/idempotência, SSR/canonical/schema/sitemap, fontes, falhas externas,
gates, corpus ausente, bairro incorreto e recusa de simulação com flags inseguras.
A simulação existente de sete dias também passou: 70 fixtures, zero duplicatas,
zero publicações. Testes nativos adicionais são executados pela CI; não se
reclassifica o Windows com restrição uv_os_get_passwd como Cloud funcional.

## Session Pooler 28P01

PostgreSQL classifica 28P01 como invalid_password. Isso identifica a fase de
autenticação, não prova falha de certificado ou necessidade de redefinir senha.
Sem inspecionar metadados privados da configuração, a causa específica permanece
inconclusiva. Verificações não invasivas: confirmar no gerenciador o host correto,
usuário seo_engine_executor.bgggafirdjvxihqselha e codificação URI da senha, sem
imprimi-la e sem codificar duas vezes. O tenant vem do sufixo do usuário no
Supavisor; o login direto usa seo_engine_executor sem esse sufixo. Não foram
tentados novos logins, alteradas permissões ou redefinidas credenciais.

A conexão direta validada permanece preferida quando a rede do executor alcança
seu endpoint com verificação TLS. O pooler não é requisito para o dry-run local.
Referências: [SQLSTATE oficial](https://www.postgresql.org/docs/current/errcodes-appendix.html)
e [roteamento Supavisor](https://supabase.github.io/supavisor/connecting/overview/).

## Condições para o primeiro conteúdo real

Comprovar o binding e persistência do ledger no executor autorizado usando a conexão
direta já validada; confirmar Data API privada e a mesma chave/identidade entre
sessões. Recuperar export GSC e fontes atuais no run real. Conectar corpus de
páginas existentes para comparação. Reconciliar a janela histórica OpenAI completa
com revisão assinada V4 e demonstrar saldo; nunca presumir gasto zero ou novo teto.
Só depois, em outra etapa explicitamente autorizada, habilitar inferência para o
mesmo run. Nesta entrega o custo novo de inferência é USD0; consumo histórico e
saldo continuam UNKNOWN, sem alteração da autorização financeira anterior.
