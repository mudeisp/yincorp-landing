# Windows checkout e preservação do arquivo legado Google

Base: 50347974d36986719da7b3c4413cfbda934a3691. O arquivo `100leads/google-site-verification: googlec52bf83be63f0cdb.html` bloqueia checkout Windows por conter dois-pontos. Histórico: criado em d089a3b, atualizado em 0e80e38 em 03/09/2026. Blob original `7394f6547865969cdfcb8e7a7508357672540ff7`, 28 bytes.

O conteúdo atual é somente o nome do arquivo, não o marcador completo esperado para verificação HTML Google. A intenção de verificação é clara pelo histórico, mas não há prova de verificação ativa sustentada por esse arquivo. Não foi alterado DNS, Search Console, meta tag, outro token ou Production. A documentação Google exige preservar nome/conteúdo/URL do token efetivo e não usar redirect; esta correção não declara nova propriedade verificada.

A correção move o MESMO blob para `100leads/google-site-verification-legacy.html`, preservando exatamente os bytes. Um rewrite interno com destino fixo mantém a URL antiga e suas formas percent-encoded; sem redirect e sem enviar o visitante para outro domínio. Todas as regras anteriores permanecem idênticas. Não foi fabricado novo token nem modificado conteúdo para tentar verificar outra propriedade.

Validação local Windows: clone isolado original reproduziu invalid path; índice corrigido foi materializado com core.protectNTFS=true; segundo clone/check-out completo corrigido passou, sem sparse checkout e sem arquivos pendentes. Nenhum reset/clean/exclusão de alterações do operador. O preparo do índice do fixture exigiu core.protectNTFS=false apenas para ler o nome inválido e retirá-lo do índice isolado; o checkout corrigido usou a proteção habilitada. A árvore remota base tem 335 blobs restantes após remoção do caminho inválido, sem outro nome incompatível identificado. As adições recentes da branch são verificadas novamente pela CI no checkout real atualizado.

Dois testes automatizados verificam nomes Windows, bytes do blob e rewrite legado/negativos/preservação das regras. Novo job Windows executa checkout completo do HEAD real do PR e esses testes. O job Linux existente continua cobrindo regressões e ledger; não foi feito deploy. Teste de regexp local não substitui comprovação HTTP do rewrite na plataforma. Após autorização posterior de Preview, verificar HTTP200, ausência de Location e bytes iguais na URL legada antes de integrar/deploy Production. Google ownership permanece UNKNOWN até ler os detalhes da propriedade autenticada; manter os demais métodos existentes intactos.

Rollback de código: reverter o commit somente em branch de revisão. Não voltar ao nome inválido em checkout Windows do operador. Nenhum rollback remoto de banco ou credencial é necessário. Main não foi modificada.

Referências: https://support.google.com/webmasters/answer/9008080?hl=en e https://vercel.com/docs/project-configuration/vercel-json .

O compilador oficial @vercel/routing-utils 6.6.1 foi instalado somente na área de teste e compilou todas as regras; as quatro formas da URL legada coincidiram. Evidência em docs/evidence/windows-checkout/routing-compiler.json. Não altera dependências do projeto.
