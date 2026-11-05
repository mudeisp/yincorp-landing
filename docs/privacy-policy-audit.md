# Privacy page — evidence and release gate (2026-11-05)

Owner supplied controller: RAFAEL DE OLIVEIRA LUSTOSA ME, CNPJ 30.997.630/0001-43. Existing published contact verified in institutional markup and contact flow: WhatsApp +55 11 99297-6368. No unverified email, DPO identity or company address was added.

Sources reviewed: yincorp-landing main df040722543327bc9bea6cf240ec4e239283e607; pinned ynteligencia 32e8ae331eee82593fd4f90512c62c330b588a3f; rental presentation 4941afde85b7be02839178e38bb83ddf90ed841f; agent main 8a8ad0dd0f7c56b108587da0738bc376b95a02ae.

- Portal session stores visitor/session/attribution locally and submits events; institutional page also remembers contact fields in localStorage.
- Portal lead submission uses existing /api/portal/lead → app.yincorp.com.br/api/lead. Core lead handler supports Supabase, CRM and configured advertising/event integrations. Arizona requires explicit consent before confirmed lead persistence and WhatsApp continuation.
- Pinned analytics initializes Google Analytics and Meta Pixel. No global consent manager was identified. This change does not alter tracking, campaigns, Meta integration, consent behavior or WhatsApp numbers. The policy explicitly avoids claiming global opt-in/rejection controls or assuming that reading the policy equals consent. A policy page alone does not resolve any separate cookie-consent compliance work.
- Agent stores conversations/preferences/events in Supabase, has server-only credentials and redaction before model payloads. WhatsApp is capture-only; no automatic reply or complete PDF-to-AI workflow is represented as active. Model redaction is not full anonymization.
- Read-only database inspection confirmed RLS on core leads and on agent records; forced RLS/service-role-only boundary on multichannel capture was already verified. No promise of universal encryption, no incidents, Brazilian-only storage or automatic deletion deadline was made.
- No universal retention/deletion schedule was found. The policy uses purpose/legal-necessity criteria and an accessible manual privacy/deletion channel. It does not claim an automated erasure API or guaranteed deletion of records independently controlled by third parties.

Legal references consulted: LGPD consolidated text at the Chamber of Deputies; ANPD FAQ, cookie guidance and legitimate-interest guidance. Provider notices/DPA were checked for Vercel, Supabase and OpenAI. International processing is described without claiming unverified contracts or a complete list of processing countries.

Implementation: public static HTML and local CSS, no third-party scripts/fonts/analytics on the privacy page; canonical www URL; legacy .html and slash/index redirects; footer-only presentation decoration for portal/rental SSR, plus institutional/Arizona links. No inventory, lead transport or commercial tracking changed.

Release gate: Preview first. Owner explicitly requires confirmation before any merge/deploy to Production. Do not present the intended www URL as newly published until a post-approval Production readback proves HTTP 200, canonical and rendered content.
