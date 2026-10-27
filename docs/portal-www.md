# Plano de reutilização do portal no www.yincorp.com.br

Status: proposta implementável para validação em preview. Não autoriza merge, promoção, mudança de DNS ou alteração de produção.

## Decisão de arquitetura

| Componente | Responsabilidade |
| --- | --- |
| www.yincorp.com.br / projeto yincorp-landing | Portal público, páginas de estado/cidade/bairro/empreendimento, HTML indexável, canonical, breadcrumbs e sitemap |
| app.yincorp.com.br / projeto ynteligencia | Aplicação existente, APIs de leads e tracking, sincronização Órulo e fluxos atuais |
| Supabase yinteligencia | Único inventário e armazenamento existentes |
| Módulos do PR #48 | Única fonte versionada do agrupamento, rotas, renderização, filtros e leitura do catálogo |

Recomendação: usar os módulos de apresentação do PR #48 como uma dependência fixada por commit no build do yincorp-landing. O www recebe apenas um adaptador de renderização e transporte. Não copiar APIs de negócio nem criar outro banco, catálogo ou sincronização.

O build deve validar hashes dos arquivos compartilhados e falhar se não conseguir obter exatamente a versão aprovada. Não usar código remoto mutável em tempo de execução. O manifesto identifica commit e arquivos, permitindo atualização e rollback controlados.

## Reutilização sem duplicação

- Modelo, agrupamento, URLs, renderer, SEO e captura vêm dos arquivos compartilhados do PR #48.
- A leitura usa o inventário existente e a configuração pública de leitura já utilizada pelo app, sem criar credenciais privilegiadas ou mudar permissões.
- A captura do portal usa um caminho de transporte dedicado, /api/portal/lead, encaminhado à API atual do app. A /api/lead antiga do www permanece disponível para as campanhas existentes.
- O tracking do portal encaminha à API de anúncios existente no app. Visitante, sessão, atribuição e identificador de conversão seguem os contratos atuais.
- Não há nova integração com a Órulo ou cópia permanente do inventário.

## Endereços públicos

- www.yincorp.com.br/ → /es.
- www.yincorp.com.br/es.
- www.yincorp.com.br/es/{cidade}.
- www.yincorp.com.br/es/{cidade}/{bairro}.
- www.yincorp.com.br/es/{cidade}/empreendimento/{nome--id}.
- Configurações continuam com links próprios sob o empreendimento.

O canonical padrão será https://www.yincorp.com.br. A aplicação continua em app.yincorp.com.br. Links de busca antiga apontam explicitamente ao app, evitando que a nova home do www capture esses acessos.

Preservar as páginas de campanha atuais, suas imagens, a política de privacidade, os termos e as rotas varanda-botanic existentes. A página institucional original pode permanecer acessível em /institucional. O sitemap novo deve coexistir com o sitemap das campanhas e nunca apagar silenciosamente seus links.

## Etapas antes da publicação

1. Manter PR #48 em rascunho, sem merge.
2. Extrair os módulos compartilháveis, preservando o comportamento e os testes.
3. Preparar branch de integração do yincorp-landing, com build fixado por commit.
4. Criar exclusivamente um preview da Vercel do projeto yincorp-landing.
5. Conferir estado → cidade → bairro → empreendimento → tipologia → formulário; validar canonical www, sitemap, metadados, paginação e ausência de regressão nas campanhas.
6. Em preview: noindex e envios/conversões reais desativados.
7. Entregar o endereço para aprovação visual e funcional do usuário.
8. Somente após autorização posterior: revisar os commits finais e publicar o www. Não promover a aplicação junto por conveniência.

## Publicação e rollback futuros

A publicação aprovada deve apontar o www à versão validada do yincorp-landing, preservando o app e o banco. Não requer trocar DNS se o domínio continuar no projeto atual. Uma eventual atualização dos módulos compartilhados deve usar novo commit fixo e nova prévia.

Rollback: restaurar o deployment anterior do yincorp-landing ou o manifesto/configuração anterior, sem restaurar banco e sem interromper a sincronização Órulo. Os caminhos antigos de campanhas devem permanecer disponíveis durante a mudança.

## Limites a validar

A consulta real já confirmou 566 registros ativos e 172 empreendimentos em 10 cidades do ES. Registros podem representar tipologias. A leitura de estados maiores precisa de teste de carga antes de expansão.

A divergência histórica de leads e os timeouts da sincronização já documentados não são resolvidos por esta migração de apresentação. Nenhum contato real deve ser criado apenas para testar a prévia.


## V3 — apresentação SSR

O núcleo fixado agora incorpora ficha técnica, todas as fotos, plantas descritivas, configurações detalhadas, relacionados reais e editorial SSR de Vitória. A chamada experimental portal-project-data da V2 foi removida: nenhum novo endpoint comercial ou fonte de inventário é necessário. O cliente e CSS V2 saem do manifesto. Mais detalhes em portal-v3.md.
