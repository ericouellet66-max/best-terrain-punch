-- B.E.S.T. Terrain : lecture pour le sous-administrateur (Nathalie).
-- À exécuter dans Supabase SQL Editor une seule fois.
-- Aucune suppression ni modification des fiches ou des punchs existants.

create or replace function public.est_sous_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.employes
    where user_id = auth.uid()
      and role = 'sous_admin'
      and actif = true
  );
$$;

grant execute on function public.est_sous_admin() to authenticated;

-- Nathalie doit voir Éric et les autres employés dans les listes.
drop policy if exists "employes_select_sous_admin" on public.employes;
create policy "employes_select_sous_admin"
on public.employes for select to authenticated
using (public.est_sous_admin());

-- Affichage des punchs de l'équipe, notamment dans Historique et En direct.
drop policy if exists "punchs_select_sous_admin" on public.punchs;
create policy "punchs_select_sous_admin"
on public.punchs for select to authenticated
using (public.est_sous_admin() and employeur = 'best');

-- Autoriser Nathalie à puncher pour l'équipe, seulement chez B.E.S.T. Terrain.
drop policy if exists "punchs_insert_sous_admin_best" on public.punchs;
create policy "punchs_insert_sous_admin_best"
on public.punchs for insert to authenticated
with check (
  public.est_sous_admin()
  and employeur = 'best'
  and employe_id in (select id from public.employes where actif = true)
  and horodatage between now() - interval '5 minutes' and now() + interval '5 minutes'
);
