# WhatsApp symbol only on the public ES portal

Production app.yincorp.com.br runs fb0686a but redirects ES/SP to www.yincorp.com.br.
The www project is yincorp-landing, whose shared source pin predated PR #74 and
omitted the WhatsApp assets and their rewrites (both returned 404).

The revised hotfix preserves the public production availability CTA and form.
Architecture/editorial markup and both existing stylesheets remain identical to
source 6e15e2f. The form binding, submission and continuation are unchanged.
Only a separate circular WhatsApp symbol is added, with its own fixed positioning.
On mobile it sits above the existing bar without changing that bar.
Preview displays the symbol disabled for visual review, without events or navigation.

Shared source: mudeisp/ynteligencia branch hotfix/whatsapp-symbol-only.
The destination manifest pins its exact commit and integrity hashes.
No database changes, production promotion or merge is authorized.

Validation: 12 tests cover source integrity, original presentation hashes, SSR ES,
asset mappings, module dependency closure, form opening and independent WhatsApp
navigation in production mode. Preview publication supplies the real build check.
