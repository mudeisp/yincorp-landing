# SEO Content Engine V4.2

## Resultado

Corpus real conectado ao runner existente; geração real continua BLOCKED. `SEO_CONTENT_AUTOPUBLISH=false` e `SEO_CONTENT_INFERENCE_AUTHORIZED=false`. Nenhuma inferência paga, publicação, migration ou escrita remota nesta execução.

## Corpus e preparação editorial

`comparison-corpus.js` lê o sitemap index nacional, os sitemaps estaduais pertinentes e as URLs canônicas do inventário e do GSC. Reutiliza DNS pinning, allowlist e TLS verificado do leitor existente. Verifica canonical, título, H1, noindex, tamanho, atualidade e hashes. Registra cidade, bairro, empreendimento e intenção quando identificáveis. Não acessa URLs arbitrárias nem segue redirects.

Leitura real em 2026-11-08 UTC: **Ipiranga/SP 57/57 páginas; Praia do Canto/ES 13/13**, sem falhas no conjunto declarado. Escopo: sitemap público e inventário do bairro selecionado, não garantia de cobertura de páginas privadas ou não descobertas. Evidência minimizada: [preflight.json](evidence/v42/preflight.json). Corpos completos, HTML/JSON sintéticos e export GSC continuam privados em `.seo-test`.

Correspondências exatas bloqueiam; aproximação lexical com sinônimos portugueses produz revisão UNKNOWN. Nenhuma correspondência encontrada nas duas hipóteses, o que não constitui prova de originalidade semântica. Corpus vazio, incompleto, adulterado, vencido ou de outra geografia nunca permite PASS. O auditor independente recebe um resumo limitado das páginas mais próximas; as verificações locais usam o corpus integral. Checkpoint preserva seu snapshot; não substitui silenciosamente evidências de uma execução iniciada.

Os dois bairros passaram pela simulação determinística do runner, com inventário real, fontes municipais/canônicas e o export autenticado anterior do GSC (326 linhas, janela 2026-10-08 a 2026-11-04, recuperado em 2026-11-07). Não foi fabricada uma atualização do export. Checks técnicos de SSR privado, canonical, metadados, headings, dados estruturados, links e inventário permanecem cobertos pelos testes. A simulação não representa artigos finais nem auditoria IA: gates editoriais continuam UNKNOWN e nenhum conteúdo entra no sitemap.

## Ledger e reconciliação

Contrato direto preservado: endpoint e role exclusivos, CA obrigatória, hostname/SNI, TLS>=1.2 e rejectUnauthorized=true. Pooler Session oficial continua alternativa restrita; não foram repetidos logins ou mudanças de senha. Erros de clientes ociosos agora bloqueiam operações futuras com mensagem sanitizada, sem dump do Client ou replay automático.

Este executor é Windows local; não observou o ambiente Cloud. Os nomes `SEO_CONTENT_LEDGER_DATABASE_URL`, `SEO_CONTENT_LEDGER_TLS_CA`, `SEO_CONTENT_LEDGER_KEY`, `SEO_CONTENT_OPENAI_PROJECT_ID` não estão disponíveis aqui. A conexão direta já comprovada pelo operador foi aceita sem repetir autenticação. Readback somente leitura: ledger com zero linhas e revisão máxima NULL. **Persistência real entre sessões Cloud UNKNOWN**. Nenhum novo ledger, run, orçamento ou checkpoint remoto foi criado. Testes locais de armazenamento não substituem essa prova operacional.

Consumo histórico e saldo **UNKNOWN**. A reconciliação V4 exige identidade oficial do projeto SEO, exports oficiais completos de uso/custo, hashes, janela temporal completa, snapshot e revisão Ed25519 válida e recente. Reservas UNKNOWN bloqueiam novos envios. O teto existente de 600000 micros não foi reinicializado; ausência de recibo não significa gasto zero. Não foram feitas chamadas OpenAI nesta tarefa.

## Integração e validação

Main `bd159971221cdcc06e8fb82caf953f0a5eec1fc1` integrada somente na branch do PR pelo commit `a9d006d944456ca38ac4aaa4148c10e4baed9cf8`; nenhum merge do PR. `vercel.json` preserva redirects/rewrites atuais e acrescenta a rota SEO. Workflow preserva a regressão Mandarim nova da main e os checks SEO. Arquivos e assets novos da main foram preservados.

**34 testes locais PASS:** 32 de corpus/editorial/gates/SQL/SSR/provedores/TLS/erros de pool e 2 de armazenamento/CLI. [Log](evidence/v42/local-tests.txt), [armazenamento](evidence/v42/storage-tests.txt). PostgreSQL nativo local é limitado pelo runtime Windows (uv_os_get_passwd/ENOMEM); a CI Linux executa os testes nativos multi-conexão, reinício e retomada. O erro intermitente de encerramento do pool de testes foi tratado sem ocultar erros inesperados, evitando dump de parâmetros do cliente. CI final deve ser conferida pelo SHA do PR.

## Ações restantes, sem redefinir credenciais

1. No executor Cloud autorizado, vincular os quatro nomes existentes acima pelo gerenciador de segredos, sem copiar valores da Vercel ou usar credenciais administrativas. Executar o `check` somente leitura da CLI existente. Confirmar também schemas expostos da Data API no Dashboard; este readback não prova essa configuração.
2. Em etapa posterior que permita o probe remoto, cumprir o procedimento A/B existente de `docs/seo-content-engine-v41.md`: se o ledger estiver vazio, inicializar somente a identidade real com histórico UNKNOWN; persistir o probe não financeiro, encerrar a sessão A e recuperar na sessão B com a mesma chave, validando hash/revisão/integridade. A restrição de não modificar dados remotos impede esse teste nesta tarefa.
3. Recuperar exports oficiais completos e revisão assinada para reconciliar o teto já autorizado. Se endpoints retornarem 403, o administrador fornece export/revisão por canal privado; não ampliar a chave de geração nem assumir saldo. Manter UNKNOWN até validação.
4. Antes de solicitar nova execução real, renovar o corpus (validade de uma hora), fontes/inventário/GSC quando vencidos e preços/modelos; validar a chave SEO exclusiva no executor autorizado e calcular reserva total dentro do saldo reconciliado. Somente então solicitar autorização explícita de inferência. Auditoria independente deve produzir recibos verificáveis; todo FAIL/UNKNOWN bloqueia aprovação/publicação.

Ipiranga e Praia do Canto estão preparados para preflight técnico, **não autorizados nem prontos para consumo pago** enquanto persistência e reconciliação não forem comprovadas.
