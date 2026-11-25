import { visualRelease } from './visual-engine.js';
import { html as escapeHtml } from '../.portal-shared/model.js';

import { projectMaterials } from './project-materials.js';

import { commercialPdfs, oruloCommercialPdfs } from './commercial-pdfs.js';

import { oruloEditorial } from './orulo-editorial-data.js';
import { legacyStory, oruloStory, renderCommercialStory } from './orulo-editorial.js';

const presentations = new Map([
  ['/sp/sao-paulo/empreendimento/o-parque-cipo--orulo-47763', {
    key: 'o-parque-cipo',
    title: 'O Parque Cipó',
    developer: 'Gamaro',
    description: 'Apartamentos de 104,60 m² com três suítes, terraço, lavabo e duas vagas. O book apresenta piscina de borda infinita, espaço gourmet e áreas de fitness.',
    figures: [
      ['fachada', 'Perspectiva da torre', 17],
      ['piscina', 'Piscina de borda infinita', 8],
      ['parque', 'Perspectiva aérea do parque', 3],
      ['planta', 'Planta ilustrativa de três suítes', 16]
    ]
  }],
  ['/es/linhares/empreendimento/haus-linhares--orulo-82830', {
    key: 'haus-linhares',
    title: 'Haus Linhares',
    developer: 'Oktō',
    description: 'Studios e apartamentos de um quarto em Linhares. Veja as perspectivas do book, as plantas e as condições históricas dos apartamentos e das vagas avulsas.',
    figures: [
      ['fachada', 'Perspectiva da fachada', 3],
      ['piscina', 'Piscina', 7],
      ['area-comum', 'Perspectiva de área comum', 9],
      ['plantas-22', 'Plantas ilustrativas', 22],
      ['plantas-23', 'Plantas ilustrativas', 23],
      ['plantas-24', 'Plantas ilustrativas', 24],
      ['plantas-25', 'Planta ilustrativa', 25]
    ]
  }],
  ['/sp/sao-paulo/empreendimento/ledge-brooklin-residencial--orulo-41331', {
    key: 'ledge-brooklin',
    title: 'Ledge Brooklin — Residencial',
    developer: 'Exto',
    description: 'Apartamentos residenciais no Brooklin Paulista, com áreas privativas de 70,05 a 352,45 m² na tabela histórica. As plantas estão na seção de configurações desta página.',
    figures: [
      ['entrada', 'Perspectiva do acesso', 3],
      ['piscina', 'Piscina descoberta', 5],
      ['piscina-coberta', 'Piscina coberta', 6],
      ['jardim', 'Perspectiva do jardim', 13]
    ]
  }],
  ['/sp/sao-paulo/empreendimento/o-parque-folhagem--orulo-47922', {
    key: 'o-parque-folhagem',
    title: 'O Parque — Torre Folhagem',
    developer: 'Gamaro',
    description: 'Apartamentos de quatro dormitórios e três vagas no Brooklin Paulista. O material comercial apresenta as duas tipologias e as áreas de lazer do empreendimento.',
    figures: [
      ['torre', 'Perspectiva das torres', 6],
      ['piscina', 'Perspectiva da piscina', 13],
      ['planta-167', 'Planta ilustrativa da primeira tipologia', 27],
      ['planta-197', 'Planta ilustrativa da segunda tipologia', 28]
    ]
  }],
  ['/sp/sao-paulo/empreendimento/atelie-365--orulo-36675', {
    key: 'atelie-365', title: 'Ateliê 365', developer: 'MAC',
    description: 'Residencial na Rua Nova York, no Brooklin Paulista. A tipologia de 194,06 m² tem planta padrão de quatro suítes e três vagas vinculadas.',
    figures: [['fachada', 'Perspectiva da fachada', 12], ['piscina', 'Perspectiva da piscina', 20], ['living', 'Living da tipologia', 39], ['planta', 'Planta padrão de quatro suítes', 41]]
  }],
  ['/pr/curitiba/empreendimento/ambar--orulo-78968', {
    key: 'ambar', title: 'Âmbar', developer: 'RPLK',
    description: 'Studios, gardens e apartamentos de um quarto na Rua Palmeiras, em Água Verde, Curitiba.',
    figures: [['fachada', 'Perspectiva da fachada', 4], ['terraco', 'Perspectiva do terraço', 12], ['planta-1', 'Plantas ilustrativas', 14], ['planta-2', 'Plantas ilustrativas', 15], ['planta-3', 'Planta ilustrativa', 18]]
  }],
  ['/sp/sao-paulo/empreendimento/nex-one-jurupis-residencial--orulo-46734', {
    key: 'nex-one-jurupis', title: 'Nex One Jurupis — Residencial', developer: 'One Innovation',
    description: 'Studios e apartamentos na região de Moema, com áreas de lazer compartilhadas entre as duas torres.',
    figures: [['fachada', 'Perspectiva do acesso', 11], ['piscina', 'Perspectiva da piscina', 21], ['planta-1', 'Planta ilustrativa', 23], ['planta-2', 'Planta ilustrativa', 27], ['planta-3', 'Planta ilustrativa', 31]]
  }],
  ['/pr/curitiba/empreendimento/existence-332--orulo-86946', {
    key: 'existence-332', title: 'Existence 332', developer: 'Fundari e Fundamental',
    description: 'Studios, gardens e apartamentos em Água Verde, Curitiba, com lazer na cobertura.',
    figures: [['fachada', 'Perspectiva da fachada', 3], ['terraco', 'Lazer na cobertura', 24], ['planta-garden', 'Plantas ilustrativas', 30], ['planta-studio', 'Planta ilustrativa', 38], ['planta-sacada', 'Plantas ilustrativas', 42]]
  }],
  ['/es/vitoria/empreendimento/macan-residence--orulo-71521', {
    key: 'macan-residence', title: 'Macan Residence', developer: 'Argo',
    description: 'Apartamentos de dois quartos e unidades garden no Jardim Camburi, em Vitória. A tabela histórica documenta os preços à vista.',
    figures: [['fachada', 'Perspectiva da fachada', 59], ['lazer', 'Perspectiva de área comum', 14], ['planta-tipo', 'Planta ilustrativa', 25], ['planta-garden', 'Planta ilustrativa', 42]]
  }],
  ['/sp/sao-paulo/empreendimento/skyline--orulo-72365', {
    key: 'skyline-brooklin', title: 'Skyline Brooklin', developer: 'Exkalla',
    description: 'Residencial no Brooklin com apartamentos de três suítes, elevador privativo e lazer no rooftop.',
    figures: [['fachada', 'Perspectiva da fachada', 3], ['piscina', 'Perspectiva da piscina', 26], ['living', 'Perspectiva do living', 9], ['planta', 'Planta ilustrativa', 8]]
  }],
  ['/pe/olinda/empreendimento/vivar-atlantico--orulo-82991', {
    key: 'vivar-atlantico', title: 'Vivar Atlântico', developer: 'A. B. Côrte Real',
    description: 'Apartamentos em Jardim Atlântico, Olinda, com lazer e plantas de dois quartos.',
    figures: [['fachada', 'Perspectiva da fachada', 6], ['piscina', 'Perspectiva da piscina', 13], ['planta-1', 'Planta ilustrativa', 28], ['planta-2', 'Planta ilustrativa', 30]]
  }],
  ['/sp/sao-paulo/empreendimento/infinity-brooklin--orulo-48387', {
    key: 'infinity-brooklin', title: 'Infinity Brooklin', developer: 'Teixeira Duarte',
    description: 'Residencial com duas torres, East e West, no Brooklin. Consulte os preços históricos por torre, andar e final.',
    figures: [['torres', 'Perspectiva das torres', 17], ['lazer', 'Perspectiva de área comum', 43], ['planta-1', 'Planta ilustrativa', 56], ['planta-2', 'Planta ilustrativa', 58], ['planta-3', 'Planta ilustrativa', 61]]
  }],
  ['/sp/sao-paulo/empreendimento/mac-brooklin--orulo-65643', {
    key: 'mac-brooklin', title: 'MAC Brooklin', developer: 'MAC',
    description: 'Residencial na Rua Georgia, no Brooklin. Consulte as referências da tabela por andar ou faixa de andares e final.',
    figures: [['fachada', 'Perspectiva da fachada', 10], ['piscina', 'Perspectiva da piscina', 31], ['planta-1', 'Planta ilustrativa', 42], ['planta-2', 'Planta ilustrativa', 46]]
  }],
  ['/pe/olinda/empreendimento/fonte-casa-caiada--orulo-83506', {
    key: 'fonte-casa-caiada', title: 'Fonte Casa Caiada', developer: 'Trio e Oliva',
    description: 'Residencial em Casa Caiada, Olinda. Veja as plantas e o preço histórico por unidade, com as referências de financiamento indicadas na tabela.',
    figures: [['fachada', 'Perspectiva da fachada', 3], ['living', 'Perspectiva do living', 8], ['planta-1', 'Plantas ilustrativas', 11], ['planta-2', 'Plantas ilustrativas', 12]]
  }],
  ['/sp/sao-paulo/empreendimento/haute-brooklin-by-ez--orulo-29349', {
    key: 'haute-brooklin', title: 'Haute Brooklin by EZ', developer: 'EZTEC',
    description: 'Residencial no Brooklin com apartamentos de hall privativo e piscina coberta de 25 metros.',
    figures: [['fachada', 'Perspectiva da fachada', 14], ['piscina', 'Perspectiva da piscina coberta', 25], ['planta-1', 'Planta ilustrativa', 47], ['planta-2', 'Planta ilustrativa', 50]]
  }],
  ['/es/vila-velha/empreendimento/ita-living--orulo-83158', {
    key: 'ita-living', title: 'ITA Living', developer: 'Javé',
    description: 'Studios, apartamentos de dois quartos e gardens na Praia de Itaparica, em Vila Velha.',
    figures: [['fachada', 'Perspectiva da fachada', 6], ['piscina', 'Perspectiva da piscina', 17], ['planta-garden', 'Plantas ilustrativas', 44], ['planta-2-quartos', 'Plantas ilustrativas', 49], ['planta-studio', 'Plantas ilustrativas', 55]]
  }],
  ['/pr/curitiba/empreendimento/ace-agua-verde--orulo-86571', {
    key: 'ace-agua-verde', title: 'ACE Água Verde', developer: 'Winner',
    description: 'Residencial em Água Verde, Curitiba, com opções garden e plantas com pé-direito simples ou estendido.',
    figures: [['fachada', 'Perspectiva da fachada', 2], ['lazer', 'Perspectivas de áreas comuns', 9], ['planta-1', 'Configuração ilustrativa', 12], ['planta-2', 'Configuração ilustrativa', 14], ['planta-3', 'Configuração ilustrativa', 16]]
  }],
  ['/es/vitoria/empreendimento/fit-370--orulo-72212', {
    key: 'fit-370', title: 'FIT@370', developer: 'Mocelin Engenharia',
    description: 'Studios, apartamentos de um quarto e gardens na Praia do Canto, em Vitória.',
    figures: [['fachada', 'Perspectiva da fachada', 83], ['piscina', 'Perspectiva da piscina', 11], ['planta-1', 'Planta ilustrativa', 35], ['planta-2', 'Planta ilustrativa', 45], ['planta-3', 'Planta ilustrativa', 60]]
  }],
  ['/es/vila-velha/empreendimento/monte-athos-fase-2--orulo-80589', {
    key: 'monte-athos-fase-2', title: 'Monte Athos — Fase 2', developer: 'EBS Engenharia',
    description: 'Apartamentos de dois quartos na Torre B, em Vila Velha, com plantas e perspectivas do material da incorporadora.',
    figures: [['fachada', 'Perspectiva da fachada', 5], ['lazer', 'Perspectiva de área comum', 18], ['planta-1', 'Plantas ilustrativas', 12], ['planta-2', 'Plantas ilustrativas', 13], ['planta-3', 'Plantas ilustrativas', 14]]
  }],
  ['/es/vitoria/empreendimento/gs-stay-mata-da-praia--orulo-84182', {
    key: 'gs-stay-mata-da-praia', title: 'GS Stay Mata da Praia', developer: 'GS Construtora',
    description: 'Studios e apartamentos de quarto e sala na Mata da Praia, em Vitória. As plantas não foram disponibilizadas no material consultado. Solicite a configuração à Yincorp.',
    figures: [['fachada', 'Perspectiva da fachada', 'Ficha Órulo, p. 1'], ['acesso', 'Perspectiva do acesso', 'Ficha Órulo, p. 1']]
  }]
]);

export function enrichCommercialPresentation(body, path) {
  const project = presentations.get(path) ?? projectMaterials[path];
  const pdf = commercialPdfs[path];
  const oruloId = /--orulo-(\d+)$/.exec(path)?.[1];
  const orulo = oruloId ? oruloCommercialPdfs[oruloId] : null;
  if ((!project && !pdf && !orulo) || typeof body !== 'string' || !body.startsWith('<!doctype html>')) return body;

  const main = /<main\b[^>]*>/i.exec(body);
  if (!main || !body.includes('</body>')) return body;

  const book = orulo?.book ?? project?.book;
  const table = orulo?.table ?? project?.table ?? (pdf?.unitsUrl ? pdf.url : undefined);
  const reference = orulo?.reference ?? project?.reference ?? pdf?.reference;
  const documents = [
    { url: book, title: project?.bookLabel === 'Ver galeria oficial' && !orulo?.book ? project.bookLabel : 'Book do empreendimento' },
    { url: project?.latestTable, title: 'Tabela comercial mais recente', reference: project?.latestTableReference },
    { url: table, title: project?.latestTable ? 'Tabela usada na consulta histórica' : 'Tabela comercial', reference },
    { url: !project && !orulo && !pdf?.unitsUrl ? pdf?.url : null, title: pdf?.label }
  ].filter(({ url }) => url).map(({ url, title, reference }) => {
    const isPdf = /\.pdf(?:[?#]|$)/i.test(url);
    const canPreview = isPdf && url.startsWith('/') && !url.startsWith('//');
    const href = escapeHtml(url);
    const label = escapeHtml(title);
    return `<li class="commercial-document">
      <h3>${label}</h3>
      ${reference ? `<p class="commercial-document-date">Referência de ${escapeHtml(reference)}</p>` : ''}
      ${canPreview ? `<details class="commercial-document-preview">
        <summary>Visualizar PDF na página</summary>
        <iframe src="${href}" title="${label}" loading="lazy"></iframe>
      </details>` : ''}
      <a href="${href}" target="_blank" rel="noopener">${isPdf ? 'Abrir PDF original' : 'Abrir material'} <span aria-hidden="true">↗</span><span class="commercial-document-context"> · ${label}</span></a>
    </li>`;
  }).join('');
  const resources = documents ? `<ul class="commercial-documents">${documents}</ul>` : '';

  const editorial = oruloEditorial[oruloId];
  const story = editorial && orulo
    ? oruloStory(editorial, oruloId, orulo)
    : legacyStory(project, { title: project?.title ?? orulo?.title ?? pdf?.title ?? 'Empreendimento', table, reference });
  const afterMain = main.index + main[0].length;
  const availability = /<section\b[^>]*\bid="disponibilidade"/i.exec(body);
  const hero = /<section\b[^>]*class="(?:hero yi-property-hero|art-cover\s|art-cover")/i.exec(body.slice(afterMain));
  const heroEnd = hero ? body.indexOf('</section>', afterMain + hero.index) : -1;
  const insertion = heroEnd >= 0 ? heroEnd + '</section>'.length : afterMain;
  const release = book && table && visualRelease(oruloId);
  const master = Boolean(release);
  const section = renderCommercialStory({
    ...story,
    ...(release ? { galleries: {
      arquitetura: release.assets.filter(asset => ['lobby','site'].includes(asset.category)),
      lazer: release.assets.filter(asset => asset.category === 'leisure'),
      plantas: release.assets.filter(asset => ['maquette','blueprint','editorial','xray'].includes(asset.category))
    }, unitsUrl: release.commercial.unitsUrl, table: null } : {}),
    resources: release ? '' : resources, contactUrl: availability ? '#disponibilidade' : null,
    ...(!release && pdf?.unitsUrl ? {
      unitsUrl: pdf.unitsUrl,
      catalogNavigation: [['arquitetura', 'Arquitetura'], ['diferenciais', 'Lazer e áreas comuns'], ['plantas', 'Plantas']]
        .filter(([id]) => body.includes('id="' + id + '"'))
    } : {})
  });
  const assets = '<link rel="stylesheet" href="/commercial/presentation.css"><script type="module" src="/commercial/presentation.mjs"></script>';
  const before = heroEnd < 0 ? body.slice(0, insertion) : body.slice(0, afterMain + hero.index)
    + body.slice(afterMain + hero.index, insertion).replace('href="#sobre"', 'href="#apresentacao-comercial"');
  const presentation = master
    ? section.replace('data-commercial-editorial>', 'data-commercial-editorial data-lp-master>')
    : section;
  const cover = release?.assets.find(asset => asset.category === 'facade')?.asset;
  const output = before + presentation + body.slice(insertion).replace('</body>', assets + '</body>');
  if (!master || !cover || !/^\/(?!\/)[\w/.-]+\.webp$/.test(cover)) return output;
  return output.replace(/<figure\b[^>]*\bdata-yi-hero-photo[^>]*>[\s\S]*?<\/figure>/, figure =>
    figure.replace('data-yi-hero-photo', 'data-yi-hero-photo data-lp-master-cover')
      .replace(/(<img\b[^>]*\bsrc=")[^"]+"/, (_, start) => start + escapeHtml(cover) + '"'));

}
