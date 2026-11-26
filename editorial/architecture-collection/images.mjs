const commons = 'https://commons.wikimedia.org/wiki/File:';
const bySa = 'https://creativecommons.org/licenses/by-sa/4.0/';
export const images = [
  { id: 'park-2025', file: 'ibirapuera.webp', entity: 'ibirapuera', author: 'Prof Fer Pedreschi', source: commons + 'Ibirapuera_Park.jpg', license: 'CC0 1.0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', type: 'Fotografia de contexto urbano', width: 1680, height: 1260, alt: 'Paisagem do Parque Ibirapuera, em São Paulo', caption: 'Parque Ibirapuera, 2025. A paisagem pública que dá contexto ao endereço da edição.' },
  { id: 'park-oca', file: 'oca.webp', entity: 'ibirapuera', author: 'Reginafcg75', source: commons + 'OCA_-_Ibirapuera_SP.jpg', license: 'CC BY-SA 4.0', licenseUrl: bySa, type: 'Fotografia de patrimônio', width: 1440, height: 811, alt: 'Volume branco e circular da Oca, no Parque Ibirapuera', caption: 'Oca, 2023. A cúpula e a base circular marcam a presença isolada do pavilhão no parque.' },
  { id: 'park-marquise', file: 'marquise.webp', entity: 'ibirapuera', author: 'Fernando Stankuns', source: commons + 'Marquise_do_parque_do_ibirapuera.jpg', license: 'CC BY-SA 4.0', licenseUrl: bySa, type: 'Fotografia de patrimônio', width: 1440, height: 321, alt: 'Marquise que conecta pavilhões no Parque Ibirapuera', caption: 'Marquise, 2008. A cobertura contínua abriga percursos entre os pavilhões do conjunto.' },
];

export const candidates = [
  ...[
    ['fachada-capa', 'Embasamento · versão de abertura', 'ms9d3mlt-embasamento-arborea-ibirapuera.jpg'],
    ['fachada-frontal-web', 'Fachada frontal · enquadramento vertical', 'ms9d3ux7-fachada-frontal-arborea-ibirapuera-crop.webp'],
    ['fachada-frontal', 'Fachada frontal', 'ms9d1rii-fachada-frontal-arborea-ibirapuera.jpg'],
    ['fachada-lateral', 'Fachada lateral', 'ms9d1s59-fachada-lateral-arborea-ibirapuera.jpg'],
    ['embasamento', 'Embasamento · galeria', 'ms9d1sb3-embasamento-arborea-ibirapuera.jpg'],
    ['interior-01', 'Área comum · ambiente a identificar', 'mtdcs39d-2080-01-dec-ep-0001-img-pi3-r00-1-crop.webp'],
    ['living', 'Área comum · arquivo identificado como living', 'mtdcr8vp-05-living-benx-rep-libano-r02-1-crop.webp'],
  ].map(([id, caption, file]) => ({
    id, caption, entity: 'arborea-ibirapuera', author: null, type: 'Perspectiva institucional',
    source: 'https://benx.com.br/iconicos/arborea-ibirapuera',
    locator: file, license: null, status: 'Aguardando autorização expressa e confirmação dos créditos.',
  })),
  ...[
    ['arborea-itaim', 'itaim', 'Book do Itaim'], ['arborea-europa', 'hanazaki', 'Vistas de Blackhaus'],
    ['arborea-jardins', 'jardins', 'Galeria da Benx'], ['benx', 'portfolio', 'Portfólio histórico'],
    ['jacobsen', 'jacobsen', 'Retratos e seis cases'], ['gaf', 'casaGAF', 'Residência GAF'],
    ['casa-ca', 'casaCA', 'Casa CA'], ['luiz-orsini', 'bont', 'Retrato e Inhotim'],
    ['tania', 'spa', 'Retrato e portfólio'], ['arborea-ibirapuera', 'benx', 'Plantas e implantação a solicitar'],
  ].map(([entity, sourceId, caption]) => ({ id: entity + '-' + sourceId, entity, sourceId, caption, author: sourceId === 'hanazaki' ? 'Blackhaus' : null, license: null, status: 'Acervo de referência, pendente de curadoria individual e autorização.' })),
];
