-- Phase 1 · Detection: Himawari satellite loop (ADR-015).
-- Addresses and times of Himawari images that the ingest-official function verified as current on the JMA
-- Meteorological Satellite Center website. No image is stored: browsers load them from JMA with JMA's citation.
-- Reference data shared by every organisation, like official alerts; written only by the ingest service.
-- Safe to run more than once.

create table if not exists public.ddrive_satellite_frames (
  sector text not null check (sector ~ '^[a-z0-9_]{2,4}$'),
  product text not null check (product in ('b13', 'b03')),
  observed_at timestamptz not null,
  slot text not null check (slot ~ '^[0-2][0-9][0-5]0$'),
  url text not null check (url ~ '^https?://' and length(url) <= 300),
  last_modified timestamptz not null,
  verified_at timestamptz not null default now(),
  primary key (sector, product, observed_at),
  -- A frame is only kept when JMA modified the file within two hours after its slot (an older file is another day's image).
  constraint ddrive_satellite_frames_current check (last_modified >= observed_at and last_modified <= observed_at + interval '2 hours')
);
create index if not exists ddrive_satellite_frames_recent_idx on public.ddrive_satellite_frames (product, observed_at desc);

create or replace function public.ddrive_record_satellite_frames(p jsonb)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare n int;
begin
  if not public.ddrive_is_admin_context() then
    raise exception 'Only the ingest service can record satellite frames.' using errcode = '42501';
  end if;
  if jsonb_typeof(p) <> 'array' then raise exception 'Expected a list of frames.' using errcode = '22023'; end if;
  insert into public.ddrive_satellite_frames (sector, product, observed_at, slot, url, last_modified)
  select f->>'sector', f->>'product', (f->>'observed_at')::timestamptz, f->>'slot', f->>'url', (f->>'last_modified')::timestamptz
  from jsonb_array_elements(p) f
  on conflict (sector, product, observed_at) do nothing;
  get diagnostics n = row_count;
  -- JMA keeps 24 hours; so do we. An address older than that points at a newer image.
  delete from public.ddrive_satellite_frames where observed_at < now() - interval '24 hours';
  return n;
end;
$$;

alter table public.ddrive_satellite_frames enable row level security;
drop policy if exists satellite_frames_select on public.ddrive_satellite_frames;
create policy satellite_frames_select on public.ddrive_satellite_frames for select to authenticated using (true);

revoke all on public.ddrive_satellite_frames from anon, authenticated;
grant select on public.ddrive_satellite_frames to authenticated;
revoke all on function public.ddrive_record_satellite_frames(jsonb) from public, anon, authenticated;
grant execute on function public.ddrive_record_satellite_frames(jsonb) to service_role;
