# CSE Studio V4 — CSE Thales LAS Massy

Application Web pour **préparer et exporter les diapositives d'activités** du CSE. Compatible avec [GitHub Pages](https://docs.github.com/fr/pages). V4 ajoute un **espace collaboratif facultatif** basé sur Supabase, avec authentification des bénévoles et approbation par rôle.

**Adresse habituelle du site :** https://mgresset.github.io/CSE_Massy/  
**Dépôt :** https://github.com/mGresset/CSE_Massy  
**Portail bénéficiaires :** https://cethaleslasmassy.portailce.com/

## 1. Nouveautés V4

- **Espace partagé facultatif** : les fiches deviennent accessibles aux bénévoles autorisés depuis plusieurs navigateurs. Le site reste hébergé sur GitHub Pages ; la base de données et l'authentification nécessitent un projet Supabase distinct.
- **Connexion par lien envoyé à l'adresse e-mail** des bénévoles déjà créés par l'administrateur.
- **Trois rôles réels en base de données** :
  - `editor` (Rédacteur) : créer, modifier et soumettre à relecture ; ne peut pas approuver.
  - `reviewer` (Relecteur) : consulter et approuver / renvoyer les fiches ; ne modifie pas les descriptions ni les tarifs.
  - `admin` (Administrateur) : créer, modifier, approuver et supprimer.
- **Concurrence contrôlée** : chaque fiche a un numéro de version. Un enregistrement ne peut pas écraser silencieusement une version modifiée par une autre personne.
- **Approbation nominative enregistrée dans la base** (`approved_by`, `approved_at`), avec déclassement automatique d'une fiche approuvée lorsqu'elle est modifiée.
- **Export d'un lot PowerPoint des activités approuvées dans la bibliothèque partagée** (25 maximum).
- **Photos allégées avant synchronisation** pour éviter des fiches trop volumineuses (les originaux restent dans le brouillon local du navigateur).
- **Compatibilité V3** : six templates, bandeau 1920 × 282, export PPTX, calcul T1–T10 et modes forfaitaires, export CSV/JSON et sauvegarde locale conservés.

### Important : deux types de sauvegarde

1. **Enregistrer** dans l'en-tête : sauvegarde dans le **navigateur local**.
2. **☁ Enregistrer en ligne** dans « Espace partagé » : sauvegarde dans la **base commune**, si elle a été configurée.

Pour les activités en ligne, utiliser « Ouvrir » dans la liste de la bibliothèque partagée, puis « Enregistrer en ligne ». Un clic sur « Synchroniser » récupère la dernière liste sans écraser la fiche en cours de modification.

## 2. Mettre le site V4 sur GitHub (fonctionne immédiatement en local)

1. Sur l'application V3, **sauvegarder la bibliothèque locale en JSON** si elle contient des fiches importantes. Le stockage local est normalement conservé car les clés n'ont pas changé, mais mieux vaut garder une copie.
2. Sur GitHub, télécharger aussi une copie du dépôt V3 (*Code → Download ZIP*).
3. Décompresser ce paquet V4 puis téléverser **le contenu** du dossier `CSE_Studio_V4_GitHub` à la racine du dépôt `CSE_Massy`.
4. Remplacer `index.html`, `styles.css`, `js/app.js`, `js/layouts.js`, `js/pricing.js`, `assets/`, `vendor/` ; **ajouter** `js/cloud.js`, `js/cloud-config.js` et `supabase/schema.sql`.
5. Cliquer **Commit changes**. GitHub Pages reste en mode **Deploy from a branch → main → /(root)**.
6. Sur https://mgresset.github.io/CSE_Massy/ faire `Ctrl + Maj + R` et vérifier l'étiquette **V4**. Le site fonctionnera immédiatement **sans Supabase**, en mode local.

**Ne publiez aucune donnée nominative de bénéficiaires, aucun mot de passe et aucune clé secrète dans le dépôt public.**

## 3. Activer les fonctions collaboratives (étape distincte)

### Étape A — Créer et sécuriser le projet Supabase

1. Créer un projet Supabase sur https://supabase.com/dashboard. Un projet Supabase est **nécessaire** pour la bibliothèque commune ; GitHub Pages seul ne stocke pas les fiches sur le serveur.
2. Dans **SQL Editor**, ouvrir et exécuter le fichier [`supabase/schema.sql`](supabase/schema.sql). Il crée les tables `cse_members` et `cse_activities`, des politiques **Row Level Security (RLS)** et un trigger de contrôle des rôles. **N'utilisez pas le SQL sur une base qui contient déjà des objets du même nom sans examen préalable.**
3. Dans **Authentication → URL Configuration**, ajouter :
   - **Site URL** : `https://mgresset.github.io/CSE_Massy/`
   - **Redirect URL** : `https://mgresset.github.io/CSE_Massy/`
4. Dans **Authentication → Users**, créer ou inviter les bénévoles. L'application ne crée pas de comptes par elle-même (`create_user: false`) : c'est voulu pour éviter l'inscription libre.
5. Dans **SQL Editor**, attribuer le rôle `admin` au premier compte déjà présent dans Auth Users (remplacer l'adresse e-mail) :

```sql
insert into public.cse_members(user_id, role)
select id, 'admin' from auth.users where lower(email) = lower('votre-adresse@exemple.fr')
on conflict (user_id) do update set role = excluded.role;
```

Pour ajouter un bénévole qui peut rédiger :

```sql
insert into public.cse_members(user_id, role)
select id, 'editor' from auth.users where lower(email) = lower('benevole@exemple.fr')
on conflict (user_id) do update set role = excluded.role;
```

Pour un responsable chargé de valider les fiches, utiliser `reviewer`. Le compte doit exister dans **Authentication → Users** avant l'attribution du rôle. Il est conseillé de créer un compte test de chaque rôle et de vérifier les autorisations avec plusieurs sessions, avant de l'utiliser en production.

### Étape B — Brancher le site sur la base

1. Dans les paramètres du projet Supabase, repérer l'**URL du projet** et la clé **publishable / anon** (clé publique utilisable par un navigateur).
2. Ouvrir CSE Studio V4, puis **Espace partagé → Configurer l'espace partagé**.
3. Copier l'URL (ex. `https://xxx.supabase.co`) et **uniquement la clé publique**. Ne jamais coller une clé `service_role` ou `sb_secret_...`.
4. Cliquer **Enregistrer la configuration**. Renseigner l'adresse e-mail d'un compte autorisé, puis cliquer **Recevoir un lien de connexion**.
5. Ouvrir le lien reçu par e-mail : le retour doit se faire sur votre application GitHub Pages. Les rôles seront ensuite récupérés depuis `cse_members`.

Pour éviter à chaque bénévole de saisir l'URL et la clé publique, il est possible de modifier `js/cloud-config.js` dans le dépôt :

```js
window.CSE_CLOUD_CONFIG = {
  url: 'https://VOTRE-PROJET.supabase.co',
  key: 'sb_publishable_VOTRE_CLE_PUBLIQUE'
};
```

**Cette clé est publique par conception et ne remplace pas les politiques RLS.** Ne jamais y utiliser de clé de service, de mot de passe ou de jeton d'utilisateur.

### Étape C — Utiliser les fiches partagées

1. **Rédacteur :** ouvrir une fiche partagée ou créer une nouvelle activité. Modifier les informations, cliquer **☁ Enregistrer en ligne** puis **Soumettre à relecture**.
2. **Relecteur :** synchroniser, cliquer **Ouvrir** sur une fiche « À relire », vérifier et cliquer **Approuver en ligne**. L'identité du valideur est enregistrée par la base.
3. **Bénévole responsable de la publication :** cliquer **PPTX groupé des fiches approuvées en ligne**, puis importer le fichier dans Canva et le vérifier visuellement.
4. **En cas de conflit :** si la fiche a été modifiée par quelqu'un d'autre, l'enregistrement en ligne est refusé. Exporter sa copie locale en JSON avant de recharger la version commune, puis comparer et réappliquer les modifications utiles.

## 4. Dépendances et sécurité

- **GitHub Pages :** héberge une application statique publique ; aucun accès administrateur Github n'est nécessaire pour utiliser le site déjà publié.
- **Supabase :** stocke les activités et gère les sessions des membres autorisés. Les permissions sont imposées par PostgreSQL avec RLS et trigger. **Ne pas retirer la RLS**, même si des boutons sont grisés dans l'interface.
- **Compte navigateur :** jeton de session Supabase conservé dans `sessionStorage` (effacé à la fermeture de l'onglet/session). Les paramètres publics URL et clé sont conservés dans `localStorage`.
- **Photos :** insérées dans le JSON d'activité après réduction côté navigateur. Éviter les photos comportant des données personnelles ; pour beaucoup de visuels, une évolution ultérieure vers Supabase Storage privé sera préférable.
- **Authentification :** le lien magique dépend des paramètres SMTP, modèles d'e-mail et limites d'envoi Supabase. Pour un déploiement à plusieurs bénévoles, configurer un service SMTP approprié.
- **Tarifs :** le barème T1–T10 par défaut reste **une hypothèse à confirmer** (70, 65, 60, 55, 50, 45, 40, 35, 30, 25 % de subvention). Ne pas publier de tarifs sans validation humaine.
- **Canva :** la V4 n'édite pas directement les planches sur canva.link ; elle produit un PPTX modifiable à importer. Up Expert/Kalidea reste l'outil de gestion des inscriptions, accessible par lien vers le portail CSE ou lien personnalisé.

## 5. Tests et limites

Tests automatisés locaux réalisés :

```bash
node tests/pricing.test.js
node tests/layouts.test.js
```

Tests navigateur réalisés avec simulation des réponses Supabase : affichage des **six modèles**, création d'un PPTX, chargement de la bibliothèque, création en ligne simulée, approbation et passage à « À relire » après modification. **Aucun véritable projet Supabase CSE n'a été connecté ni testé dans ce paquet :** il faudra tester l'authentification réelle, les RLS et les trois profils après configuration.

**Restrictions :** pas d'édition directe Canva ni de connexion API Up Expert ; pas de synchronisation hors connexion ; stocker un très grand nombre de photos en base JSON n'est pas la solution idéale à long terme ; il n'y a pas encore de journal d'audit complet de chaque modification.

## 6. Structure du projet

- `index.html`, `styles.css` : interface V4 et six templates.
- `js/pricing.js`, `js/layouts.js`, `js/app.js` : fonctionnement local, tarifs et génération PPTX.
- `js/cloud.js`, `js/cloud-config.js` : connexion facultative Supabase, bibliothèque partagée et workflow.
- `supabase/schema.sql` : création et sécurité des tables.
- `assets/`, `vendor/`, `tests/`, `docs/` : bandeau CSE HD, ressources, bibliothèques PPTX et tests.
