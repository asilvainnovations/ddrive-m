-- DDRiVE-M Phase 3 Rapid Mapping tests (ADR-004). Runs after 30_phase2_anticipatory.sql in the same database.
-- Follows the spec's flood scenario: incident → activation → AOI → observations → preliminary estimate → review → publish → link,
-- then an update cycle that supersedes the published version.
\set ON_ERROR_STOP on
\set QUIET on
\ir helpers.sql
truncate tests.results restart identity;

-- A second analyst and DRRM officer, for separation of duties.
insert into auth.users (email, raw_user_meta_data) values
  ('analyst2@a.ph', '{"full_name": "Ariel Analyst"}'), ('officer2@a.ph', '{"full_name": "Olga Officer"}')
on conflict (email) do nothing;
select tests.claims('admin@a.ph'); set role authenticated;
select tests.ok('Admin adds a second analyst', $q$ select public.ddrive_add_member(public.ddrive_active_tenant(), 'analyst2@a.ph', 'analyst') $q$);
select tests.ok('Admin adds a second DRRM officer', $q$ select public.ddrive_add_member(public.ddrive_active_tenant(), 'officer2@a.ph', 'drrm_officer') $q$);
reset role;
update public.ddrive_users set active_tenant_id = (select id from public.ddrive_tenants where name = 'LGU A')
 where email in ('analyst2@a.ph', 'officer2@a.ph');

create or replace function tests.rm(p_kind text, p_name text) returns text language sql security definer as $$
  select case p_kind
    when 'activation' then (select id from public.ddrive_rm_activations where title = p_name)
    when 'aoi' then (select id from public.ddrive_rm_aois where name = p_name)
    when 'product' then (select id from public.ddrive_rm_products where title = p_name)
    when 'v1' then (select v.id from public.ddrive_rm_product_versions v join public.ddrive_rm_products p on p.id = v.product_id where p.title = p_name and v.version_no = 1)
    when 'v2' then (select v.id from public.ddrive_rm_product_versions v join public.ddrive_rm_products p on p.id = v.product_id where p.title = p_name and v.version_no = 2)
    when 'layer' then (select id from public.ddrive_rm_layers where name = p_name order by created_at desc limit 1)
    when 'obs' then (select id from public.ddrive_rm_observations where description = p_name)
    when 'incident' then (select id from public.ddrive_incidents where title = p_name)
  end
$$;
grant execute on function tests.rm(text, text) to authenticated;

-- A square of about 2 km around central Ormoc, and points inside it.
\set aoi '{"type": "Polygon", "coordinates": [[[124.60, 11.00], [124.62, 11.00], [124.62, 11.02], [124.60, 11.02], [124.60, 11.00]]]}'

-- ─── Activation linked to an incident (criterion 1) ──────────────────────────
select tests.claims('responder@a.ph'); set role authenticated;
select tests.ok('A responder opens an incident', $q$ insert into public.ddrive_incidents (title, priority) values ('Flooding along Anilao River', 'High') $q$);
select tests.refused('A responder cannot open a mapping activation', $q$
  insert into public.ddrive_rm_activations (incident_id, title, hazard_type) values (tests.rm('incident', 'Flooding along Anilao River'), 'Flood mapping', 'flood') $q$);
reset role;

select tests.claims('analyst@a.ph'); set role authenticated;
select tests.ok('An analyst opens an activation for the incident, claiming it is already active', $q$
  insert into public.ddrive_rm_activations (incident_id, title, hazard_type, priority, status, operational_objective)
  values (tests.rm('incident', 'Flooding along Anilao River'), 'Anilao flood mapping', 'flood', 'urgent', 'active',
          'Which barangays are flooded and which roads are passable?') $q$);
select tests.eq('It starts as a draft with a server-issued reference', $q$ select status || ' ' || ref from public.ddrive_rm_activations where title = 'Anilao flood mapping' $q$, 'draft M-001');
select tests.refused('An activation needs an incident from the same organisation', $q$
  insert into public.ddrive_rm_activations (incident_id, title, hazard_type) values ('no-such-incident', 'Orphan mapping', 'flood') $q$);
select tests.refused('An analyst cannot activate it', $q$ select public.ddrive_rm_set_activation_status(tests.rm('activation', 'Anilao flood mapping'), 'active') $q$);
select tests.refused('An analyst cannot set its status directly', $q$ update public.ddrive_rm_activations set status = 'active' where title = 'Anilao flood mapping' $q$);
reset role;

select tests.claims('officer@a.ph'); set role authenticated;
select tests.eq('A DRRM officer activates it', $q$ select public.ddrive_rm_set_activation_status(tests.rm('activation', 'Anilao flood mapping'), 'active') $q$, 'active');
select tests.refused('An active activation cannot go back to draft', $q$ select public.ddrive_rm_set_activation_status(tests.rm('activation', 'Anilao flood mapping'), 'draft') $q$);
reset role;

-- ─── Areas of interest (criterion 2) ─────────────────────────────────────────
select tests.claims('analyst@a.ph'); set role authenticated;
select tests.refused('An unclosed ring is refused', $q$
  insert into public.ddrive_rm_aois (activation_id, name, geometry) values (tests.rm('activation', 'Anilao flood mapping'), 'Bad ring',
  '{"type": "Polygon", "coordinates": [[[124.60, 11.00], [124.62, 11.00], [124.62, 11.02], [124.60, 11.03]]]}') $q$);
select tests.refused('Projected coordinates (metres, not degrees) are refused', $q$
  insert into public.ddrive_rm_aois (activation_id, name, geometry) values (tests.rm('activation', 'Anilao flood mapping'), 'UTM',
  '{"type": "Polygon", "coordinates": [[[714000, 1217000], [716000, 1217000], [716000, 1219000], [714000, 1217000]]]}') $q$);
select tests.refused('A point is not a valid area of interest', $q$
  insert into public.ddrive_rm_aois (activation_id, name, geometry) values (tests.rm('activation', 'Anilao flood mapping'), 'Dot',
  '{"type": "Point", "coordinates": [124.61, 11.01]}') $q$);
select tests.ok('An analyst draws the AOI', format($q$
  insert into public.ddrive_rm_aois (activation_id, name, aoi_type, geometry, status)
  values (tests.rm('activation', 'Anilao flood mapping'), 'Anilao riverside cluster', 'barangay', %L, 'approved') $q$, :'aoi'));
select tests.eq('It starts as a draft, stored as a MultiPolygon, with a server-computed extent', $q$
  select status || ' ' || (geometry ->> 'type') || ' ' || min_lon || ',' || max_lat from public.ddrive_rm_aois where name = 'Anilao riverside cluster' $q$,
  'draft MultiPolygon 124.6,11.02');
select tests.ok('The analyst corrects the boundary with a reason', $q$
  update public.ddrive_rm_aois set geometry = '{"type": "Polygon", "coordinates": [[[124.60, 11.00], [124.63, 11.00], [124.63, 11.02], [124.60, 11.02], [124.60, 11.00]]]}',
         change_reason = 'Extend east to the national highway' where name = 'Anilao riverside cluster' $q$);
select tests.eq('Both boundaries are kept in the history', $q$ select string_agg(version_no::text, ',' order by version_no) from public.ddrive_rm_aoi_versions where aoi_id = tests.rm('aoi', 'Anilao riverside cluster') $q$, '1,2');
select tests.eq('Submitting the AOI', $q$ select public.ddrive_rm_aoi_step(tests.rm('aoi', 'Anilao riverside cluster'), 'submit') $q$, 'submitted');
select tests.refused('A submitted AOI cannot be edited', $q$ update public.ddrive_rm_aois set name = 'Renamed' where name = 'Anilao riverside cluster' $q$);
reset role;

select tests.claims('viewer@a.ph'); set role authenticated;
select tests.eq('A viewer does not see the unapproved AOI', $q$ select count(*)::text from public.ddrive_rm_aois $q$, '0');
reset role;
select tests.claims('officer@a.ph'); set role authenticated;
select tests.refused('Returning without a note is refused', $q$ select public.ddrive_rm_aoi_step(tests.rm('aoi', 'Anilao riverside cluster'), 'return', 'no') $q$);
select tests.eq('A DRRM officer approves it', $q$ select public.ddrive_rm_aoi_step(tests.rm('aoi', 'Anilao riverside cluster'), 'approve') $q$, 'approved');
reset role;
select tests.claims('viewer@a.ph'); set role authenticated;
select tests.eq('Once approved, a viewer sees it', $q$ select count(*)::text from public.ddrive_rm_aois $q$, '1');
reset role;

-- The officer who drew a boundary cannot approve it.
select tests.claims('officer@a.ph'); set role authenticated;
select tests.ok('A DRRM officer draws a second AOI', format($q$
  insert into public.ddrive_rm_aois (activation_id, name, geometry) values (tests.rm('activation', 'Anilao flood mapping'), 'Officer-drawn area', %L) $q$, :'aoi'));
select tests.ok('and submits it', $q$ select public.ddrive_rm_aoi_step(tests.rm('aoi', 'Officer-drawn area'), 'submit') $q$);
select tests.refused('but cannot approve their own boundary', $q$ select public.ddrive_rm_aoi_step(tests.rm('aoi', 'Officer-drawn area'), 'approve') $q$);
reset role;

-- ─── Field observations, offline-safe (criterion 14) ─────────────────────────
select tests.claims('responder@a.ph'); set role authenticated;
select tests.ok('A responder sends a road observation, claiming it is already verified', $q$
  insert into public.ddrive_rm_observations (client_key, activation_id, aoi_id, observed_at, observation_type, access_status, description, geometry, verification_status)
  values ('11111111-1111-1111-1111-111111111111', tests.rm('activation', 'Anilao flood mapping'), tests.rm('aoi', 'Anilao riverside cluster'),
          now() - interval '30 minutes', 'road_access', 'impassable', 'Knee-deep water on Real Street',
          '{"type": "Point", "coordinates": [124.61, 11.01]}', 'field_verified') $q$);
select tests.eq('It is stored as submitted, with the server''s receipt time', $q$
  select verification_status || ' ' || (submitted_at > observed_at)::text from public.ddrive_rm_observations where description = 'Knee-deep water on Real Street' $q$, 'submitted true');
select tests.ok('Sending the same observation again after a dropped connection does nothing', $q$
  insert into public.ddrive_rm_observations (client_key, activation_id, observed_at, observation_type, description, geometry)
  values ('11111111-1111-1111-1111-111111111111', tests.rm('activation', 'Anilao flood mapping'), now(), 'road_access', 'Knee-deep water on Real Street',
          '{"type": "Point", "coordinates": [124.61, 11.01]}')
  on conflict (client_key) do nothing $q$);
select tests.eq('There is still one observation', $q$ select count(*)::text from public.ddrive_rm_observations where description = 'Knee-deep water on Real Street' $q$, '1');
select tests.ok('A second observation of structural damage, condition unknown', $q$
  insert into public.ddrive_rm_observations (client_key, activation_id, observed_at, observation_type, description, geometry, condition_code)
  values ('22222222-2222-2222-2222-222222222222', tests.rm('activation', 'Anilao flood mapping'), now() - interval '10 minutes', 'structure_damage',
          'Collapsed wall at the day care centre', '{"type": "Point", "coordinates": [124.615, 11.012]}', 'unknown') $q$);
select tests.refused('A condition outside the approved list is refused', $q$
  insert into public.ddrive_rm_observations (client_key, activation_id, observed_at, observation_type, description, geometry, condition_code)
  values (gen_random_uuid(), tests.rm('activation', 'Anilao flood mapping'), now(), 'structure_damage', 'Roof gone', '{"type": "Point", "coordinates": [124.61, 11.01]}', 'destroyed') $q$);
select tests.refused('An observation from the future is refused', $q$
  insert into public.ddrive_rm_observations (client_key, activation_id, observed_at, observation_type, description, geometry)
  values (gen_random_uuid(), tests.rm('activation', 'Anilao flood mapping'), now() + interval '1 day', 'other', 'Time travel', '{"type": "Point", "coordinates": [124.61, 11.01]}') $q$);
select tests.refused('A responder cannot verify observations', $q$ select public.ddrive_rm_triage_observation(tests.rm('obs', 'Knee-deep water on Real Street'), 'field_verified', 'Checked on site') $q$);
select tests.refused('A responder cannot edit a sent observation', $q$ update public.ddrive_rm_observations set description = 'changed' $q$);
reset role;
select tests.claims('viewer@a.ph'); set role authenticated;
select tests.refused('A viewer cannot send observations', $q$
  insert into public.ddrive_rm_observations (client_key, activation_id, observed_at, observation_type, description, geometry)
  values (gen_random_uuid(), tests.rm('activation', 'Anilao flood mapping'), now(), 'other', 'Viewer note', '{"type": "Point", "coordinates": [124.61, 11.01]}') $q$);
select tests.eq('nor read them', $q$ select count(*)::text from public.ddrive_rm_observations $q$, '0');
reset role;

-- Damage classes come from the organisation's approved dictionary.
select tests.claims('analyst@a.ph'); set role authenticated;
select tests.refused('An analyst cannot add a condition code', $q$
  insert into public.ddrive_rm_condition_codes (code, label, definition, approval_basis) values ('major', 'Major damage', 'Structural elements failed', 'CDRRMC Res. 2026-14') $q$);
select tests.eq('The analyst verifies the road observation', $q$ select public.ddrive_rm_triage_observation(tests.rm('obs', 'Knee-deep water on Real Street'), 'field_verified', 'Confirmed by barangay tanod by radio') $q$, 'field_verified');
reset role;
select tests.claims('officer@a.ph'); set role authenticated;
select tests.ok('A DRRM officer adds an approved condition code', $q$
  insert into public.ddrive_rm_condition_codes (code, label, asset_class, definition, approval_basis)
  values ('major', 'Major damage', 'building', 'Structural elements failed; not safe to occupy', 'CDRRMC Resolution 2026-14') $q$);
reset role;

-- ─── Preliminary estimate product (criteria 3–7) ─────────────────────────────
select tests.claims('analyst@a.ph'); set role authenticated;
select tests.ok('An analyst creates a preliminary estimate on the AOI, claiming it is published', $q$
  insert into public.ddrive_rm_products (activation_id, aoi_id, product_type, title, confidence, status, published_version)
  values (tests.rm('activation', 'Anilao flood mapping'), tests.rm('aoi', 'Anilao riverside cluster'), 'preliminary_estimate', 'Anilao preliminary flood estimate', 'low', 'published', 1) $q$);
select tests.eq('It starts as a draft with version 1', $q$
  select p.status || ' ' || p.ref || ' v' || p.current_version || ' ' || coalesce(p.published_version::text, 'unpublished') || ' ' || v.status
  from public.ddrive_rm_products p join public.ddrive_rm_product_versions v on v.product_id = p.id where p.title = 'Anilao preliminary flood estimate' $q$,
  'draft MP-001 v1 unpublished draft');
select tests.refused('A product needs an AOI unless it is a baseline reference package', $q$
  insert into public.ddrive_rm_products (activation_id, product_type, title) values (tests.rm('activation', 'Anilao flood mapping'), 'delineation', 'No AOI') $q$);
select tests.refused('Submitting without methodology, limitations, cut-off or layers is refused', $q$ select public.ddrive_rm_submit_version(tests.rm('v1', 'Anilao preliminary flood estimate')) $q$);
select tests.ok('The analyst records methodology and limitations', $q$
  update public.ddrive_rm_products set methodology = 'Initial field reports and barangay calls plotted on the AOI.',
         limitations = 'Not yet field verified; reporting from upland barangays is incomplete.' where title = 'Anilao preliminary flood estimate' $q$);
select tests.ok('and the information cut-off', $q$ update public.ddrive_rm_product_versions set data_cutoff_at = now() - interval '5 minutes' where id = tests.rm('v1', 'Anilao preliminary flood estimate') $q$);
select tests.refused('A version''s status cannot be set directly', $q$ update public.ddrive_rm_product_versions set status = 'published' where id = tests.rm('v1', 'Anilao preliminary flood estimate') $q$);
select tests.ok('The analyst adds a layer for imported data', $q$
  insert into public.ddrive_rm_layers (version_id, name, layer_role, source_type, source_name, source_format, source_file_name, feature_count)
  values (tests.rm('v1', 'Anilao preliminary flood estimate'), 'Reported flooded streets', 'observed', 'field', 'Barangay reports via radio', 'geojson', 'streets.geojson', 999) $q$);
select tests.eq('The server owns the feature count', $q$ select feature_count::text from public.ddrive_rm_layers where name = 'Reported flooded streets' $q$, '0');
select tests.refused('A layer in another CRS is refused', $q$
  insert into public.ddrive_rm_layers (version_id, name, layer_role, source_type, source_name, source_crs)
  values (tests.rm('v1', 'Anilao preliminary flood estimate'), 'UTM layer', 'observed', 'field', 'Survey', 'EPSG:32651') $q$);
select tests.refused('A batch with one invalid feature is refused, naming it', $q$
  select public.ddrive_rm_add_features(tests.rm('layer', 'Reported flooded streets'), '[
    {"type": "Feature", "geometry": {"type": "LineString", "coordinates": [[124.605, 11.005], [124.61, 11.006]]}, "properties": {"name": "Real St"}},
    {"type": "Feature", "geometry": {"type": "LineString", "coordinates": [[124.605, 11.005]]}, "properties": {}}]'::jsonb, 'low') $q$);
select tests.eq('Valid features are added', $q$
  select public.ddrive_rm_add_features(tests.rm('layer', 'Reported flooded streets'), '[
    {"type": "Feature", "id": "s1", "geometry": {"type": "LineString", "coordinates": [[124.605, 11.005], [124.61, 11.006]]}, "properties": {"name": "Real St", "html": "<img src=x onerror=alert(1)>"}},
    {"type": "Feature", "id": "s2", "geometry": {"type": "LineString", "coordinates": [[124.611, 11.007], [124.615, 11.009]]}, "properties": {"name": "Bonifacio St"}},
    {"type": "Feature", "id": "b1", "geometry": {"type": "Point", "coordinates": [124.615, 11.012]}, "properties": {"name": "Day care centre", "condition_code": "major"}}]'::jsonb, 'low')::text $q$, '3');
select tests.eq('The layer''s count, type and extent are recomputed', $q$ select feature_count || ' ' || geometry_type || ' ' || max_lon from public.ddrive_rm_layers where name = 'Reported flooded streets' $q$, '3 mixed 124.615');
select tests.ok('A layer is built from the verified field observations', $q$ select public.ddrive_rm_layer_from_observations(tests.rm('v1', 'Anilao preliminary flood estimate'), 'Verified field observations') $q$);
select tests.eq('It holds only the verified observation, linked to it', $q$
  select count(*) || ' ' || min(f.verification_status) || ' ' || (min(f.observation_id) = tests.rm('obs', 'Knee-deep water on Real Street'))::text
  from public.ddrive_rm_features f join public.ddrive_rm_layers l on l.id = f.layer_id where l.name = 'Verified field observations' $q$, '1 field_checked true');
select tests.eq('The analyst submits version 1 for review', $q$ select public.ddrive_rm_submit_version(tests.rm('v1', 'Anilao preliminary flood estimate')) $q$, 'under_review');
select tests.eq('The source manifest is frozen into the version', $q$ select jsonb_array_length(source_manifest)::text from public.ddrive_rm_product_versions where id = tests.rm('v1', 'Anilao preliminary flood estimate') $q$, '2');
select tests.refused('Metadata cannot be edited while under review', $q$ update public.ddrive_rm_products set limitations = 'changed after submission' where title = 'Anilao preliminary flood estimate' $q$);
select tests.refused('Layers cannot be added while under review', $q$
  insert into public.ddrive_rm_layers (version_id, name, layer_role, source_type, source_name) values (tests.rm('v1', 'Anilao preliminary flood estimate'), 'Late layer', 'observed', 'field', 'x source') $q$);
select tests.refused('The author cannot review their own version', $q$ select public.ddrive_rm_review_version(tests.rm('v1', 'Anilao preliminary flood estimate'), 'accept') $q$);
reset role;

select tests.claims('responder@a.ph'); set role authenticated;
select tests.eq('A responder does not see the unpublished product', $q$ select count(*)::text from public.ddrive_rm_products $q$, '0');
select tests.eq('nor its features', $q$ select count(*)::text from public.ddrive_rm_features $q$, '0');
reset role;

select tests.claims('analyst2@a.ph'); set role authenticated;
select tests.refused('Returning without comments is refused', $q$ select public.ddrive_rm_review_version(tests.rm('v1', 'Anilao preliminary flood estimate'), 'return', 'fix') $q$);
select tests.eq('A second analyst returns it', $q$ select public.ddrive_rm_review_version(tests.rm('v1', 'Anilao preliminary flood estimate'), 'return', 'State the observation time window in the summary.') $q$, 'draft');
reset role;
select tests.claims('analyst@a.ph'); set role authenticated;
select tests.ok('The author fixes the summary', $q$ update public.ddrive_rm_products set summary = 'Reports received 06:00–09:30 PHT.' where title = 'Anilao preliminary flood estimate' $q$);
select tests.eq('and resubmits', $q$ select public.ddrive_rm_submit_version(tests.rm('v1', 'Anilao preliminary flood estimate')) $q$, 'under_review');
reset role;
select tests.claims('analyst2@a.ph'); set role authenticated;
select tests.eq('The second analyst accepts it and asks for field verification', $q$ select public.ddrive_rm_review_version(tests.rm('v1', 'Anilao preliminary flood estimate'), 'accept', 'OK for operational use', true) $q$, 'for_field_verification');
select tests.eq('Both reviews are recorded against the exact version', $q$ select string_agg(decision, ',' order by reviewed_at, id) from public.ddrive_rm_reviews where version_id = tests.rm('v1', 'Anilao preliminary flood estimate') $q$, 'return,accept');
select tests.refused('An analyst cannot publish', $q$ select public.ddrive_rm_publish_version(tests.rm('v1', 'Anilao preliminary flood estimate'), 'internal_eoc') $q$);
reset role;

-- ─── Publication authority (criteria 6, 8, 9) ────────────────────────────────
select tests.claims('officer@a.ph'); set role authenticated;
select tests.refused('An unverified product cannot go to partners', $q$ select public.ddrive_rm_publish_version(tests.rm('v1', 'Anilao preliminary flood estimate'), 'partner_restricted') $q$);
select tests.eq('A DRRM officer publishes it, preliminary, to the internal EOC', $q$ select public.ddrive_rm_publish_version(tests.rm('v1', 'Anilao preliminary flood estimate'), 'internal_eoc', 'For operational coordination') $q$, 'published');
select tests.eq('It is labelled preliminary', $q$ select publication_level || ' ' || published_audience from public.ddrive_rm_product_versions where id = tests.rm('v1', 'Anilao preliminary flood estimate') $q$, 'preliminary internal_eoc');
reset role;
select tests.claims('analyst@a.ph'); set role authenticated;
select tests.refused('A published version cannot be edited', $q$ update public.ddrive_rm_product_versions set data_cutoff_at = now() where id = tests.rm('v1', 'Anilao preliminary flood estimate') $q$);
select tests.refused('nor its layers', $q$ update public.ddrive_rm_layers set name = 'Tampered' where name = 'Reported flooded streets' $q$);
select tests.refused('nor can its layers be deleted', $q$ delete from public.ddrive_rm_layers where name = 'Reported flooded streets' $q$);
select tests.refused('Features cannot be added to it', $q$ select public.ddrive_rm_add_features(tests.rm('layer', 'Reported flooded streets'), '[{"type": "Feature", "geometry": {"type": "Point", "coordinates": [124.61, 11.01]}, "properties": {}}]'::jsonb) $q$);
reset role;

select tests.claims('responder@a.ph'); set role authenticated;
select tests.eq('Now a responder sees the product (internal EOC audience)', $q$ select count(*)::text from public.ddrive_rm_products $q$, '1');
select tests.eq('and its features', $q$ select count(*)::text from public.ddrive_rm_features $q$, '4');
reset role;
select tests.claims('viewer@a.ph'); set role authenticated;
select tests.eq('A viewer (outside the internal EOC audience) does not', $q$ select count(*)::text from public.ddrive_rm_products $q$, '0');
reset role;

-- ─── Link to the incident (criterion 12) ─────────────────────────────────────
select tests.claims('analyst@a.ph'); set role authenticated;
select tests.ok('An analyst links the published version to the incident', $q$
  insert into public.ddrive_rm_product_links (version_id, target_module, target_id, relationship)
  values (tests.rm('v1', 'Anilao preliminary flood estimate'), 'incident', tests.rm('incident', 'Flooding along Anilao River'), 'supports') $q$);
select tests.refused('A link to a record that does not exist is refused', $q$
  insert into public.ddrive_rm_product_links (version_id, target_module, target_id) values (tests.rm('v1', 'Anilao preliminary flood estimate'), 'plan', 'no-such-plan') $q$);
reset role;

-- ─── Update cycle: new version supersedes (criterion 10) ─────────────────────
select tests.claims('analyst@a.ph'); set role authenticated;
select tests.refused('A new version needs a change summary', $q$ select public.ddrive_rm_new_version(tests.rm('product', 'Anilao preliminary flood estimate'), 'more') $q$);
select tests.ok('The analyst starts version 2 from version 1', $q$ select public.ddrive_rm_new_version(tests.rm('product', 'Anilao preliminary flood estimate'), 'Add afternoon reports from Barangay Can-adieng') $q$);
select tests.eq('Version 2 has copies of the layers and features', $q$
  select count(distinct l.id) || ' ' || count(f.id) from public.ddrive_rm_layers l left join public.ddrive_rm_features f on f.layer_id = l.id where l.version_id = tests.rm('v2', 'Anilao preliminary flood estimate') $q$, '2 4');
select tests.eq('Version 1 stays published while version 2 is drafted', $q$
  select status || ' v' || current_version || ' published v' || published_version from public.ddrive_rm_products where title = 'Anilao preliminary flood estimate' $q$, 'draft v2 published v1');
select tests.refused('A second draft cannot be started while one is open', $q$ select public.ddrive_rm_new_version(tests.rm('product', 'Anilao preliminary flood estimate'), 'Another parallel draft') $q$);
select tests.ok('The analyst sets the new cut-off and submits', $q$
  update public.ddrive_rm_product_versions set data_cutoff_at = now() where id = tests.rm('v2', 'Anilao preliminary flood estimate') $q$);
select tests.eq('Version 2 under review', $q$ select public.ddrive_rm_submit_version(tests.rm('v2', 'Anilao preliminary flood estimate')) $q$, 'under_review');
reset role;
select tests.claims('analyst2@a.ph'); set role authenticated;
select tests.eq('Version 2 accepted', $q$ select public.ddrive_rm_review_version(tests.rm('v2', 'Anilao preliminary flood estimate'), 'accept') $q$, 'preliminary');
reset role;
select tests.claims('officer@a.ph'); set role authenticated;
select tests.refused('Verifying needs a note on what was checked', $q$ select public.ddrive_rm_verify_version(tests.rm('v2', 'Anilao preliminary flood estimate'), 'ok') $q$);
select tests.eq('A DRRM officer verifies version 2', $q$ select public.ddrive_rm_verify_version(tests.rm('v2', 'Anilao preliminary flood estimate'), 'Street flooding confirmed by two field teams at 14:00') $q$, 'verified');
select tests.eq('Field-checked features become verified', $q$
  select count(*)::text from public.ddrive_rm_features f join public.ddrive_rm_layers l on l.id = f.layer_id
  where l.version_id = tests.rm('v2', 'Anilao preliminary flood estimate') and f.verification_status = 'verified' $q$, '1');
reset role;
select tests.claims('officer2@a.ph'); set role authenticated;
select tests.refused('A DRRM officer who is not an administrator cannot approve public release', $q$ select public.ddrive_rm_publish_version(tests.rm('v2', 'Anilao preliminary flood estimate'), 'public_approved') $q$);
select tests.eq('The verified version is published to partners', $q$ select public.ddrive_rm_publish_version(tests.rm('v2', 'Anilao preliminary flood estimate'), 'partner_restricted') $q$, 'published');
select tests.eq('Version 1 is superseded but kept', $q$
  select string_agg(version_no || ':' || status, ',' order by version_no) from public.ddrive_rm_product_versions where product_id = tests.rm('product', 'Anilao preliminary flood estimate') $q$, '1:superseded,2:published');
reset role;
select tests.claims('viewer@a.ph'); set role authenticated;
select tests.eq('A viewer now sees the partner-restricted version, but not the superseded internal one', $q$ select string_agg(version_no::text, ',') from public.ddrive_rm_product_versions $q$, '2');
reset role;

-- ─── Closing (spec §8.7) ─────────────────────────────────────────────────────
select tests.claims('analyst@a.ph'); set role authenticated;
select tests.ok('A second product is left as a draft', $q$
  insert into public.ddrive_rm_products (activation_id, aoi_id, product_type, title) values (tests.rm('activation', 'Anilao flood mapping'), tests.rm('aoi', 'Anilao riverside cluster'), 'grading', 'Damage grading draft') $q$);
reset role;
select tests.claims('officer@a.ph'); set role authenticated;
select tests.refused('The activation cannot close with an open draft', $q$ select public.ddrive_rm_set_activation_status(tests.rm('activation', 'Anilao flood mapping'), 'closed', 'Flood waters receded') $q$);
select tests.eq('The officer archives the draft product', $q$ select public.ddrive_rm_archive_product(tests.rm('product', 'Damage grading draft'), 'No damage assessment requested') $q$, 'archived');
select tests.refused('Closing needs a reason', $q$ select public.ddrive_rm_set_activation_status(tests.rm('activation', 'Anilao flood mapping'), 'closed', 'done') $q$);
select tests.eq('The activation closes', $q$ select public.ddrive_rm_set_activation_status(tests.rm('activation', 'Anilao flood mapping'), 'closed', 'Flood waters receded; products published') $q$, 'closed');
reset role;
select tests.claims('analyst@a.ph'); set role authenticated;
select tests.refused('A closed activation cannot be edited', $q$ update public.ddrive_rm_activations set title = 'Reopened?' where title = 'Anilao flood mapping' $q$);
select tests.refused('nor can new products be added', $q$
  insert into public.ddrive_rm_products (activation_id, aoi_id, product_type, title) values (tests.rm('activation', 'Anilao flood mapping'), tests.rm('aoi', 'Anilao riverside cluster'), 'delineation', 'Too late') $q$);
reset role;
select tests.claims('responder@a.ph'); set role authenticated;
select tests.refused('nor new field observations', $q$
  insert into public.ddrive_rm_observations (client_key, activation_id, observed_at, observation_type, description, geometry)
  values (gen_random_uuid(), tests.rm('activation', 'Anilao flood mapping'), now(), 'other', 'After closing', '{"type": "Point", "coordinates": [124.61, 11.01]}') $q$);
reset role;

-- ─── Other organisations and anonymous visitors (criterion 11) ───────────────
select tests.claims('admin@b.ph'); set role authenticated;
select tests.eq('Another organisation sees no activations, AOIs, products or features', $q$
  select (select count(*) from public.ddrive_rm_activations) + (select count(*) from public.ddrive_rm_aois)
       + (select count(*) from public.ddrive_rm_products) + (select count(*) from public.ddrive_rm_features) || '' $q$, '0');
select tests.refused('and cannot take steps on them', $q$ select public.ddrive_rm_archive_product((select id from public.ddrive_rm_products limit 1), 'Not our product to archive') $q$);
reset role;
set role anon;
select tests.refused('Anonymous visitors see nothing', $q$ select count(*) from public.ddrive_rm_products $q$);
select tests.refused('and cannot call the steps', $q$ select public.ddrive_rm_submit_version('x') $q$);
reset role;
select tests.eq('Lifecycle steps are in the audit log (criterion 15)', $q$ select (count(*) >= 20)::text from public.ddrive_audit_log where table_name like 'ddrive_rm_%' $q$, 'true');

\set QUIET off
\pset format aligned
\pset border 0
select case when ok then 'PASS' else 'FAIL' end as result, label, case when ok then '' else coalesce(detail, '') end as detail from tests.results order by n;
select count(*) filter (where ok) as passed, count(*) filter (where not ok) as failed from tests.results;
