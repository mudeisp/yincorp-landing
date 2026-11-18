# São Paulo: 20 authorized development pages

The catalog already contains the 20 supplier building IDs and 55 configurations >=70m². This release publishes one consolidated, clean URL per building using the existing shared Travertino render and contact integrations. No source rows, active flags or sync jobs are changed.

## Commercial accuracy

47 configurations in 18 projects are inactive. Their pages explicitly present reference configurations with unconfirmed commercial availability, never available sale stock. Prices for inactive rows and prices <R$1 are null in the public projection and presentation model. Gavia Moema and 312Jam have 8 active configurations in total. All source statuses currently read “Em construção”; the historic “Breve Lançamento” name does not override that source status. Source status remains visible.

## Live data and security

`public.portal_sp_launches` is a nonmaterialized, read-only projection over existing `properties`, limited to source novos, SP/São Paulo, the exact 20 IDs and area>=70. It contains explicit public presentation fields; no raw payload, supplier contacts, credentials or commercial attachments. Sync changes are read live, with the existing 60-second HTML cache. No copies of property records or new tables.

The view intentionally executes as `yincorp_launch_reader`, a NOLOGIN/NOSUPERUSER/NOBYPASSRLS role, which is neither the properties owner nor a member granted to API callers. The dedicated SELECT policy applies the same scope; the barrier view repeats the predicate. The role only has SELECT on required properties columns. Anonymous/authenticated callers only receive SELECT on the view. Existing properties RLS remains unchanged for anonymous users.

The Supabase generic `security_definer_view` advisor flags this view because its owner differs from the caller. This is an intentional narrow public projection, **not a privileged postgres-owned view**: RLS continues to apply to the view owner. The owner attributes, no base-table ownership, safe columns and inactive API isolation were checked. Existing advisor notices (11 tables without policies and one mutable search_path function) are outside this release.

## Routing and SEO

Exact allowlist in lib/sp-launches.json. Clean names are deterministic and unique. Old supplier project paths and old unit paths resolve to the consolidated page using HTTP 301, preserving attribution query parameters, only after destination data is found. Unknown projects retain their existing routing. All 20 clean URLs are added to the portal sitemap, and existing internal/sitemap links for the same IDs are rewritten. New discovery links are included in SP and São Paulo pages. One self-canonical indexable document per project; no parallel unit pages for this cohort. Missing inventory fails closed with 404; read failure returns 503/noindex.

The existing comparator accepts clean URLs and preserves exact old unit routing; inactive bases do not fabricate a priced comparison. Existing lead capture, WhatsApp, Resend endpoint, analytics and conversion IDs remain unchanged. No commercial campaign settings were modified.

## Validation before publication

- Exact reconciliation: 20 projects / 55 >=70m² configurations; 47 inactive / 8 active.
- 20/20 real-data renders: 200, correct canonical, Travertino shell, no symbolic prices.
- 131/131 unique referenced image URLs: HEAD 200.
- Full local suite: 153 passed, 0 failed. Six new cohort tests cover exact scope, old/new route mapping, inactive and symbolic price suppression, canonical comparison links, failures and redirects.
- Baseline main had five stale test failures: previous home copy, manifest assumptions for locally tracked assets, pre-Travertino hashes, and the build command before the footer step. Tests now check the current approved production assets without changing those assets.
- Standard production build commands succeeded. Materialized HTML/PDF build outputs are not committed.
- Evidence: docs/evidence/sp-launches/prepublish.json and media.json. Deployment/browser/production audit recorded after release.
