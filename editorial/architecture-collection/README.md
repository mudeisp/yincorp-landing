# Yincorp Architecture Collection · edição 001

A amostra está em `/canva/arborea-ibirapuera/`. A rota histórica `/canva` contém o acesso à edição e preserva suas ferramentas. O projeto hospedeiro usa HTML estático, scripts Node e funções Vercel. A edição usa geração estática em Node e uma camada interativa opcional, sem dependências de framework.

`library.mjs` centraliza fontes, entidades, créditos e configuração de edição. `images.mjs` registra o acervo licenciado e as referências em análise. Cada edição tem texto autoral independente do cadastro factual. O render atual seleciona a edição piloto. As classes e o módulo de interação são compartilháveis entre edições com o mesmo template. Os vínculos para outros Arbórea levam às fontes, enquanto suas publicações próprias não existem.

## Pesquisa e direitos

Consulta em 26/11/2026. A bibliografia HTML e `library.mjs` registram os documentos e as afirmações verificadas. Para imagens publicadas na prévia, `images.mjs` indica a autoria, fonte, licença, entidade retratada e legenda. As três fotos são do contexto urbano do Parque Ibirapuera. A capa usa a fotografia CC0 de Prof Fer Pedreschi. As fotos de Oca e Marquise são redistribuídas sob CC BY-SA 4.0, redimensionadas e recodificadas em WebP. A galeria oficial da Benx e as fichas dos outros projetos são referenciadas com links. A publicação dos ativos privados depende de autorização expressa do titular. A diferença de unidades entre Incora e Benx para Vista Jardim Europa foi registrada no texto e o número não foi adotado.

Créditos do piloto confirmados pela Benx: Jacobsen Arquitetura para arquitetura e interiores; Orsini Paisagismo para paisagismo; M.A.R Montevideu Desenvolvimento Imobiliário SPE Ltda. na nota de incorporação. A Incora especifica Yapó Orsini e identifica Tania Ginjas em wellness. Permanecem em apuração: autores individuais do Ibirapuera, equipe de iluminação, decoradora e existência de decorado físico, autoria dos renders, espécies, acabamentos, plantas, implantação e autorização para divulgação de preço. A ficha institucional informa que a comercialização depende do registro do memorial. O fim da página contém apenas contato geral da Yincorp.

## Matriz de implementação

| Tecnologia | Funcionalidade | Dependências | Ativos necessários | Mobile | Impacto | Fallback | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Node + HTML | Dez capítulos, navegação, bibliografia, dados estruturados | Node do projeto | Texto e fontes | Layout responsivo | HTML estático | Documento completo sem JS | Implementado |
| CSS scroll-driven + JS nativo | Cinema com camadas independentes, máscara de imagem, progresso | Suporte CSS e JS leve | Fotografia licenciada de contexto | Movimento adaptativo | Transform e clip-path; módulo local | Imagem estática e índice | Implementado |
| HTML + SVG | Explore, relações, filtro, perfis e referências | Navegador, JS opcional | Cadastro de entidades | Perfis em uma coluna | SVG pequeno | Perfis HTML e links | Implementado |
| HTML dialog | Galeria, ampliação e legenda | Dialog nativo | Fotos de contexto CC0 e CC BY-SA | Modal com Escape / botão | Imagens lazy | Link para arquivo | Implementado |
| Three.js, R3F e Drei | Visualização do edifício, exploded e hotspots | Suporte WebGL, engine por demanda | GLB ou geometria documental | A validar | A medir | Texto e ficha | Pendente |
| SVG ou WebGL | Morphing entre etapas verificadas | A definir | Sequência liberada de croquis, desenhos e vistas | A validar | A medir | Documentação vinculada | Pendente |
| Imagem em alta resolução + DOM | Plantas vivas, circulação e setorização | A definir | Plantas e coordenadas anotadas | A validar | A medir | Capítulo editorial | Pendente |
| Galeria técnica e visualização 360° | Materiais, acabamentos e interiores | A definir | Fotos, fichas e panoramas oficiais autorizados | A validar | A medir | Capítulos e galeria na fonte | Pendente |
| MapLibre GL | Gêmeo urbano com pontos e volumes verificados | Dados, estilo e tiles licenciados | Coordenadas, camadas e licenças | A validar | A medir | Capítulo urbano e fonte municipal | Pendente |
| Supabase/pgvector | RAG editorial com citações | Corpus revisado, embeddings e runtime | Direitos para processamento e trechos | A validar | A medir | Biblioteca e fontes navegáveis | Pendente |
| WebGPU/WebXR | Experiência espacial opcional | Suporte e caso de uso verificado | Acervo técnico | A validar | A medir | HTML, CSS e imagens | Pendente |
| Eventos GA4 | Capítulos, profundidade, tempo visível e contato | Instância GA4 autorizada | Nenhum | JS leve | Condicional, sem tag própria no piloto | Navegação normal | Instrumentação pronta; coleta desativada |

## Medição orgânica e publicação

- Aprovar editorial, arte, ficha técnica e ativos. Registrar licença por ativo. Validar política de uso de fontes antes de colocar documentos em um corpus RAG.
- Validar preview e produção em aparelhos reais e repetir auditoria de LCP, CLS e INP com dados de campo quando houver volume.
- Somente após aprovação, ligar o hostname final ao deploy, verificar HTTPS e definir rewrite limitado ao hostname. Gerar saída final com canonical autorreferente, OG correspondente e data real de estreia. Conservar o noindex da rota de teste. Submeter sitemap próprio e verificar cobertura.
- No Search Console, verificar a propriedade do subdomínio e comparar por página, consulta e modalidade Web/Imagem. Medir impressões, cliques, CTR e posição das duas URLs, e cruzar as consultas em janelas equivalentes. Avaliar o total de cliques pela soma do tráfego, mantendo a leitura separada de posição. Usar a URL comercial como série de referência, registrando mudanças sazonais e de SERP.
- Para engajamento, conectar a edição ao fluxo autorizado após revisão de consentimento, com o parâmetro editorial_edition. Registrar editorial_chapter e editorial_mode como dimensões se necessário. Os eventos usam nomes próprios e não dependem de conversões de anúncios.
