-- NOT APPLIED REMOTELY. Target: agente.yincorp / bgggafirdjvxihqselha only.
-- No public objects, commercial grants, Data API settings or existing roles changed.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- Refuse collisions rather than silently adopting an existing role/schema.
CREATE ROLE seo_engine_executor LOGIN NOINHERIT NOSUPERUSER NOCREATEDB
  NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 4;
-- No password here. Provision/rotate separately in the secret manager after approval.
CREATE SCHEMA seo_engine;
REVOKE ALL ON SCHEMA seo_engine FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA seo_engine TO seo_engine_executor;
ALTER DEFAULT PRIVILEGES IN SCHEMA seo_engine REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA seo_engine REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA seo_engine REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated, service_role;

-- A single small, encrypted aggregate is intentional for the two-article pilot:
-- locks cover the global budget, operation uniqueness and every checkpoint together.
-- All private content (including history/receipts/GSC) is AES-256-GCM ciphertext.
CREATE TABLE seo_engine.ledger (
  scope text PRIMARY KEY CHECK (scope = 'yincorp-seo/ipiranga-sp/praia-do-canto-es/v1'),
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
  ciphertext text NOT NULL CHECK (octet_length(ciphertext) BETWEEN 40 AND 16777216)
);
REVOKE ALL ON seo_engine.ledger FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT ON seo_engine.ledger TO seo_engine_executor;
GRANT UPDATE (ciphertext, revision) ON seo_engine.ledger TO seo_engine_executor;
ALTER TABLE seo_engine.ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_engine.ledger FORCE ROW LEVEL SECURITY;
CREATE POLICY seo_executor_read ON seo_engine.ledger FOR SELECT TO seo_engine_executor
  USING (scope = 'yincorp-seo/ipiranga-sp/praia-do-canto-es/v1');
CREATE POLICY seo_executor_insert ON seo_engine.ledger FOR INSERT TO seo_engine_executor
  WITH CHECK (scope = 'yincorp-seo/ipiranga-sp/praia-do-canto-es/v1');
CREATE POLICY seo_executor_update ON seo_engine.ledger FOR UPDATE TO seo_engine_executor
  USING (scope = 'yincorp-seo/ipiranga-sp/praia-do-canto-es/v1')
  WITH CHECK (scope = 'yincorp-seo/ipiranga-sp/praia-do-canto-es/v1');
COMMENT ON SCHEMA seo_engine IS 'Private SEO pilot; never add to PostgREST exposed schemas. No public RPC.';
COMMENT ON TABLE seo_engine.ledger IS 'Encrypted runs, budgets, calls, GSC, article versions, audits and chained checkpoints. Key lives outside PostgreSQL.';
COMMIT;
