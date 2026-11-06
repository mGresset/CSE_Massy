-- Migration V6 à exécuter dans le SQL Editor sur les projets Supabase V4/V5 déjà installés.
-- Adapte les contrôles serveur à la tarification facultative et aux modèles Informations / Programme.
-- Ne modifie aucune activité existante ni les rôles.

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
