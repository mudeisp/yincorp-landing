-- Public editorial projection; no supplier contacts, raw payloads or mutations.
-- The NOLOGIN view owner is NOT a table owner and cannot bypass RLS.
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='yincorp_launch_reader') THEN
 CREATE ROLE yincorp_launch_reader NOLOGIN NOSUPERUSER NOBYPASSRLS;
 END IF;
END $$;
GRANT yincorp_launch_reader TO postgres;
GRANT USAGE ON SCHEMA public TO yincorp_launch_reader;
GRANT SELECT (id, external_id, source, title, development_name, neighborhood, city, state, area, bedrooms, bathrooms, parking_spaces, image_url, active, updated_at, price, raw_data) ON public.properties TO yincorp_launch_reader;
CREATE POLICY curated_sp_launches_reader ON public.properties FOR SELECT TO yincorp_launch_reader USING (source='novos' AND state='SP' AND city='São Paulo' AND area>=70 AND split_part(external_id,':',2) IN ('81314','76834','73236','84383','83881','85410','81349','82627','82455','83064','82951','83922','86368','84351','86977','73235','84352','76800','86470','74829'));
CREATE VIEW public.portal_sp_launches WITH (security_barrier=true) AS
 SELECT id, external_id, source, title, development_name, neighborhood, city, state, area, bedrooms, bathrooms, parking_spaces, image_url, active, updated_at, CASE WHEN active AND price>=1 THEN price END AS price, raw_data->>'building_id' AS building_id, raw_data->'images' AS images, raw_data->'building'->>'developer' AS developer, raw_data->'building'->>'status' AS status, raw_data->'building'->>'description' AS description, raw_data->'building'->'address' AS address, raw_data->'building'->'features' AS features, raw_data->'building'->'building_features' AS building_features, raw_data->'building'->'unit_features' AS unit_features, raw_data->'building'->'floor_plans' AS floor_plans, raw_data->'building'->'finality' AS finality, raw_data->'building'->'stage' AS stage, raw_data->'building'->'total_units' AS total_units, raw_data->'building'->'number_of_floors' AS number_of_floors, raw_data->'building'->'number_of_towers' AS number_of_towers, raw_data->'building'->'apts_per_floor' AS apts_per_floor, raw_data->'building'->'launch_date' AS launch_date, raw_data->'building'->'opening_date' AS opening_date, raw_data->'building'->'images' AS building_images, raw_data->'building'->'type' AS building_type, raw_data->'building'->'videos' AS videos, raw_data->'building'->'virtual_tour' AS virtual_tour, raw_data->'typology'->'type' AS typology_type, raw_data->'typology'->'reference' AS typology_reference, raw_data->'typology'->'features' AS typology_features, raw_data->'typology'->'parking' AS typology_parking, raw_data->'typology'->'suites' AS suites, raw_data->'typology'->'bathrooms' AS typology_bathrooms, raw_data->'typology'->'private_area' AS private_area FROM public.properties WHERE source='novos' AND state='SP' AND city='São Paulo' AND area>=70 AND split_part(external_id,':',2) IN ('81314','76834','73236','84383','83881','85410','81349','82627','82455','83064','82951','83922','86368','84351','86977','73235','84352','76800','86470','74829');
GRANT CREATE ON SCHEMA public TO yincorp_launch_reader;
ALTER VIEW public.portal_sp_launches OWNER TO yincorp_launch_reader;
REVOKE CREATE ON SCHEMA public FROM yincorp_launch_reader;
REVOKE ALL ON public.portal_sp_launches FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.portal_sp_launches TO anon, authenticated;
COMMENT ON VIEW public.portal_sp_launches IS 'Authorized 20-project editorial catalog. RLS-enforced NOLOGIN owner; public safe columns only. Inactive rows are historical configurations, never sale stock.';
NOTIFY pgrst, 'reload schema';

REVOKE yincorp_launch_reader FROM postgres;
