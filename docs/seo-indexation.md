# SEO inventory expansion (SP and ES)

## Scope and release

Base: yincorp-landing main d643e19ff78be17290357f0799b6fd8969d36811,
the production www deployment verified on 2026-11-04. The apex domain already
redirects permanently (308) to www. app.yincorp.com.br is a separate project.
This is plain Node SSR on Vercel, not a Next.js app. No framework migration.

The shared presentation manifest remains pinned to the existing upstream
commit; no application, synchronization job, commercial table, ad campaign,
lead endpoint or lead-capture asset changes. New resale pages link to the
existing application for service. They display the reference but do not yet
deep-link to a selected item in the application or introduce a new lead form.

PR/preview only. No production merge, deployment promotion, DNS, access-control
change, sitemap submission or Google indexing request is authorized by this PR.

## Inventory and eligibility

Developments keep the reviewed portal_development_index and current routes.
The index intentionally excludes used listings that arrived through Orulo.
Do not use a raw source=novos count as the count of eligible developments.

New /sp/{city}/imovel/{title}--{database-uuid} routes use a read-only public
projection of properties from the existing Nonstop integration. Eligibility:

- active=true, source=usados, explicit VENDA operation, SP or ES;
- existing UUID, title, city, neighborhood, positive price/area, HTTPS image;
- substantive description (at least 200 normalized characters), without URLs,
  email or phone numbers, unique among eligible candidate descriptions;
- hubs /{state}/imoveis, /{state}/{city}/imoveis and
  /{state}/{city}/imoveis/{neighborhood} need at least 3 eligible listings.

These are conservative technical/editorial rules, not a guarantee of search
demand or indexation. No new query-filter landing pages are generated.
Unknown filter combinations are noindex. Paginated collections are crawlable
and self-canonical. Existing unit/typology routes remain noindex/canonical to
their project; they were not made indexable merely to increase counts.

No owner/contact/user/raw_data payload is loaded. Descriptions are escaped as
text; structured data is emitted through the shared safe JSON serializer.
Raw inventory is not stored in GitHub or artifacts. Listing reads are paginated,
bounded, cached for 60 seconds and coalesced. Incomplete/failed reads return 503
rather than silently publishing a partial or empty sitemap.

## Sitemaps

The /sitemap.xml rewrite generates a primary index containing the existing
sitemap-static.xml and /sitemap-seo/{state}/{type}-{page}.xml URL sets.
Types: lugares, empreendimentos, imoveis. Maximum 5,000 entries per child.
The old /sitemap-portal.xml remains a compatible URL set; indexes are not nested.
The physical sitemap.xml is removed because Vercel serves a matching static
file before the rewrite. Its public URL remains available through the dynamic
handler; sitemap-static.xml and all campaign pages stay unchanged.
New records/removals are reflected after inventory/CDN cache expiry.

Never use request time or a synchronization heartbeat as lastmod. Resale pages
use provider_updated_at only when supplied, parseable and not in the future.
Other timestamps are omitted when content-change provenance is unknown.
There is deliberately no lastmod for aggregate hubs or the current project
index: its updated_at is not verified as a meaningful content-change date.

## Audited snapshot, 2026-11-04

| Canonical URL category | Before | Candidate after |
| --- | ---: | ---: |
| State hubs (developments) | 2 | 2 |
| City hubs (developments) | 50 | 50 |
| Neighborhood hubs (developments) | 474 | 474 |
| Existing Vitória intent pages | 2 | 2 |
| Developments | 2,287 | 2,287 |
| Individual resale properties | 0 | 892 |
| Resale state hub | 0 | 1 |
| Resale city hubs | 0 | 4 |
| Resale neighborhood hubs | 0 | 85 |
| **Portal total** | **2,815** | **3,797** |

Delta: +982 (+34.88%), no canonical portal URLs removed in this snapshot.
Existing 5 static sitemap entries are additional and unchanged.
SP: 2,586 -> 3,568. ES: 229 -> 229 (including 171 developments).
The present resale source has no eligible ES sale rows: none fabricated.
Of 904 description-rich candidate rows, 4 lacked explicit sale operation and
8 belonged to repeated-description pairs. 892 passed all rules.
The remaining active used inventory does not automatically become SEO pages.
Numbers change as the live inventory changes; they are not Google counts.

## Verification and monitoring

Build: node scripts/prepare-portal.mjs (integrity-verified immutable upstream).
Tests: node --test integration.test.mjs intelligence.test.mjs
whatsapp-integration.test.mjs seo.test.mjs.
Syntax: node --check api/portal.js; node --check lib/seo-catalog.js;
node --check scripts/audit-seo.mjs. This repository has no TypeScript or configured
ESLint pipeline; do not report a nonexistent tsc/lint run as passed.

The workflow checks PR builds/tests. After merge, its daily read-only coverage
job samples 40 URLs stratified by market and kind, verifies HTTP, canonical,
noindex, title and H1 and retains JSON for 14 days. The sample is not a full
crawl and is not an indexation metric. Manual local use:

    node scripts/audit-seo.mjs --sample 40 --out seo-audit.json

Google discovered/crawled/indexed counts remain null unless authenticated GSC
data is provided. The uploaded Coverage export stops on 2026-10-22 and reports
3 indexed/9 not indexed without example URLs. It cannot describe the present
catalog. The connected analytics tool does not expose URL Inspection.

Before production: review preview SSR/headers, sitemap rewrites, actual public
projection permissions and query latency with current inventory. Confirm that
preview pages retain noindex and do not send commercial contacts. Reconcile
the current main branch if it changed. After authorized release, submit/check
the primary sitemap in GSC and inspect the priority URLs. Do not claim that
sitemap membership means a page was indexed.
