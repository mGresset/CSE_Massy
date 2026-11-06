-- CSE Studio V6 — installation initiale dans SQL Editor Supabase. Voir v6_migration.sql pour une instance V4/V5 existante.
-- Ne jamais exposer la clé service_role dans les fichiers du site.
-- Création des tables et verrouillage RLS. Rôles : editor, reviewer, admin.

create schema if not exists private;

create table if not exists public.cse_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('editor','reviewer','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.cse_activities (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 180),
  payload jsonb not null default '{}'::jsonb,
  editorial_status text not null default 'draft' check (editorial_status in ('draft','review','approved')),
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version >= 1),
  approved_by uuid references auth.users(id),
  approved_at timestamptz
);
create index if not exists cse_activities_updated_idx on public.cse_activities(updated_at desc);
create index if not exists cse_activities_status_idx on public.cse_activities(editorial_status);

-- Fonction protégée non exposée par l'API : évite la récursion RLS.
create or replace function private.cse_current_role()
returns text language sql stable security definer set search_path = '' as $$
 select m.role from public.cse_members m where m.user_id = auth.uid() limit 1
$$;
revoke all on function private.cse_current_role() from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.cse_current_role() to authenticated;

-- Cette fonction impose les permissions EN BASE, indépendamment du JavaScript public.
create or replace function private.cse_guard_activity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  r text := private.cse_current_role();
  price text;
begin
  if actor is null or r is null then
    raise exception 'Accès refusé : membre CSE non autorisé';
  end if;
  if new.payload is null or jsonb_typeof(new.payload) <> 'object' then
    raise exception 'Fiche activité invalide';
  end if;
  if tg_op = 'INSERT' then
    if r not in ('editor','admin') then raise exception 'Création réservée aux rédacteurs'; end if;
    if new.editorial_status = 'approved' then raise exception 'Une nouvelle fiche ne peut pas être approuvée directement'; end if;
    new.created_by := actor;
    new.updated_by := actor;
    new.version := 1;
    new.updated_at := now();
    new.approved_by := null;
    new.approved_at := null;
  else
    if r not in ('editor','reviewer','admin') then raise exception 'Modification interdite'; end if;
    if new.id is distinct from old.id or new.created_by is distinct from old.created_by then
      raise exception 'Identifiant et auteur non modifiables';
    end if;
    if r = 'reviewer' and (
      new.title is distinct from old.title
      or (new.payload - 'editorialStatus') is distinct from (old.payload - 'editorialStatus')
    ) then raise exception 'Le relecteur ne peut changer que le statut éditorial'; end if;
    if r = 'editor' and new.editorial_status = 'approved' then
      raise exception 'Approbation réservée au relecteur ou administrateur';
    end if;
    if old.editorial_status = 'approved' and
       (new.title is distinct from old.title or
        (new.payload - 'editorialStatus') is distinct from (old.payload - 'editorialStatus')) and
       new.editorial_status = 'approved' then
      new.editorial_status := 'review';
    end if;
    new.version := old.version + 1;
    new.updated_by := actor;
    new.updated_at := now();
  end if;
  if new.editorial_status = 'approved' then
    if r not in ('reviewer','admin') then raise exception 'Approbation interdite'; end if;
    price := new.payload ->> 'outsidePrice';
    if length(btrim(new.title)) = 0 then
      raise exception 'Titre obligatoire pour approbation';
    end if;
    -- La V6 permet des informations et des annonces sans tarification.
    -- Les anciennes fiches sans showPricing restent soumises à la règle historique.
    if coalesce(new.payload->>'showPricing','true') = 'true' and
       (price is null or price !~ '^[0-9]+(\.[0-9]+)?$') then
      raise exception 'Prix extérieur obligatoire lorsque les tarifs sont activés';
    end if;
    -- Une information ou un agenda collectif n'ont pas besoin de date propre.
    if coalesce(new.payload->>'template','classic') not in ('info','upcoming') and
       coalesce(new.payload->>'activityStart','') = '' then
      raise exception 'Date de début obligatoire pour cette activité';
    end if;
    if coalesce(new.payload->>'activityEnd','') <> '' and new.payload->>'activityEnd' < new.payload->>'activityStart' then
      raise exception 'Dates incohérentes';
    end if;
    if coalesce(new.payload->>'registrationStart','') <> '' and coalesce(new.payload->>'registrationEnd','') <> '' and
       new.payload->>'registrationEnd' < new.payload->>'registrationStart' then
      raise exception 'Dates d’inscription incohérentes';
    end if;
    if coalesce(new.payload->>'minimum','') <> '' and coalesce(new.payload->>'maximum','') <> '' and
       (new.payload->>'minimum')::numeric > (new.payload->>'maximum')::numeric then
      raise exception 'Nombre de participants incohérent';
    end if;
    if coalesce(new.payload->>'linkType','') = 'custom' and
       coalesce(new.payload->>'customUrl','') !~ '^https?://[^ ]+' then
      raise exception 'Lien personnalisé invalide';
    end if;
    if tg_op = 'INSERT' or old.editorial_status <> 'approved' then
      new.approved_by := actor;
      new.approved_at := now();
    else
      -- Le client ne peut pas falsifier le nom du valideur ou sa date.
      new.approved_by := old.approved_by;
      new.approved_at := old.approved_at;
    end if;
  else
    new.approved_by := null;
    new.approved_at := null;
  end if;
  -- On ne fait confiance qu'au statut stocké dans la colonne protégée.
  new.payload := jsonb_set(new.payload, '{editorialStatus}', to_jsonb(new.editorial_status), true);
  return new;
end;
$$;
revoke all on function private.cse_guard_activity() from public, anon, authenticated;

drop trigger if exists cse_guard_trigger on public.cse_activities;
create trigger cse_guard_trigger before insert or update on public.cse_activities
for each row execute function private.cse_guard_activity();

alter table public.cse_members enable row level security;
alter table public.cse_activities enable row level security;
revoke all on public.cse_members from anon, authenticated;
revoke all on public.cse_activities from anon, authenticated;
grant select on public.cse_members to authenticated;
grant select, insert, update, delete on public.cse_activities to authenticated;

drop policy if exists cse_members_self on public.cse_members;
create policy cse_members_self on public.cse_members for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists cse_activities_read on public.cse_activities;
create policy cse_activities_read on public.cse_activities for select to authenticated
using ((select private.cse_current_role()) in ('editor','reviewer','admin'));

drop policy if exists cse_activities_create on public.cse_activities;
create policy cse_activities_create on public.cse_activities for insert to authenticated
with check ((select private.cse_current_role()) in ('editor','admin') and created_by = (select auth.uid()));

drop policy if exists cse_activities_update on public.cse_activities;
create policy cse_activities_update on public.cse_activities for update to authenticated
using ((select private.cse_current_role()) in ('editor','reviewer','admin'))
with check ((select private.cse_current_role()) in ('editor','reviewer','admin'));

drop policy if exists cse_activities_delete on public.cse_activities;
create policy cse_activities_delete on public.cse_activities for delete to authenticated
using ((select private.cse_current_role()) = 'admin');

-- Ajouter le 1er admin APRES avoir créé son utilisateur dans Authentication > Users :
-- insert into public.cse_members(user_id, role)
-- select id, 'admin' from auth.users where email = 'ADMIN@EXEMPLE.FR'
-- on conflict (user_id) do update set role = excluded.role;
-- Pour les autres membres, remplacer 'admin' par 'editor' ou 'reviewer'.
-- Tester les refus / permissions avec des utilisateurs distincts avant diffusion.
