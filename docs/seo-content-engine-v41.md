# V4.1 — conexão do ledger: bloqueada no provisionamento humano

Referência auditada: PR Draft #36, `6855ed3eaa24fda7cb207ca9fbc535a7b5c1de28`.
Projeto `agente.yincorp` / `bgggafirdjvxihqselha`. Não houve escrita remota,
alteração de roles/policies, nova migration, inferência, merge ou publicação.

## Readback executado

A migration V4 consta no histórico remoto como `20261107212405`. O SQL, após
remoção de comentários e whitespace, tem o mesmo MD5 do arquivo versionado
`20261107205526_seo_engine_private_ledger_v4.sql`:
`b2d24a2bb6260fda6befa20757309e22`. A diferença de timestamp de registro não
justifica reaplicar a migration. Colunas, constraints, políticas e ACLs foram
conferidas separadamente. Nenhuma migration histórica foi editada.

Role: LOGIN, NOINHERIT, sem superuser/BYPASSRLS/CREATEDB/CREATEROLE/REPLICATION,
sem memberships, limite 4 conexões. Senha configurada: **não** (somente o booleano
foi consultado; nenhum hash/senha foi retornado). Schema USAGE, tabela SELECT/INSERT,
UPDATE apenas em ciphertext/revision, sem DELETE/TRUNCATE ou CREATE em public.
Nenhum privilégio em tabela/view pública ou função pública SECURITY DEFINER
ordinária. RLS habilitada e forçada; anon/authenticated/service_role sem acesso
ao schema ou tabela. Ledger com zero linhas. Não foram lidas linhas comerciais.

O conector de gestão não tem permissão de SET ROLE para o executor. Não foi
contornado esse limite: o teste de login real precisa da credencial exclusiva.
Readbacks de catálogo não são prova de conexão Cloud autenticada.

`pgrst.db_schemas` e configurações visíveis de role não revelam a lista efetiva
da Data API. A ausência de grants foi provada; a ausência de `seo_engine` nos
schemas expostos permanece **UNKNOWN** até a conferência no Dashboard.

## Bloqueio e ações humanas exatas

1. Abrir o projeto correto no [Dashboard](https://supabase.com/dashboard/project/bgggafirdjvxihqselha).
   Em **Connect**, escolher conexão direta, database postgres, porta 5432.
   Em **Database > Settings > SSL Configuration**, obter o certificado raiz
   oficial. Não trocar enforcement, reiniciar o banco ou aceitar certificado
   sem validação. Em **Integrations > Data API > Settings > Exposed schemas**,
   confirmar que `seo_engine` NÃO consta. Não alterar a lista/políticas comerciais
   para viabilizar SEO; se houver exposição, registrar e interromper.
2. No gerenciador de segredos do responsável, gerar senha forte exclusiva para
   `seo_engine_executor`. Em um terminal privado do operador autorizado, conectar
   com seu perfil administrativo seguro e TLS verify-full; executar interativamente
   `\password seo_engine_executor`. O comando pede a senha sem a colocar em claro
   no histórico/log SQL. Não colar `ALTER ROLE ... PASSWORD '<valor>'` no SQL Editor,
   chat, CLI arguments, Git ou logs. Não usar Reset database password: isso muda
   postgres, que não é a credencial SEO. Credencial administrativa fica somente
   com o operador, nunca no Cloud/runner. Este passo não foi executado pelo agente.
3. Provisionar no secret manager/runtime do ambiente Cloud `yincorp-landing`:

   | Nome | Conteúdo exigido, nunca valor em chat |
   | --- | --- |
   | SEO_CONTENT_LEDGER_DATABASE_URL | URI PostgreSQL do login seo_engine_executor, host db.bgggafirdjvxihqselha.supabase.co, porta 5432, database postgres; senha exclusiva percent-encoded; sem query string |
   | SEO_CONTENT_LEDGER_TLS_CA | Conteúdo PEM completo da CA oficial, não caminho de arquivo nem chave privada |
   | SEO_CONTENT_LEDGER_KEY | Chave AES de 32 bytes em 64 caracteres hex; gerar uma vez no vault, estável entre sessões; backup/escrow privado separado do banco |
   | SEO_CONTENT_OPENAI_PROJECT_ID | ID oficial proj_... do projeto OpenAI yincorp-seo; necessário à identidade do agregado; não usar valor sintético |

   A URL e a chave AES são segredos; a CA e o project ID não são senhas, mas
   devem chegar ao processo com os nomes do contrato. Não copiar segredos da
   Vercel ou de outro projeto. Não criar outra chave AES a cada sessão. Para
   PostgreSQL TCP, vincular credenciais de runtime próprias para esse transporte;
   um placeholder de credencial HTTP não demonstra autenticação PostgreSQL.
4. Selecionar a branch `feat/yincorp-seo-content-engine-v1`, não main, no Cloud.
   Autorizar TCP apenas ao host oficial na porta 5432 e verificar readiness
   real da configuração. Manter `SEO_CONTENT_AUTOPUBLISH=false` e
   `SEO_CONTENT_INFERENCE_AUTHORIZED=false`. Nunca exibir URL, senha, CA/key
   ou dump de env para diagnosticar. Esta sessão é Windows local, não Cloud;
   disponibilidade dos segredos no Cloud não foi atestada.

## TLS e alternativa oficial de conexão

O host direto tem AAAA e não tem A; TCP 5432 conectou por IPv6 **deste Windows**.
Isso não prova a rota Cloud nem o certificado. O adapter exige CA explícita,
rejectUnauthorized=true, hostname exato, porta e login fixos e rejeita sslmode
na query string. O novo CLI verifica pg_stat_ssl (TLS1.2/1.3 e bits >=128).
Nunca usar sslmode=require/no-verify ou rejectUnauthorized=false como contorno.

Se o Cloud não alcançar IPv6, abrir **Connect > Session pooler** e obter o host
exato, porta 5432 e ref do projeto. O login é a role dedicada com sufixo do
projeto, não postgres. Não adivinhar host de pooler, não usar a senha do agente
e não escolher transaction pooler/6543 silenciosamente. O adapter atual recusa
poolers: antes de usar, será necessária uma allowlist estreita do endpoint
oficial confirmado e validação da CA/hostname. Essa configuração ainda não foi
solicitada ao banco nem habilitada no código por suposição.

## Teste sintético seguro implementado

O contrato V4 permite apenas um escopo fixo e um run; um `createRun` de teste
consumiria o ciclo real. O novo helper `storage-probe.js` grava metadados
sintéticos em `storageProbes`, dentro do agregado AES-GCM já inicializado, sem
criar run/chamada/autorização nem reconciliar ou alterar saldos. Compara o hash
de TODOS os campos fora de history/storageProbes antes/depois. Preserva inclusive
UNKNOWN e reservas não zero. Registra UUID/hash no histórico, limita a 16 probes,
recusa sobrescrita e valida revisão, GCM, cadeia e fingerprint financeiro na leitura.
Não cria tabelas, não precisa de grants/migration novos e não altera políticas.

O ledger real está vazio: o helper recusa inicializar ou criar identidade fictícia.
Após provisionamento e confirmação do ID oficial, o `initialize` V4 já existente
pode inicializar a identidade REAL em UNKNOWN sem criar run ou autorização.
Se já existir linha, não reinicializar/resetar: ler e validar com a chave original.
Não executar `prepare`, `reconcile` ou inferência durante o teste de armazenamento.

Procedimento posterior ao provisionamento, sem chamadas pagas:

```text
node scripts/seo-content-storage.mjs check
# Somente se vazio e com ID oficial confirmado: initialize V4, não prepare.
node scripts/seo-content-ledger.mjs initialize
node scripts/seo-content-storage.mjs write .seo-test/storage-proof.json
```

Encerrar a sessão Cloud A. Transferir somente o manifesto esperado UUID/hashes/revisão
como artefato privado do responsável (sem chave/conteúdo), abrir sessão Cloud B
com os MESMOS segredos/identidade e executar:

```text
node scripts/seo-content-storage.mjs check
node scripts/seo-content-storage.mjs read .seo-test/storage-proof.json
```

`check` é read-only; não é aprovação de ativação. `read` não incrementa revisão.
`write` recusa um destino de prova já existente antes de alterar o ledger.
Falha ao persistir prova local após COMMIT deixa o checkpoint no banco; não
apagar/restaurar o ledger para repetir. Não confundir transferência do manifesto
com transferência do checkpoint: o conteúdo é lido exclusivamente do banco.
Inicialização/identidade ausente, chave incorreta, hash/revisão alterados ou mudança
financeira entre sessões bloqueiam. Remover probes ou expirar saldos automaticamente
não faz parte desta implementação.

## Evidências e limites

[Readback sanitizado](evidence/v4/storage-activation-v41.json) e
[testes focados locais](evidence/v4/storage-probe-tests.txt).
Dois testes passaram: PostgreSQL embarcado PGlite com reserva sintética UNKNOWN
não zero preservada; CLI bloqueado com inferência ativa e TLS sem downgrade.
O teste nativo adicional fecha conexões, reinicia PostgreSQL e lê em outro processo,
mas foi bloqueado no Windows antes de iniciar o servidor por
`uv_os_get_passwd/ENOMEM`. Não foi contornada a restrição do runtime. Esse teste
é executado normalmente pelo glob da CI, junto da suíte V4 existente.
Nenhuma validação local/CI é prova de duas sessões Cloud reais: elas continuam
NOT_EXECUTED até o provisionamento humano acima.

Consumo histórico e saldo OpenAI continuam UNKNOWN. Depois de comprovar armazenamento,
obter exports oficiais completos de uso e custos do projeto correto com o proprietário
autorizado, resolver os 403 sem ampliar a chave do runner silenciosamente, verificar
janela/paginação/atraso e aplicar a revisão assinada V4. Não criar orçamento novo,
assumir gasto zero ou reenviar operações UNKNOWN.

Referências oficiais consultadas:
[conexões e pooler](https://supabase.com/docs/guides/database/connecting-to-postgres),
[SSL](https://supabase.com/docs/guides/platform/ssl-enforcement),
[psql password](https://www.postgresql.org/docs/18/app-psql.html),
[schemas expostos](https://supabase.com/docs/guides/api/using-custom-schemas).
