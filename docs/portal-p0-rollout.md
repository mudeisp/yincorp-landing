# P0 do portal — Preview e reversão

Reutiliza o núcleo de mudeisp/ynteligencia PR #65, commit ad1df32647d0c3bd3b1787a3f7fa1ebdb6a5cb2e. Apenas o pin do núcleo e os hashes de portal/inventory.js e portal/router.js mudaram. Sem alteração em APIs, Ads, MIA, tracking, integração, schema ou índices.

SP usa resolução pontual por building_id e resumos de cidade para relacionados; ES mantém 1 GET de índice frio. Todos os estados ganham coalescência de leitura e reutilização de agrupamento por snapshot de 60s. Novos detalhes continuam frescos. A API, canonical www, SSR e rotas são preservados.

Benchmark local do mesmo snapshot: JSON SP frio 2.862.496 → 578.115 bytes (~80% menos). Requests frios isolados 4 → 5; três renders frios concorrentes 12 → 7; quente 1 → 1. Não interpretar tempo/CPU local como billing Vercel. HTML idêntico em cinco cenários; três projetos ES idênticos ao núcleo anterior em replay das respostas reais. Quatro projetos validados via GETs reais, sem gravar lead/evento.

## Rollback

- Configurar PORTAL_P0=0 no ambiente alvo e criar novo deployment. Restaura o leitor/resolvedor anteriores; não é chave instantânea para deployment existente.
- Ou reverter este commit para restaurar portal-source.json ao pin 9fd544c3243c6aff8b87e286e2426122184e7188 e seus hashes anteriores. Build verifica a integridade automaticamente.
- Validar Preview antes de qualquer produção. Não fazer merge/promoção sem autorização. Não usar force-push/reset no histórico compartilhado.
- Sem migration ou rollback de banco; índice properties_orulo_building_id_all_statuses_idx intacto.

Ver detalhes de testes e limites em docs/portal-p0-performance.md no núcleo. Produção não foi alterada nesta entrega.
