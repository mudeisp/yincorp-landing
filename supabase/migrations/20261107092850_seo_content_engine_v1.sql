-- Local only. Copied into a CLI-generated versioned migration before delivery.
create table public.seo_content_settings (
  singleton boolean primary key default true check(singleton),
  enabled boolean not null default false,
  autopublish boolean not null default false,
  kill_switch boolean not null default true
);
insert into public.seo_content_settings default values;
create table public.seo_state_config (
  state text primary key check(state ~ '^[A-Z]{2}$'),
  enabled boolean not null default false,
  quota integer not null default 0 check(quota between 0 and 5),
  budget_micros bigint not null default 1000000 check(budget_micros between 0 and 10000000)
);
insert into public.seo_state_config(state,enabled,quota) values ('SP',true,5),('ES',true,5);
create table public.seo_publication_runs (
  id uuid primary key default gen_random_uuid(), state text not null references public.seo_state_config(state),
  day date not null, token uuid not null default gen_random_uuid(), attempts int not null default 1,
  status text not null default 'RUNNING' check(status in ('RUNNING','COMPLETE','FAILED')),
  quota int not null check(quota between 0 and 5), candidates int not null default 0 check(candidates between 0 and 5),
  budget_micros bigint not null, spent_micros bigint not null default 0,
  started_at timestamptz not null default now(), lease_until timestamptz not null default now()+interval '5 minutes',
  unique(state,day)
);
create table public.seo_topic_clusters (
  key text primary key, state text not null, city text not null, neighborhood text, intent text not null
);
create table public.seo_opportunities (
  id uuid primary key default gen_random_uuid(), identity_key text not null unique, topic_key text not null unique references public.seo_topic_clusters(key),
  run_id uuid not null references public.seo_publication_runs(id), state text not null,
  query text not null, score int not null, evidence_payload jsonb not null,
  status text not null default 'SCORED' check(status in ('DISCOVERED','SCORED','RESEARCHING','DRAFT','VERIFYING','APPROVED','NEEDS_REVIEW','FAILED','PUBLISHED','ROLLED_BACK'))
);
create table public.seo_articles (
  id uuid primary key references public.seo_opportunities(id), state text not null, path text not null unique,
  status text not null check(status in ('APPROVED','NEEDS_REVIEW','PUBLISHED','ROLLED_BACK')),
  revision text not null, document jsonb not null, verified_at timestamptz not null,
  published_at timestamptz, updated_at timestamptz not null default now()
);
create table public.seo_article_sources (
  article_id uuid not null references public.seo_articles(id), url text not null check(url like 'https://%'),
  observed_at timestamptz not null, digest text not null, excerpt text not null,
  primary key(article_id,url)
);
create table public.seo_validation_results (
  article_id uuid not null references public.seo_articles(id), revision text not null, gate text not null,
  status text not null check(status in ('PASS','FAIL','UNKNOWN')), evidence text not null,
  primary key(article_id,revision,gate)
);
create table public.seo_performance_daily (
  article_id uuid not null references public.seo_articles(id), state text not null, day date not null,
  provider text not null, metrics jsonb not null, collected_at timestamptz not null default now(),
  primary key(article_id,day,provider)
);
create table public.seo_audit_log (
  id bigint generated always as identity primary key, run_id uuid, article_id uuid,
  action text not null, detail jsonb not null default '{}', created_at timestamptz not null default now()
);
do $$ declare t text; begin
  foreach t in array array['seo_content_settings','seo_state_config','seo_publication_runs','seo_topic_clusters','seo_opportunities','seo_articles','seo_article_sources','seo_validation_results','seo_performance_daily','seo_audit_log'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant select, insert, update on public.%I to service_role',t);
  end loop;
end $$;
grant usage,select on sequence public.seo_audit_log_id_seq to service_role;

create or replace function public.seo_content_command(action text,payload jsonb)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
#variable_conflict use_column
declare
  r public.seo_publication_runs; c public.seo_state_config; a public.seo_articles;
  o jsonb; d jsonb; v jsonb; src jsonb; result jsonb; rid uuid; aid uuid; identity_value text; topic_value text;
  gates text[]:=array['sources','facts','originality','cannibalization','geography','inventory','links','editorial','security','canonical','sitemap','tests'];
  g text;
begin
  if action='claim' then
    if not exists(select 1 from seo_content_settings where enabled and not kill_switch) then return null; end if;
    select * into c from seo_state_config where state=payload->>'state' and enabled for update;
    if not found then return null; end if;
    insert into seo_publication_runs(state,day,quota,budget_micros)
      values(c.state,(payload->>'day')::date,least(c.quota,(payload->>'quota')::int),least(c.budget_micros,(payload->>'budget')::bigint))
      on conflict(state,day) do nothing returning * into r;
    if not found then
      select * into r from seo_publication_runs where state=c.state and day=(payload->>'day')::date for update;
      if r.status='COMPLETE' or r.attempts>=3 or (r.status='RUNNING' and r.lease_until>now()) then return null; end if;
      update seo_publication_runs set token=gen_random_uuid(),attempts=attempts+1,status='RUNNING',lease_until=now()+interval '5 minutes' where id=r.id returning * into r;
      update seo_opportunities set status='FAILED' where run_id=r.id and status in ('SCORED','RESEARCHING','DRAFT','VERIFYING');
      insert into seo_audit_log(run_id,action,detail) values(r.id,'RECLAIM',jsonb_build_object('errorCode','expired_or_failed_run'));
    end if;
    insert into seo_audit_log(run_id,action) values(r.id,'CLAIM');
    return jsonb_build_object('id',r.id,'token',r.token);
  end if;
  if action in ('reserve','stage','save','publish','finish','spend') then
    select * into r from seo_publication_runs where id=(payload->'run'->>'id')::uuid and token=(payload->'run'->>'token')::uuid and status='RUNNING' and lease_until>now() for update;
    if not found then raise exception 'stale_run'; end if;
    if not exists(select 1 from seo_content_settings where enabled and not kill_switch) then raise exception 'disabled'; end if;
  end if;
  if action='reserve' then
    if r.candidates>=r.quota then return null; end if;
    o:=payload->'opportunity'; identity_value:=o->>'identityKey'; topic_value:=o->>'topicKey';
    if o->>'state'<>r.state or identity_value is null or topic_value is null or (o->'scoring'->>'value')::int<60 then raise exception 'invalid_opportunity'; end if;
    if exists(select 1 from seo_opportunities where identity_key=identity_value or topic_key=topic_value) then return null; end if;
    insert into seo_topic_clusters(key,state,city,neighborhood,intent) values(topic_value,r.state,o->>'city',o->>'neighborhood',o->>'intent') on conflict do nothing;
    insert into seo_opportunities(identity_key,topic_key,run_id,state,query,score,evidence_payload)
      values(identity_value,topic_value,r.id,r.state,o->>'query',(o->'scoring'->>'value')::int,o) on conflict do nothing returning id into aid;
    if aid is null then return null; end if;
    update seo_publication_runs set candidates=candidates+1 where id=r.id;
    insert into seo_audit_log(run_id,article_id,action) values(r.id,aid,'SCORED');
    return jsonb_build_object('id',aid);
  elsif action='spend' then
    if (payload->>'micros')::bigint<=0 or r.spent_micros+(payload->>'micros')::bigint>r.budget_micros then return 'false'; end if;
    update seo_publication_runs set spent_micros=spent_micros+(payload->>'micros')::bigint where id=r.id;return 'true';
  elsif action='stage' then
    update seo_opportunities set status=payload->>'status' where id=(payload->>'id')::uuid and run_id=r.id and
      (payload->>'status'='FAILED' or (status='SCORED' and payload->>'status'='RESEARCHING') or (status='RESEARCHING' and payload->>'status'='DRAFT') or (status='DRAFT' and payload->>'status'='VERIFYING')) returning id into aid;
    if aid is null then raise exception 'invalid_transition'; end if;
    insert into seo_audit_log(run_id,article_id,action,detail) values(r.id,aid,payload->>'status',jsonb_build_object('errorCode',case when payload->>'errorCode' ~ '^[a-z][a-z0-9_]{0,63}$' then payload->>'errorCode' else null end));return 'true';
  elsif action='save' then
    d:=payload->'article';aid:=(d->>'id')::uuid;
    if not exists(select 1 from seo_opportunities where id=aid and run_id=r.id and status='VERIFYING') or d->>'state'<>r.state then raise exception 'invalid_article'; end if;
    if d->>'path' !~ ('^/'||lower(r.state)||'/conteudos/[a-z0-9]+(-[a-z0-9]+)*$') then raise exception 'invalid_path'; end if;
    insert into seo_articles(id,state,path,status,revision,document,verified_at) values(aid,r.state,d->>'path',d->>'status',d->>'validatedHash',d,(d->>'verifiedAt')::timestamptz);
    for src in select value from jsonb_array_elements(d->'sources') loop
      insert into seo_article_sources values(aid,src->>'url',(src->>'observedAt')::timestamptz,src->>'digest',src->>'excerpt');
    end loop;
    foreach g in array gates loop
      v:=d->'validations'->g;
      insert into seo_validation_results values(aid,d->>'validatedHash',g,coalesce(v->>'status','UNKNOWN'),coalesce(v->>'evidence','Missing evidence'));
    end loop;
    update seo_opportunities set status=d->>'status' where id=aid;
    insert into seo_audit_log(run_id,article_id,action) values(r.id,aid,d->>'status');return 'true';
  elsif action='publish' then
    select * into a from seo_articles where id=(payload->>'id')::uuid for update;
    perform 1 from seo_content_settings where singleton for share;
    if not exists(select 1 from seo_content_settings where enabled and autopublish and not kill_switch) or payload->>'autopublish' is distinct from 'true' then return 'false'; end if;
    if a.status<>'APPROVED' or a.state<>r.state or a.revision<>payload->>'revision' or a.verified_at<now()-interval '1 hour' or a.verified_at>now() then return 'false'; end if;
    if (select count(*) from seo_validation_results where article_id=a.id and revision=a.revision and gate=any(gates) and status='PASS' and length(evidence)>0)<>cardinality(gates) then return 'false'; end if;
    if not exists(select 1 from seo_article_sources where article_id=a.id) or exists(select 1 from seo_article_sources where article_id=a.id and (observed_at<now()-interval '7 days' or observed_at>now())) then return 'false'; end if;
    update seo_articles set status='PUBLISHED',published_at=now(),updated_at=now(),document=jsonb_set(jsonb_set(document,'{status}','"PUBLISHED"'),'{publishedAt}',to_jsonb(now())) where id=a.id;
    update seo_opportunities set status='PUBLISHED' where id=a.id;
    insert into seo_audit_log(run_id,article_id,action) values(r.id,a.id,'PUBLISHED');return 'true';
  elsif action='finish' then
    update seo_publication_runs set status=payload->>'status' where id=r.id;
    insert into seo_audit_log(run_id,action,detail) values(r.id,payload->>'status',jsonb_build_object('errorCode',case when payload->>'errorCode' ~ '^[a-z][a-z0-9_]{0,63}$' then payload->>'errorCode' else null end));return 'true';
  elsif action='existing' then
    select coalesce(jsonb_agg(jsonb_build_object('path',a.path,'title',a.document->'content'->>'title','text',a.document->'content','topicKey',o.topic_key)),'[]') into result from seo_articles a join seo_opportunities o on o.id=a.id where a.state=payload->>'state';return result;
  elsif action='published' then
    if not exists(select 1 from seo_content_settings where enabled and not kill_switch) then return '[]'; end if;
    select coalesce(jsonb_agg(document),'[]') into result from seo_articles where state=payload->>'state' and status='PUBLISHED';return result;
  elsif action='preview' then
    select document into result from seo_articles where id=(payload->>'id')::uuid;return result;
  elsif action='rollback' then
    update seo_articles set status='ROLLED_BACK',document=jsonb_set(document,'{status}','"ROLLED_BACK"'),updated_at=now() where id=(payload->>'id')::uuid returning id into aid;
    update seo_opportunities set status='ROLLED_BACK' where id=aid;
    insert into seo_audit_log(article_id,action,detail) values(aid,'ROLLED_BACK',jsonb_build_object('reason',payload->>'reason'));return to_jsonb(aid is not null);
  elsif action='monitor' then
    d:=payload->'metrics';select * into a from seo_articles where id=(d->>'articleId')::uuid;
    if not found or a.state<>d->>'state' or d->>'provider' not in ('gsc','ga4','events','index_inspection') then raise exception 'invalid_metrics'; end if;
    insert into seo_performance_daily(article_id,state,day,provider,metrics) values(a.id,a.state,(d->>'day')::date,d->>'provider',d->'values')
      on conflict(article_id,day,provider) do update set metrics=excluded.metrics,collected_at=now();return 'true';
  elsif action='report' then
    select jsonb_build_object('state',payload->>'state','day',payload->>'day','statuses',(select coalesce(jsonb_object_agg(status,n),'{}') from (select o.status,count(*) n from seo_opportunities o join seo_publication_runs rr on rr.id=o.run_id where rr.state=payload->>'state' and rr.day=(payload->>'day')::date group by o.status) counts),'metrics',(select coalesce(jsonb_agg(metrics),'[]') from seo_performance_daily where state=payload->>'state' and day=(payload->>'day')::date),'refreshDue',(select coalesce(jsonb_agg(id),'[]') from seo_articles where state=payload->>'state' and status='PUBLISHED' and verified_at<now()-interval '7 days')) into result;return result;
  end if;
  raise exception 'unknown_command';
end $$;
revoke all on function public.seo_content_command(text,jsonb) from public,anon,authenticated;
grant execute on function public.seo_content_command(text,jsonb) to service_role;

-- Defense in depth: direct privileged table updates cannot skip publication gates.
create function public.seo_guard_article() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
declare required text[]:=array['sources','facts','originality','cannibalization','geography','inventory','links','editorial','security','canonical','sitemap','tests'];
begin
  if tg_op='UPDATE' and (new.document->'content' is distinct from old.document->'content' or new.revision is distinct from old.revision or new.path is distinct from old.path or new.state is distinct from old.state or new.verified_at is distinct from old.verified_at) then
    raise exception 'immutable_revision_requires_new_review';
  end if;
  if new.status='PUBLISHED' then
    if tg_op='INSERT' then raise exception 'publication_requires_saved_review'; end if;
    if old.status<>'APPROVED' then raise exception 'publication_requires_approval'; end if;
    perform 1 from seo_content_settings where singleton for share;
    if not exists(select 1 from seo_content_settings where enabled and autopublish and not kill_switch) then raise exception 'publication_disabled'; end if;
    if new.verified_at<now()-interval '1 hour' or new.verified_at>now() then raise exception 'stale_review'; end if;
    if (select count(*) from seo_validation_results where article_id=new.id and revision=new.revision and gate=any(required) and status='PASS' and length(evidence)>0)<>cardinality(required) then raise exception 'publication_gates_blocked'; end if;
    if not exists(select 1 from seo_article_sources where article_id=new.id) or exists(select 1 from seo_article_sources where article_id=new.id and (observed_at<now()-interval '7 days' or observed_at>now() or digest<>encode(sha256(convert_to(to_json(excerpt)::text,'UTF8')),'hex'))) then raise exception 'publication_sources_blocked'; end if;
  end if;
  return new;
end $$;
create trigger seo_article_guard before insert or update on public.seo_articles for each row execute function public.seo_guard_article();
revoke all on function public.seo_guard_article() from public,anon,authenticated;
grant execute on function public.seo_guard_article() to service_role;
