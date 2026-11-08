# Publicação semanal SP/ES

O proprietário autorizou o executor na Vercel, a leitura do Search Console via Windsor e o orçamento futuro de US$ 0,60 por semana, limitado a US$ 3 por mês. A autorização não reconcilia nem apaga consumo histórico desconhecido.

`SEO_CONTENT_SCHEDULE_MODE=weekly-v1` seleciona o executor recorrente. O cron diário `0 12 * * *` despacha SP a partir de terça-feira e ES a partir de quinta-feira, às 09:00 America/Sao_Paulo. Cada estado tem um job por semana, com caminho editorial único. Uma execução perdida pode ser recuperada até domingo; não gera artigos retroativos de semanas anteriores.

O ledger privado mantém reservas de até US$ 0,30 por artigo, US$ 0,10 por etapa e US$ 0,60 por semana. O limite mensal é independente, inclusive em semanas que atravessam o mês. Reservas não são devolvidas automaticamente. Uma chamada UNKNOWN, inclusive histórica, impede novos envios. Os registros anteriores continuam intactos. O conteúdo é comprimido antes de AES-GCM; a leitura continua compatível com os registros antigos sem compressão.

Windsor usa apenas o Search Console da propriedade `https://www.yincorp.com.br/`, páginas SP/ES e métricas de consultas/páginas. `SEO_CONTENT_WINDSOR_API_KEY` deve existir como Secret de Production. A URL autenticada e erros do transporte nunca entram em logs. Dados incompletos ou vencidos bloqueiam a execução. Os temas são hipóteses editoriais relacionadas às consultas observadas, sem inventar volume de busca para o título.

Configuração inicial: pesquisa e redação `gpt-5.4-mini-2026-03-17`, auditor independente `gpt-5.4-2026-03-05`; limites de saída 1200/3000/1600 tokens, reasoning none. Preços configurados em micros de dólar por token: mini 0,75 entrada e 4,5 saída; auditor 2,5 entrada e 15 saída. Os custos registrados são estimativas; o teto é controlado por reservas conservadoras antes de enviar a chamada. A API key SEO permanece na Vercel e o cabeçalho OpenAI-Project vincula a requisição ao projeto registrado.

Operações privadas com CRON_SECRET: GET `op=providers` valida acesso ao projeto/modelos sem inferência paga e testa a leitura Windsor; POST `op=authorize-weekly` registra a autorização futura com inferência/publicação desligadas; GET `op=status` mostra reservas e situação dos artigos. A autorização é idempotente e não reseta saldo. Nunca publicar segredos nos comandos ou no corpo dos relatórios.

A publicação exige todos os gates PASS, corpus íntegro e completo, fontes públicas, estoque atual, links canônicos, recibos independentes vinculados ao conteúdo e SHA de produção atestado por CI. NEEDS_REVIEW permanece privado e não inicia nova geração no mesmo job. Sem pauta nova comprovada, não publica. A seleção inicial tem um conjunto finito de ângulos; esgotamento resulta em NO_NEW_EVIDENCED_TOPIC, sem reciclar artigos.

Canonical, sitemap e segurança têm prova direta pelo renderer real executado em memória, com hashes vinculados ao conteúdo e à release; links são consultados por GET público. Isso comprova a projeção antes da publicação, sem alegar que uma URL ainda privada já está pública. A leitura pública continua condicionada a todos os gates PASS e ao estado PUBLISHED. Uma conclusão FAIL do auditor independente permanece bloqueante mesmo com prova técnica positiva. Fatos, originalidade, canibalização, geografia e valor editorial continuam sob auditoria independente; a execução também verifica fontes, estoque e corpus. A redação recebe uma lista explícita de caminhos relativos permitidos e não deve transformar rótulos da interface ou atributos dinâmicos em fatos.

Para parar: SEO_CONTENT_KILL_SWITCH=true e novo deploy. Não apagar ledger, chave AES ou histórico. Alterações em segredos/configurações exigem novo deploy. O custo do cron, hospedagem e assinatura Windsor não está incluído no teto de inferência OpenAI.

Validação local: testes de produção, orçamento, calendário, idempotência, provider preflight e isolamento com PostgreSQL WASM. Os testes nativos usam conexões TCP independentes no CI Linux; o host Windows desta sessão não inicia embedded-postgres por uv_os_get_passwd/ENOMEM. A ativação depende de CI aprovado e verificação real do deployment.
