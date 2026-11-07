# Home Nacional V1

## Escopo

Base revisada: `mudeisp/yincorp-landing` main
`3c03c591e140c9036f3f0f93848a4ede21c62f12`, incluindo a correção de isolamento
dos sitemaps nacionais (#32) e a inclusão de `/alugar` (#33).
Branch: `feat/home-nacional-v1`. Entrega em PR Draft; sem merge ou produção.

A raiz passa a servir o `index.html` institucional nacional, sem consulta ao banco
e sem JavaScript para navegar nos estados, abrir o menu mobile ou ler as perguntas.
Oito links estaduais, compra, locação e aplicação reutilizam as rotas existentes.
O visual usa champagne, tipografia do sistema e uma imagem já publicada no catálogo.
Não há biblioteca, infraestrutura, formulário ou endpoint novo.

## Rotas e SEO

| URL | Antes | Proposto |
| --- | --- | --- |
| `/` | redirecionamento temporário para `/es` | HTML nacional 200; canonical `https://www.yincorp.com.br/` |
| `/institucional` | rewrite para o antigo index pessoal, com canonical da raiz | redirecionamento permanente 308 para `/` |
| `/institucional/` | sem regra explícita | 308 para `/` |
| `/institucional/index.html` | sem regra explícita | 308 para `/` |
| `/index.html` | HTML pessoal com canonical da raiz | 308 para `/` |
| oito estados | portal SSR | mesmas regras, módulos, canonical e elegibilidade |
| `/alugar` e subrotas | operação de locação | rewrite e implementação preservados |
| sitemaps dinâmicos | gerador existente | preservados; raiz acrescentada uma vez no sitemap estático |

Title/description nacionais, H1 único, Open Graph e JSON-LD Organization/WebSite
com nome e domínio verificados. Sem avaliações, endereço corporativo, número de
clientes, promessa de valorização, FAQPage, SearchAction fictícia ou promessa GEO.
O sitemap estático mantém locação, privacidade e campanhas; não inventa lastmod
para a nova raiz. Robots não muda. Os aliases não entram no sitemap.

## Conteúdo e operação comercial

Tuca Residencial (31196), Neo Estilo (69893) e Zoom Parque Ecológico (79447)
foram conferidos na auditoria SP somente leitura. Links e foto do Tuca são do
catálogo publicado; a home não copia preços, estoque ou promessa de disponibilidade.
Links editoriais são pontos de entrada, não seleção automatizada de ofertas.

A antiga interface pessoal/WhatsApp de `index.html` é substituída pela navegação
institucional solicitada. O contato na home leva à aplicação existente; não há
POST direto, formulário novo, mensagem real ou alteração no contrato de lead.
Os formulários e scripts das páginas de imóveis/campanhas e os rewrites comerciais
permanecem intactos. Os três snippets originais de configuração de GA4/Ads/Pixel
foram mantidos byte a byte; a nova home não adiciona evento de conversão.
Nenhuma campanha, credencial, agente, Órulo, Nonstop ou Supabase é modificado.

## Verificação

Build: `node scripts/prepare-portal.mjs`, com integridade dos módulos fixados.
Testes: a suíte do workflow `SEO inventory and route checks`, acrescida de
`home-national.test.mjs` e do teste já existente de isolamento do sitemap.
68 testes passaram localmente. As duas expectativas antigas de redirecionamento
da raiz/ausência da raiz no sitemap foram atualizadas para o novo contrato.

Os testes da home cobrem conteúdo SSR, schema mínimo, H1/canonical, oito links,
menu nativo, âncoras acessíveis, aliases sem loop, raiz 200 em adaptador HTTP local,
sitemap, preservação de endpoints, ausência de credenciais e produção/preview
das oito rotas estaduais com dados sintéticos. Testes locais não substituem a
confirmação HTTP dos rewrites no Preview. O Preview continua sujeito à proteção
e à política de noindex da Vercel, sem alteração dessas configurações.

A primeira tentativa de Chrome headless ficou indisponível; a verificação visual
foi concluída pela alternativa suportada do navegador integrado. Viewports 1440x1000,
390x844 e 320x780: sem overflow horizontal, imagem carregada e oito links estaduais.
Menu mobile e FAQ abriram pelo teclado (Enter). Capturas locais de desktop, mobile,
menu aberto e mobile estreito foram guardadas como evidência da entrega. Apenas
na resposta do servidor de teste local os snippets de tracking foram removidos,
para não emitir eventos sintéticos; os arquivos do PR os preservam.

No Preview automático do commit funcional `eebf7e1bfdf9aa706dd386357955de75500e4077`,
`/`, os oito estados, `/alugar`, `/sitemap.xml`, `/robots.txt` e `/sitemap-static.xml`
responderam 200. Canonicals mantiveram o domínio www correto. A raiz tem noindex
no cabeçalho automático da Vercel; o portal e a locação também preservam noindex
no Preview. O sitemap estático contém a raiz. `/institucional` e `/index.html`
resolveram para o HTML nacional; a ferramenta autenticada segue redirects internos
e, por isso, informa o 200 final, não uma captura direta do primeiro 308.
O 308 é conferido na configuração e no teste HTTP local. A produção continuou
respondendo 307 para `/es`, sem promoção desta branch.

## Riscos e rollback

- Links editoriais e imagem dependem de recursos publicados existentes; revisar
  periodicamente se uma página deixar de ser elegível. Não afeta o inventário.
- O 308 dos aliases é cacheável: revisar os destinos antes de eventual merge.
- A raiz passa a receber visitas antes direcionadas a ES. `/es` mantém seu próprio
  endereço e está destacado no seletor. Mudança de tráfego não é ganho de ranking.
- Os snippets de medição existentes passam a acompanhar a home nacional; não
  há nova destinação de conversão. Testes de navegador locais não executam esses
  snippets para evitar eventos sintéticos nas plataformas de anúncios.
- `robots.txt`, APIs, módulos compartilhados e regras comerciais ficam fora do diff.
- O repositório contém um nome de arquivo histórico incompatível com Windows em
  `100leads`; não foi renomeado ou incluído no diff. A entrega usa a árvore remota
  atual como base para preservar todos os arquivos, inclusive esse caminho.

Rollback futuro: reverter o commit deste PR em uma mudança revisada ou restaurar
o último deployment estável pelo mecanismo da Vercel, caso uma publicação seja
autorizada depois. Isso restaura o index anterior, o redirecionamento `/` → `/es`
e o sitemap anterior. Não requer migration nem reversão de dados. Nenhum rollback,
merge, DNS ou deploy de produção é executado nesta entrega.
