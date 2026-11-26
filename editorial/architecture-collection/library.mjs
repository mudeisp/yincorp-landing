export const consulted = '2026-11-26';

export const sources = {
  benx: ['Benx · Arbórea Ibirapuera', 'https://benx.com.br/iconicos/arborea-ibirapuera', 'Endereço, ficha, galeria, créditos e nota legal da SPE.'],
  incora: ['Incora Partners · Estratégia da coleção Arbórea', 'https://www.incorapartners.com/cases/arborea', 'Origem da série, prospecção do terreno e créditos atribuídos pela consultoria.'],
  origin: ['Benx · Origem e propósito', 'https://benx.com.br/origem-proposito', 'Perfil de Adalberto Bueno Netto e memória institucional.'],
  report: ['Benx · Relatório de sustentabilidade 2024', 'https://www.benx.com.br/_up/pdf/Relatorio_de_sustentabilidade_%202024.pdf', 'Linha do tempo, unidades de negócio, cases e prêmios.'],
  portfolio: ['Benx · Portfólio histórico', 'https://conteudo.benx.com.br/_pdf/Portfolio_Benx_Digital.pdf', 'Standard Building, Rio Branco 115, Berrini One, Parque Global e The Frame.'],
  itaim: ['Arbórea Itaim · Book original', 'https://ravicincorporadora.com.br/wp-content/uploads/2024/10/arborea_book.pdf', 'Ficha e autoria de arquitetura, interiores e paisagismo.'],
  europa: ['Benx · Arbórea Vista Jardim Europa', 'https://benx.com.br/iconicos/arborea-vista-jardim-europa', 'Endereço, créditos e material visual.'],
  hanazaki: ['Hanazaki · Vista Jardim Europa', 'https://www.hanazaki.com.br/projetos-works/aborea-vista-jardim-europa/', 'Créditos de arquitetura, incorporação e imagens de Blackhaus.'],
  jardins: ['Benx · Arbórea Jardins', 'https://benx.com.br/iconicos/arborea-jardins', 'Endereço e créditos.'],
  jacobsen: ['Jacobsen Arquitetura · Dossiê do escritório', 'https://jacobsenarquitetura.com/content/uploads/2023/06/presskit-jacobsenarquitetura-v2-1.pdf', 'Trajetória e portfólio selecionado.'],
  interview: ['Revista Projeto · Entrevista com a Jacobsen', 'https://revistaprojeto.com.br/acervo/jacobsen-arquitetura/', 'Entrevista e Casa MS.'],
  anm: ['ArchDaily · Residência ANM', 'https://www.archdaily.com/pt/930327/residencia-anm-jacobsen-arquitetura', 'Implantação e memorial da equipe.'],
  mar: ['Projeto Design · Museu de Arte do Rio', 'https://drive.prefeitura.sp.gov.br/cidade/secretarias/upload/infraestrutura/sp_obras/cultura_vidro.pdf', 'Crédito à Bernardes + Jacobsen e conexão entre edifícios.'],
  casaCA: ['Revista Projeto · Casa CA', 'https://api.aecweb.com.br/cls/catalogos/ns_brazil/revista_projeto_edicao431.pdf', 'Formação dos fundadores, histórico da sociedade e ficha da residência.'],
  casaGAF: ['ArchDaily · Residência GAF', 'https://www.archdaily.com.br/br/801627/residencia-gaf-jacobsen-arquitetura', 'Ficha do projeto e memorial fornecido pela equipe.'],
  orsini: ['Orsini Paisagismo · Escritório', 'https://orsinipaisagismo.com/', 'Identidade do escritório.'],
  bont: ['Casa Bontempo · Perfil de Luiz Carlos Orsini', 'https://www.casabontempo.com.br/parceiro/orsini/', 'Formação, datas e escopo de atuação em Inhotim segundo o perfil.'],
  spa: ['Spa Collection · Wellness Design', 'https://www.spacollection.com.br/wellness-design-1', 'Atuação de Tania Ginjas e escopo de consultoria.'],
  aeterna: ['Global Realty · Aeterna Paulista', 'https://globalrealtybrasil.com.br/aeterna-paulista/', 'Segundo case documentado de consultoria em wellness.'],
  park: ['Prefeitura de São Paulo · Parque Ibirapuera', 'https://www2.prefeitura.sp.gov.br/web/meio_ambiente/w/parques/regiao_sul/14062', 'Inauguração, autoria, equipamentos e contexto municipal.'],
  usp: ['Anais do Museu Paulista · Os pavilhões e a controvérsia', 'https://revistas.usp.br/anaismp/pt_BR/article/view/5523', 'Debates sobre a implantação do conjunto.'],
  burle: ['Anais do Museu Paulista · Burle Marx e o Ibirapuera', 'https://revistas.usp.br/anaismp/pt_BR/article/view/146195/0', 'Diferença entre as propostas de Burle Marx e o paisagismo executado.'],
  heritage: ['CONDEPHAAT · Resolução de tombamento', 'https://drive.prefeitura.sp.gov.br/cidade/upload/b6743_RES.%20SC%20N%2001%20-%20Parque%20Ibirapuera.pdf', 'Proteção estadual do parque.'],
  commons: ['Wikimedia Commons · Ibirapuera Park.jpg', 'https://commons.wikimedia.org/wiki/File:Ibirapuera_Park.jpg', 'Proveniência, autoria e licença CC0.'],
};

const entity = (id, kind, name, biography, sourceIds, { trajectory = [], portfolio = [], credits = [], images = [] } = {}) =>
  ({ id, kind, name, biography, trajectory, portfolio, sourceIds, credits, images });

export const entities = [
  entity('benx', 'incorporadora', 'Benx', 'Braço de incorporação do Grupo Bueno Netto, com sede em São Paulo.', ['origin', 'report'], { trajectory: ['1975 · origem do grupo', '2012 · reorganização empresarial'], portfolio: ['arborea-itaim', 'arborea-europa', 'arborea-jardins', 'arborea-ibirapuera', 'parque-global', 'berrini-one', 'the-frame', 'standard', 'rio-branco'] }),
  entity('adalberto', 'engenheiro', 'Adalberto Bueno Netto', 'Engenheiro civil formado na Poli-USP, mestre por Stanford e fundador do grupo.', ['origin', 'report']),
  entity('jacobsen', 'escritorio', 'Jacobsen Arquitetura', 'Escritório constituído em 2012 por Paulo e Bernardo Jacobsen, com atuação em arquitetura e interiores.', ['jacobsen', 'casaCA'], { portfolio: ['mar', 'anm', 'ms', 'nube', 'gaf', 'casa-ca', 'arborea-ibirapuera', 'arborea-europa'], credits: ['paulo', 'bernardo'] }),
  entity('paulo', 'arquiteto', 'Paulo Jacobsen', 'Arquiteto graduado pela Universidade Bennett em 1975.', ['casaCA', 'jacobsen']),
  entity('bernardo', 'arquiteto', 'Bernardo Jacobsen', 'Arquiteto graduado pela FAU/UFRJ em 2004.', ['casaCA', 'jacobsen']),
  entity('orsini', 'paisagismo', 'Orsini Paisagismo', 'Escritório de paisagismo identificado na ficha do Arbórea Ibirapuera.', ['orsini', 'benx', 'incora'], { portfolio: ['inhotim', 'arborea-itaim', 'arborea-ibirapuera'], credits: ['luiz-orsini'] }),
  entity('luiz-orsini', 'paisagista', 'Luiz Carlos Orsini', 'Paisagista mineiro com formação em Madri e atuação nos jardins de Inhotim.', ['bont', 'orsini'], { portfolio: ['inhotim'] }),
  entity('hanazaki', 'paisagista', 'Alex Hanazaki', 'Paisagista de dois endereços da coleção, Vista Jardim Europa e Jardins.', ['europa', 'hanazaki', 'jardins']),
  entity('gui', 'arquiteto', 'Gui Mattos', 'Assina arquitetura e interiores do Arbórea Jardins na ficha da Benx.', ['jardins']),
  entity('lissoni', 'escritorio', 'Lissoni', 'Escritório italiano creditado pelos interiores do Arbórea Itaim.', ['itaim', 'incora']),
  entity('slemenson', 'arquiteto', 'Pablo Slemenson', 'Assina a arquitetura do Arbórea Itaim.', ['itaim', 'incora']),
  entity('tania', 'designer', 'Tania Ginjas', 'Especialista em planejamento e design de espaços de wellness.', ['spa', 'aeterna', 'incora'], { portfolio: ['arborea-ibirapuera', 'arborea-jardins'] }),
  entity('arborea-ibirapuera', 'empreendimento', 'Arbórea Ibirapuera', 'Projeto residencial de uma torre em Moema, na esquina da Av. República do Líbano com a Alameda Jauaperi.', ['benx', 'incora'], { credits: ['jacobsen', 'orsini', 'tania'] }),
  entity('arborea-itaim', 'empreendimento', 'Arbórea Itaim', 'Primeiro endereço da marca, junto ao Parque do Povo.', ['itaim', 'incora'], { credits: ['slemenson', 'lissoni', 'orsini'] }),
  entity('arborea-europa', 'empreendimento', 'Arbórea Vista Jardim Europa', 'Projeto no Itaim Bibi na Rua Dr. Renato Paes de Barros.', ['europa', 'hanazaki'], { credits: ['jacobsen', 'hanazaki'] }),
  entity('arborea-jardins', 'empreendimento', 'Arbórea Jardins', 'Projeto no encontro da Rua José Maria Lisboa com a Rua Peixoto Gomide.', ['jardins', 'incora'], { credits: ['gui', 'hanazaki', 'tania'] }),
  entity('parque-global', 'projeto', 'Parque Global', 'Desenvolvimento de uso misto na Marginal Pinheiros, lançado em 2013.', ['report', 'portfolio'], { credits: ['master-2014'] }),
  entity('berrini-one', 'projeto', 'Berrini One', 'Edifício corporativo no eixo da Avenida Engenheiro Luís Carlos Berrini.', ['report', 'portfolio'], { credits: ['master-2015'] }),
  entity('the-frame', 'projeto', 'The Frame', 'Edifício residencial na Vila Nova Conceição, presente no portfólio Benx.', ['origin', 'portfolio']),
  entity('standard', 'projeto', 'Standard Building', 'Retrofit de edifício comercial no Rio de Janeiro.', ['report', 'portfolio'], { credits: ['master-2008'] }),
  entity('rio-branco', 'projeto', 'Rio Branco 115', 'Retrofit comercial no centro do Rio de Janeiro.', ['report', 'portfolio'], { credits: ['master-2011'] }),
  entity('mar', 'projeto', 'Museu de Arte do Rio', 'Equipamento cultural na Praça Mauá, inaugurado em 2013, com projeto de Bernardes + Jacobsen.', ['jacobsen', 'mar']),
  entity('anm', 'projeto', 'Residência ANM', 'Residência em Melbourne, de 2019 na seleção do escritório.', ['jacobsen']),
  entity('ms', 'projeto', 'Residência MS', 'Residência em São Paulo, de 2019 na seleção do escritório.', ['jacobsen']),
  entity('nube', 'projeto', 'Edifício Nube', 'Edifício em São Paulo, de 2021 na seleção do escritório.', ['jacobsen']),
  entity('gaf', 'projeto', 'Residência GAF', 'Projeto residencial documentado no ArchDaily.', ['casaGAF']),
  entity('casa-ca', 'projeto', 'Casa CA', 'Obra residencial publicada pela Revista Projeto.', ['casaCA']),
  entity('inhotim', 'projeto', 'Instituto Inhotim', 'Instituição de arte e jardim botânico em Brumadinho, Minas Gerais.', ['bont']),
  entity('ibirapuera', 'lugar', 'Parque Ibirapuera', 'Parque público inaugurado em São Paulo durante o IV Centenário, em 1954.', ['park', 'heritage', 'usp'], { images: ['park-2025', 'park-oca', 'park-marquise'] }),
  ...[[2008, 'Retrofit · Standard Building'], [2011, 'Comercial Retrofit · Rio Branco 115'], [2014, 'Soluções Urbanísticas · Parque Global'], [2015, 'Empreendimento Comercial · Berrini One']].map(([year, credit]) =>
    entity('master-' + year, 'premiacao', 'Master Imobiliário ' + year, credit, ['report'])),
];

export const editions = {
  'arborea-ibirapuera': { number: '001', preview: '/canva/arborea-ibirapuera/', hostname: 'arborea-ibirapuera.yincorp.com.br', commercialPath: '/sp/sao-paulo/empreendimento/arborea-ibirapuera', published: null, allowIndexing: false },
};
