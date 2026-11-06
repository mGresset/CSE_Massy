-- CSE Studio V9 — migration Supabase FACULTATIVE (espace partagé entre bénévoles).
-- À exécuter dans SQL Editor APRÈS supabase/schema.sql (installation initiale V6) ou sur une instance V4–V8.
-- Effets :
--   1. contrôles serveur des fiches compatibles avec le format V9 (et toujours avec l'ancien format) ;
--   2. table cse_documents : paramètres + catégories (administrateur) et MEL partagés (rédacteurs) ;
--   3. journal des modifications cse_changes (lecture : relecteurs et administrateurs) ;
--   4. verrou optimiste : chaque écriture incrémente la version (le client écrit avec version=eq.N).
-- Ne modifie ni les fiches existantes ni les rôles. Aucune clé service_role ne doit être utilisée côté navigateur.
-- NB : script fourni sans avoir pu être exécuté contre une instance réelle par l'auteur : le tester d'abord
--      sur un projet Supabase de test avec trois comptes (rédacteur, relecteur, administrateur).

-- 1. Contrôles des fiches -------------------------------------------------------------
create or replace function private.cse_guard_activity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  r text := private.cse_current_role();
  v9 boolean := new.payload ? 'type';
  price text;
begin
  if actor is null or r is null then raise exception 'Accès refusé : membre CSE non autorisé'; end if;
  if new.payload is null or jsonb_typeof(new.payload) <> 'object' then raise exception 'Fiche invalide'; end if;
  if pg_column_size(new.payload) > 8 * 1024 * 1024 then raise exception 'Fiche trop volumineuse (images) : réduire les photos'; end if;
  if tg_op = 'INSERT' then
    if r not in ('editor','admin') then raise exception 'Création réservée aux rédacteurs'; end if;
    if new.editorial_status = 'approved' then raise exception 'Une nouvelle fiche ne peut pas être approuvée directement'; end if;
    new.created_by := actor; new.updated_by := actor; new.version := 1; new.updated_at := now();
    new.approved_by := null; new.approved_at := null;
  else
    if new.id is distinct from old.id or new.created_by is distinct from old.created_by then
      raise exception 'Identifiant et auteur non modifiables';
    end if;
    if r = 'reviewer' and (new.title is distinct from old.title
        or (new.payload - 'editorialStatus' - 'updatedAt') is distinct from (old.payload - 'editorialStatus' - 'updatedAt')) then
      raise exception 'Le relecteur ne peut changer que le statut éditorial';
    end if;
    if r = 'editor' and new.editorial_status = 'approved' and old.editorial_status <> 'approved' then
      raise exception 'Approbation réservée au relecteur ou administrateur';
    end if;
    -- Toute modification de contenu d'une fiche approuvée la renvoie en relecture.
    if old.editorial_status = 'approved' and new.editorial_status = 'approved' and
       (new.title is distinct from old.title or (new.payload - 'editorialStatus' - 'updatedAt') is distinct from (old.payload - 'editorialStatus' - 'updatedAt')) then
      new.editorial_status := 'review';
    end if;
    new.version := old.version + 1; new.updated_by := actor; new.updated_at := now();
  end if;
  if new.editorial_status = 'approved' then
    if r not in ('reviewer','admin') and (tg_op = 'INSERT' or old.editorial_status <> 'approved') then raise exception 'Approbation interdite'; end if;
    if length(btrim(new.title)) = 0 then raise exception 'Titre obligatoire pour approbation'; end if;
    if v9 then
      if coalesce(new.payload->'pricing'->>'enabled','false') = 'true'
         and coalesce(new.payload->'pricing'->>'mode','tranches') in ('tranches','subsidy','participation')
         and coalesce(new.payload->'pricing'->>'outside','') !~ '^[0-9]+([.,][0-9]+)?$' then
        raise exception 'Prix extérieur obligatoire pour ce mode de tarif';
      end if;
      if new.payload->>'type' = 'activity' and coalesce(new.payload->>'dateStart','') = '' and coalesce(new.payload->>'editorial','') <> 'permanent' then
        raise exception 'Date de début obligatoire pour une activité';
      end if;
      if coalesce(new.payload->>'dateEnd','') <> '' and coalesce(new.payload->>'dateStart','') <> '' and new.payload->>'dateEnd' < new.payload->>'dateStart' then
        raise exception 'Dates incohérentes';
      end if;
      if coalesce(new.payload->>'regStart','') <> '' and coalesce(new.payload->>'regEnd','') <> '' and new.payload->>'regEnd' < new.payload->>'regStart' then
        raise exception 'Dates d’inscription incohérentes';
      end if;
      if coalesce(new.payload->'link'->>'type','') = 'custom' and coalesce(new.payload->'link'->>'url','') <> ''
         and new.payload->'link'->>'url' !~ '^https?://[^ ]+$' then
        raise exception 'Lien personnalisé invalide';
      end if;
    else
      -- Ancien format V4–V8 : règles historiques.
      price := new.payload ->> 'outsidePrice';
      if coalesce(new.payload->>'showPricing','true') = 'true' and (price is null or price !~ '^[0-9]+(\.[0-9]+)?$') then
        raise exception 'Prix extérieur obligatoire lorsque les tarifs sont activés';
      end if;
    end if;
    if tg_op = 'INSERT' or old.editorial_status <> 'approved' then new.approved_by := actor; new.approved_at := now();
    else new.approved_by := old.approved_by; new.approved_at := old.approved_at; end if;
  else
    new.approved_by := null; new.approved_at := null;
  end if;
  new.payload := jsonb_set(new.payload, '{editorialStatus}', to_jsonb(new.editorial_status), true);
  return new;
end;
$$;
revoke all on function private.cse_guard_activity() from public, anon, authenticated;

-- 2. Documents partagés ----------------------------------------------------------------
create table if not exists public.cse_documents (
  id text primary key check (id ~ '^(settings|issue:[A-Za-z0-9_-]{4,80})$'),
  kind text not null check (kind in ('settings','issue')),
  payload jsonb not null default '{}'::jsonb,
  version integer not null default 1 check (version >= 1),
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now()
);

create or replace function private.cse_guard_document()
returns trigger language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); r text := private.cse_current_role();
begin
  if actor is null or r is null then raise exception 'Accès refusé : membre CSE non autorisé'; end if;
  if jsonb_typeof(new.payload) <> 'object' then raise exception 'Document invalide'; end if;
  if (new.kind = 'settings') <> (new.id = 'settings') then raise exception 'Type de document incohérent'; end if;
  if new.kind = 'settings' and r <> 'admin' then raise exception 'Paramètres et catégories : réservé à l’administrateur'; end if;
  if new.kind = 'issue' and r not in ('editor','admin') then raise exception 'MEL : réservé aux rédacteurs'; end if;
  if tg_op = 'INSERT' then new.created_by := actor; new.version := 1;
  else
    if new.id is distinct from old.id or new.kind is distinct from old.kind or new.created_by is distinct from old.created_by then raise exception 'Identifiant non modifiable'; end if;
    new.version := old.version + 1;
  end if;
  new.updated_by := actor; new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.cse_guard_document() from public, anon, authenticated;
drop trigger if exists cse_guard_document_trigger on public.cse_documents;
create trigger cse_guard_document_trigger before insert or update on public.cse_documents
for each row execute function private.cse_guard_document();

alter table public.cse_documents enable row level security;
revoke all on public.cse_documents from anon, authenticated;
grant select, insert, update, delete on public.cse_documents to authenticated;
drop policy if exists cse_documents_read on public.cse_documents;
create policy cse_documents_read on public.cse_documents for select to authenticated
using ((select private.cse_current_role()) in ('editor','reviewer','admin'));
drop policy if exists cse_documents_write on public.cse_documents;
create policy cse_documents_write on public.cse_documents for insert to authenticated
with check ((select private.cse_current_role()) = 'admin' or ((select private.cse_current_role()) = 'editor' and kind = 'issue'));
drop policy if exists cse_documents_update on public.cse_documents;
create policy cse_documents_update on public.cse_documents for update to authenticated
using ((select private.cse_current_role()) = 'admin' or ((select private.cse_current_role()) = 'editor' and kind = 'issue'))
with check ((select private.cse_current_role()) = 'admin' or ((select private.cse_current_role()) = 'editor' and kind = 'issue'));
drop policy if exists cse_documents_delete on public.cse_documents;
create policy cse_documents_delete on public.cse_documents for delete to authenticated
using ((select private.cse_current_role()) = 'admin');

-- 3. Journal des modifications ----------------------------------------------------------
create table if not exists public.cse_changes (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,
  table_name text not null,
  row_id text not null,
  action text not null,
  version integer,
  editorial_status text
);
create or replace function private.cse_log_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.cse_changes(actor, table_name, row_id, action, version, editorial_status)
  values (auth.uid(), tg_table_name, coalesce((case when tg_op = 'DELETE' then old.id else new.id end)::text, '?'), tg_op,
          case when tg_op = 'DELETE' then old.version else new.version end,
          case when tg_table_name = 'cse_activities' then (case when tg_op = 'DELETE' then old.editorial_status else new.editorial_status end) else null end);
  return null;
end;
$$;
revoke all on function private.cse_log_change() from public, anon, authenticated;
drop trigger if exists cse_log_activities on public.cse_activities;
create trigger cse_log_activities after insert or update or delete on public.cse_activities for each row execute function private.cse_log_change();
drop trigger if exists cse_log_documents on public.cse_documents;
create trigger cse_log_documents after insert or update or delete on public.cse_documents for each row execute function private.cse_log_change();

alter table public.cse_changes enable row level security;
revoke all on public.cse_changes from anon, authenticated;
grant select on public.cse_changes to authenticated;
drop policy if exists cse_changes_read on public.cse_changes;
create policy cse_changes_read on public.cse_changes for select to authenticated
using ((select private.cse_current_role()) in ('reviewer','admin'));

-- Vérifications conseillées (avec trois comptes distincts) :
--  * un rédacteur crée une fiche, ne peut pas l'approuver ; un relecteur l'approuve sans pouvoir modifier son contenu ;
--  * deux bénévoles modifient la même fiche : la seconde écriture (version périmée) ne met à jour aucune ligne ;
--  * un rédacteur ne peut pas modifier le document « settings » ; seul l'administrateur supprime.
