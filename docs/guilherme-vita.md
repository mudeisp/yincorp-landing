# Guilherme.vita

Comparativo consultivo em `/guilherme.vita`, com alias `/guilherme-vita`. Usa a hospedagem estática, a folha-base do Mandarim e o WhatsApp compartilhado do portal. As rotas de Arizona e Lucas Schoch permanecem intactas.

## Referências comerciais

- Arizona 1002: 94 unidades do JSON existente, cuja tabela de agosto/2026 é idêntica ao PDF fornecido (SHA-256 conferido).
- Haus Mitre Edition NY: 16 faixas de andares/finais da Torre Brooklyn, páginas 8–9 da tabela de outubro/2026. As faixas não foram expandidas em estoque individual. Studios Soho e lojas estão no PDF completo, fora da comparação residencial. O book também apresenta 217 m² na Torre Manhattan; não atribuir a essa planta o preço de 164 m² da Brooklyn.
- Brooklin Senses: 37 unidades residenciais das páginas 5–7 da tabela de outubro/2026. O studio da página 8 não integra a comparação residencial. Endereço e duas vagas conferidos na página 2. Áreas especiais de 167 e 186 m² no 5º andar são mantidas.
- Mandarim: 30 unidades do JSON existente, com tabela fornecida idêntica à original no repositório (SHA-256 conferido).

Os oito PDFs estão acessíveis pela página; três reutilizam caminhos existentes. Os cinco novos documentos ficam em `guilherme.vita/pdfs/`. `sources.json` registra os hashes dos oito anexos. Plantas e imagens de Haus/Brooklin são renderizações dos respectivos books. As fachadas foram extraídas da região direita das páginas 8 e 14 para evitar mostrar a imagem de Nova York e a página de abertura como se fossem as fachadas. As plantas completas mantêm legendas e ressalvas.

## Comportamento

Seleções são preservadas nos parâmetros `arizona`, `haus`, `brooklin`, `mandarim`. Identificadores desconhecidos voltam à primeira referência, sem criar unidades. Valores nominais não recebem atualização por índices. A soma de parcelas retém arredondamentos dos PDFs. Principal e coluna alternativa de financiamento não são somados.

O WhatsApp usa o número do módulo compartilhado, com as quatro escolhas e o link. Nenhuma mensagem é enviada automaticamente. Em localhost, WhatsApp e tracking ficam desativados. A página leva `noindex,nofollow` e não é adicionada ao sitemap por ser uma apresentação nominal; isso não impõe autenticação nem torna os PDFs privados.

## Validação

`node --test guilherme.vita/model.test.mjs arizona-1002/model.test.mjs mandarim-the-legend/model.test.mjs`

15 testes passaram: fluxo financeiro, preservação de área/depósito, faixas, links de seleção e regressões das duas páginas existentes. Todos os 42 caminhos de imagens/documentos foram conferidos. Prévia verificada no navegador em computador e em viewport de 390 px, seleção de Brooklin 26º/final 1 e ampliação de planta. Não foi enviado contato de teste.
