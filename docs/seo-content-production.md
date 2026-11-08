# Motor SEO na Vercel

O endpoint `/api/seo-content-runner` executa o piloto existente com persistência privada. Cada execução processa no máximo um artigo, SP antes de ES. O cron versionado dispara diariamente às 11:20 UTC (08:20 de São Paulo). Disparos autenticados adicionais podem concluir o piloto sem esperar o próximo cron.

Não há PGlite, subprocesso Git ou arquivo temporário no caminho de produção. O driver `pg` é dependência de runtime. O portal usa `SEO_CONTENT_STORAGE=private-ledger` para ler os artigos publicados do agregado cifrado. Somente os campos públicos do artigo e as URLs/datas das fontes saem desse leitor; GSC, recibos, corpos de resposta, histórico e valores financeiros não são retornados.

## Configuração

Manter `SEO_CONTENT_AUTOPUBLISH=false` para impedir a ativação do publicador legado. O novo publicador exige `SEO_CONTENT_PUBLICATION_AUTHORIZED=true`, engine habilitado, kill switch false, todos os gates PASS e SHA de release verificado. Cada gate editorial deve vir acompanhado de recibo independente vinculado ao conteúdo e modelo resolvido distinto do redator. A publicação e sua marcação no ledger são atômicas. Retirada remove o artigo da leitura pública e sitemap sem apagar seu histórico.

Provisionar pelo gerenciador seguro, nunca pelo chat:

- `SEO_CONTENT_LEDGER_DATABASE_URL`: endpoint/role já permitidos, porta5432, database postgres, sem query string.
- `SEO_CONTENT_LEDGER_TLS_CA`: CA PEM oficial compatível com o endpoint.
- `SEO_CONTENT_LEDGER_KEY`: a chave AES original e estável de 64 hex; não regenerar na retomada.
- `SEO_CONTENT_OPENAI_PROJECT_ID`: identidade oficial `proj_...` do projeto SEO.
- `CRON_SECRET`: segredo exclusivo de pelo menos 32 caracteres.
- `SEO_OPENAI_API_KEY`: chave exclusiva do SEO, neste mesmo projeto Vercel e target Production.
- Modelos, tarifas e orçamento: os nomes já existentes de pesquisa/redação/auditoria, `SEO_CONTENT_MODEL_RATES` e `SEO_CONTENT_APPROVED_BUDGET_MICROS`.
- Google: token de acesso de leitura válido ou client ID/client secret/refresh token de uma autorização Search Console readonly existente. O refresh ocorre no servidor, sem gravar tokens no ledger. Um access token isolado não garante execução indefinida.
- `SEO_CONTENT_VERIFIED_RELEASE_SHA`: SHA exato aprovado pela CI, igual a `VERCEL_GIT_COMMIT_SHA`. Mudança de release exige nova CI e atualização; o cron de conteúdo não exige intervenção enquanto esse release permanece válido.
- `SEO_CONTENT_RECONCILIATION_REVIEW_PUBLIC_KEY`: chave pública do revisor financeiro; a privada permanece fora do executor.

## Provisionamento e leitura

Todos os comandos abaixo usam `Authorization: Bearer <CRON_SECRET>`, sem segredo na URL. Ambiente Preview não pode executar operações mutantes. Não imprimir requests autenticados ou variáveis de ambiente.

1. `GET /api/seo-content-runner?op=health`: informa nomes ausentes ou testa TLS, isolamento e decifra o ledger existente. Vazio é NOT_INITIALIZED; não é corrupção nem gasto zero.
2. Com inferência explicitamente false e publicação desautorizada, `POST ?op=initialize` inicializa a identidade real em UNKNOWN, sem run nem saldo novo. Não reinicializa/resetta uma linha existente.
3. `GET ?op=review-request` obtém identidade/snapshot para a revisão financeira. Importar via `POST ?op=reconcile` apenas a evidência completa e declaração Ed25519 já revisada. O contrato V4 de janela, identidade, snapshot e assinatura permanece preservado.
4. Provar recuperação entre sessões pelo procedimento de storage existente antes de ativar geração. Conferir no Dashboard que seo_engine não está nos schemas expostos. A checagem SQL não substitui essa observação.
5. Após CI, configuração e reconciliação comprovadas, habilitar engine/inferência/publicação e desativar o kill switch. `GET /api/seo-content-runner` pode então criar o único run permitido com GSC autenticado, gerar/auditar e publicar um artigo. Não habilitar produção com preços ou identidade de fixtures.
6. `POST ?op=withdraw` recebe `{runId,state,reason}` e retira a publicação sem liberar reservas nem apagar dados. Não existe rollback de cobrança.

## Retomada e limites

Antes do provedor, o intent UNKNOWN e a reserva são confirmados no PostgreSQL. Se uma função for encerrada, nova invocação não repete a operação. Não há lease que expire e autorize novo gasto. Corpus e inputs são checkpoints imutáveis e vencimento bloqueia retomada em vez de alterar silenciosamente o prompt.

Uma preparação que leve mais de90segundos salva o checkpoint e devolve CHECKPOINTED antes de gastar. O endpoint tem duração máxima declarada de300segundos; o plano/configuração Vercel precisa suportá-la. Chamadas do provedor têm timeout de60segundos, e o budget permanece reservado em caso de ambiguidade. Nenhum processamento continua em background após a resposta HTTP.

Todos os gates devem passar. FAIL/UNKNOWN mantém NEEDS_REVIEW, fora do portal e do sitemap; o cron não gasta novamente para reescrever o artigo. A indisponibilidade do ledger impede servir conteúdo editorial, mas os links opcionais não derrubam as páginas comerciais existentes.

**O teto vitalício existente de600000micros e o escopo de um run/dois artigos foram preservados.** Após os dois artigos, o estado é PILOT_COMPLETE, sem recriação de orçamento. Publicação recorrente além desse piloto requer uma política de ciclos e autorização financeira adicional definida pelo responsável. Este código não presume orçamento mensal ilimitado nem reconciliação de gasto zero.

## Validação e pendências de ativação

Testes sintéticos cobrem geração→auditoria→publicação→SSR→sitemap→retirada; recibos, ausência de duplicação, release divergente, saldo UNKNOWN, gates insuficientes, views e grants de coluna, chave/identidade incorretas, autenticação e refresh OAuth sem vazamento. Testes locais não comprovam conectividade do executor Vercel ao PostgreSQL real.

Em08/11/2026, a Vercel não tinha os quatro nomes do ledger e a chave SEO estava somente em Preview. O Supabase informou ledger vazio, senha do executor configurada e nenhuma relação pública acessível ao executor. A configuração dos schemas expostos e o consumo histórico continuam exigindo evidência atual. Não foram extraídos valores do Personal vault do Codex Cloud.
