-- =====================================================================
-- B.E.S.T. Terrain Punch — schéma et sécurité (RLS)
-- À exécuter une fois dans Supabase > SQL Editor.
-- Le script est idempotent : il complète les tables existantes
-- (employes, jobs, punchs) sans supprimer de données.
-- =====================================================================

-- ---------- Table employes ----------
create table if not exists public.employes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);
alter table public.employes add column if not exists user_id uuid unique references auth.users(id) on delete set null;
alter table public.employes add column if not exists nom text;
alter table public.employes add column if not exists courriel text;
alter table public.employes add column if not exists telephone text;
alter table public.employes add column if not exists role text not null default 'employe';
alter table public.employes add column if not exists actif boolean not null default true;
alter table public.employes add column if not exists created_at timestamptz not null default now();

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'employes_role_check') then
    alter table public.employes add constraint employes_role_check check (role in ('employe', 'admin')) not valid;
  end if;
end $$;

-- ---------- Table jobs ----------
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);
alter table public.jobs add column if not exists nom text;
alter table public.jobs add column if not exists client text;
alter table public.jobs add column if not exists adresse text;
alter table public.jobs add column if not exists actif boolean not null default true;
alter table public.jobs add column if not exists created_at timestamptz not null default now();

-- ---------- Table punchs ----------
create table if not exists public.punchs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- employe_id / job_id prennent le même type que les clés existantes (uuid ou bigint)
do $$
declare
  type_employe text;
  type_job text;
begin
  select format_type(atttypid, atttypmod) into type_employe
    from pg_attribute where attrelid = 'public.employes'::regclass and attname = 'id';
  select format_type(atttypid, atttypmod) into type_job
    from pg_attribute where attrelid = 'public.jobs'::regclass and attname = 'id';

  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'punchs' and column_name = 'employe_id') then
    execute format('alter table public.punchs add column employe_id %s references public.employes(id) on delete cascade', type_employe);
  end if;

  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'punchs' and column_name = 'job_id') then
    execute format('alter table public.punchs add column job_id %s references public.jobs(id) on delete set null', type_job);
  end if;
end $$;

alter table public.punchs add column if not exists type text;
alter table public.punchs add column if not exists horodatage timestamptz not null default now();
alter table public.punchs add column if not exists note text;
alter table public.punchs add column if not exists modifie_le timestamptz;
alter table public.punchs add column if not exists modifie_par uuid;
alter table public.punchs add column if not exists created_at timestamptz not null default now();

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'punchs_type_check') then
    alter table public.punchs add constraint punchs_type_check check (
      type in ('arrivee', 'debut_diner', 'fin_diner', 'debut_souper', 'fin_souper', 'changement_job', 'fin_journee')
    ) not valid;
  end if;
end $$;

create index if not exists punchs_employe_horodatage_idx on public.punchs (employe_id, horodatage desc);
create index if not exists punchs_horodatage_idx on public.punchs (horodatage desc);

-- ---------- Fonction : l'utilisateur courant est-il admin? ----------
create or replace function public.est_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.employes
    where user_id = auth.uid() and role = 'admin' and actif
  );
$$;

grant execute on function public.est_admin() to authenticated;

-- ---------- Lien automatique fiche employé <-> compte Auth (par courriel) ----------
create or replace function public.lier_employe_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.employes
     set user_id = new.id
   where user_id is null
     and lower(courriel) = lower(new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_lier_employe on auth.users;
create trigger on_auth_user_created_lier_employe
  after insert on auth.users
  for each row execute function public.lier_employe_auth();

update public.employes e
   set user_id = u.id
  from auth.users u
 where e.user_id is null
   and lower(e.courriel) = lower(u.email);

-- ---------- Droits ----------
revoke all on public.employes, public.jobs, public.punchs from anon;
grant select, insert, update, delete on public.employes, public.jobs, public.punchs to authenticated;

alter table public.employes enable row level security;
alter table public.jobs enable row level security;
alter table public.punchs enable row level security;

-- employes : chacun voit sa fiche, les admins voient et gèrent tout
drop policy if exists "employes_select" on public.employes;
create policy "employes_select" on public.employes for select to authenticated
  using (user_id = auth.uid() or public.est_admin());

drop policy if exists "employes_insert_admin" on public.employes;
create policy "employes_insert_admin" on public.employes for insert to authenticated
  with check (public.est_admin());

drop policy if exists "employes_update_admin" on public.employes;
create policy "employes_update_admin" on public.employes for update to authenticated
  using (public.est_admin()) with check (public.est_admin());

drop policy if exists "employes_delete_admin" on public.employes;
create policy "employes_delete_admin" on public.employes for delete to authenticated
  using (public.est_admin());

-- jobs : lecture pour tous les connectés, gestion par les admins
drop policy if exists "jobs_select" on public.jobs;
create policy "jobs_select" on public.jobs for select to authenticated using (true);

drop policy if exists "jobs_insert_admin" on public.jobs;
create policy "jobs_insert_admin" on public.jobs for insert to authenticated
  with check (public.est_admin());

drop policy if exists "jobs_update_admin" on public.jobs;
create policy "jobs_update_admin" on public.jobs for update to authenticated
  using (public.est_admin()) with check (public.est_admin());

drop policy if exists "jobs_delete_admin" on public.jobs;
create policy "jobs_delete_admin" on public.jobs for delete to authenticated
  using (public.est_admin());

-- punchs : l'employé voit ses punchs et ne peut punché qu'à l'heure actuelle
drop policy if exists "punchs_select" on public.punchs;
create policy "punchs_select" on public.punchs for select to authenticated
  using (
    public.est_admin()
    or employe_id in (select id from public.employes where user_id = auth.uid())
  );

drop policy if exists "punchs_insert" on public.punchs;
create policy "punchs_insert" on public.punchs for insert to authenticated
  with check (
    public.est_admin()
    or (
      employe_id in (select id from public.employes where user_id = auth.uid() and actif)
      and horodatage between now() - interval '5 minutes' and now() + interval '5 minutes'
    )
  );

drop policy if exists "punchs_update_admin" on public.punchs;
create policy "punchs_update_admin" on public.punchs for update to authenticated
  using (public.est_admin()) with check (public.est_admin());

drop policy if exists "punchs_delete_admin" on public.punchs;
create policy "punchs_delete_admin" on public.punchs for delete to authenticated
  using (public.est_admin());

-- ---------- Administrateurs : Éric et Nathalie ----------
update public.employes
   set role = 'admin'
 where nom ilike 'éric%' or nom ilike 'eric%' or nom ilike 'nathalie%';


-- ---------- GPS sur les punchs ----------
alter table public.punchs add column if not exists latitude double precision;
alter table public.punchs add column if not exists longitude double precision;
alter table public.punchs add column if not exists precision_gps double precision;

-- ---------- Photos début / fin de job ----------
create table if not exists public.photos_jobs (
  id uuid primary key default gen_random_uuid(),
  employe_id uuid references public.employes(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete cascade,
  type text not null check (type in ('debut','fin')),
  chemin text not null,
  horodatage timestamptz not null default now(),
  latitude double precision,
  longitude double precision,
  precision_gps double precision
);
alter table public.photos_jobs enable row level security;
grant select, insert, update, delete on public.photos_jobs to authenticated;
drop policy if exists "photos_select" on public.photos_jobs;
create policy "photos_select" on public.photos_jobs for select to authenticated using (
  public.est_admin() or employe_id in (select id from public.employes where user_id = auth.uid())
);
drop policy if exists "photos_insert" on public.photos_jobs;
create policy "photos_insert" on public.photos_jobs for insert to authenticated with check (
  public.est_admin() or employe_id in (select id from public.employes where user_id = auth.uid() and actif)
);

insert into storage.buckets (id, name, public) values ('photos-jobs', 'photos-jobs', false)
on conflict (id) do nothing;
drop policy if exists "photos_jobs_storage_insert" on storage.objects;
create policy "photos_jobs_storage_insert" on storage.objects for insert to authenticated
with check (bucket_id = 'photos-jobs');
drop policy if exists "photos_jobs_storage_select" on storage.objects;
create policy "photos_jobs_storage_select" on storage.objects for select to authenticated
using (bucket_id = 'photos-jobs');

-- ---------- Notifications administrateur ----------
create table if not exists public.notifications_admin (
  id uuid primary key default gen_random_uuid(),
  employe_id uuid references public.employes(id) on delete set null,
  job_id uuid references public.jobs(id) on delete set null,
  titre text not null,
  message text not null,
  horodatage timestamptz not null default now(),
  lue boolean not null default false
);
alter table public.notifications_admin enable row level security;
grant select, update on public.notifications_admin to authenticated;
drop policy if exists "notifications_admin_select" on public.notifications_admin;
create policy "notifications_admin_select" on public.notifications_admin for select to authenticated using (public.est_admin());
drop policy if exists "notifications_admin_update" on public.notifications_admin;
create policy "notifications_admin_update" on public.notifications_admin for update to authenticated using (public.est_admin()) with check (public.est_admin());

create or replace function public.notifier_admin_punch()
returns trigger language plpgsql security definer set search_path = public as $$
declare n text; j text;
begin
  select coalesce(nom, 'Employé') into n from public.employes where id = new.employe_id;
  select coalesce(nom, 'Job') into j from public.jobs where id = new.job_id;
  insert into public.notifications_admin(employe_id, job_id, titre, message)
  values (new.employe_id, new.job_id, 'Nouveau punch', n || ' — ' || replace(new.type, '_', ' ') || ' — ' || coalesce(j, 'Aucun job'));
  return new;
end; $$;
drop trigger if exists punch_notification_admin on public.punchs;
create trigger punch_notification_admin after insert on public.punchs for each row execute function public.notifier_admin_punch();

create or replace function public.notifier_admin_photo()
returns trigger language plpgsql security definer set search_path = public as $$
declare n text; j text;
begin
  select coalesce(nom, 'Employé') into n from public.employes where id = new.employe_id;
  select coalesce(nom, 'Job') into j from public.jobs where id = new.job_id;
  insert into public.notifications_admin(employe_id, job_id, titre, message)
  values (new.employe_id, new.job_id, 'Nouvelle photo', n || ' — photo ' || new.type || ' — ' || coalesce(j, 'Job'));
  return new;
end; $$;
drop trigger if exists photo_notification_admin on public.photos_jobs;
create trigger photo_notification_admin after insert on public.photos_jobs for each row execute function public.notifier_admin_photo();
