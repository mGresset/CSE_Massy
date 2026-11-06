# CSE Studio V5 — Lien Canva & publication dans une présentation existante

Cette version conserve toutes les fonctionnalités V4 (6 modèles, bandeau haute qualité, tarifs T1–T10, validations et bibliothèque Supabase facultative) et ajoute la préparation à la **publication automatique d'une diapositive dans un design Canva existant**.

**Site** : https://mgresset.github.io/CSE_Massy/  
**Dépôt** : https://github.com/mGresset/CSE_Massy  
**Lien Canva test proposé** : https://canva.link/rewv8gx5iilr8kz

## Ce qui fonctionne dès l'installation

- Champ **Lien de la présentation Canva**, mémorisé dans le navigateur ; une URL `canva.link` ou `canva.com` peut être saisie.
- Bouton **Ouvrir Canva**, qui mène au lien mémorisé.
- Champ séparé **ID du design Canva** pour la future API : il doit correspondre à l'ID du document cible configuré par l'administrateur. Un lien raccourci `canva.link` ne permet pas d'extraire cet ID de façon fiable.
- Export PPTX et six templates V4 inchangés. Sauvegardes V4 et rôles Supabase conservés.
- Bouton **Ajouter la diapositive à Canva** avec contrôle explicite de configuration et messages d'erreur. Aucune réussite n'est affichée sans confirmation de la réponse Canva.

**Attention :** copier une URL Canva éditable par des invités **n'autorise pas automatiquement** un autre logiciel à modifier ce design. Le lien n'est **pas** une clé d'API. L'insertion réellement automatique demande les étapes de configuration ci-dessous, et n'a pas pu être validée avec le compte Canva du CSE (non connecté pendant le développement).

## 1. Publier la V5 sur GitHub Pages

1. Faire une copie de sauvegarde du dépôt actuel et exporter les activités locales en JSON, si nécessaire.
2. Transférer **tout le contenu** du présent dossier à la racine du dépôt GitHub `CSE_Massy`, en remplaçant les fichiers de la V4.
3. Vérifier que le nouveau fichier `js/canva-publish.js` est présent et que `index.html` porte la mention **V5**.
4. Valider avec **Commit changes**. GitHub Pages reste `main` / `/(root)`.
5. Actualiser le site avec `Ctrl + Maj + R`.

À ce stade : **préparation du lien et export PPTX** uniquement. Le clic « Ajouter » n'insérera aucune page sans configuration du serveur Canva.

## 2. Vérifier l'éligibilité Canva avant tout paramétrage

Canva a introduit les **service apps** (applications de service) le 6 novembre 2026. Elles peuvent appeler les API sans connexion Canva des bénévoles :

- il faut une équipe Canva **Business, Teams ou Nonprofit** ;
- l'administrateur Canva doit disposer de la MFA ou d'une connexion SSO ;
- l'équipe ne peut avoir qu'une application de service ;
- les requêtes utilisent des crédits d'API potentiellement payants ;
- l'API **Merges / insert_pages**, nécessaire pour ajouter une page à un design existant, est encore **en version preview** et son comportement peut évoluer.

Sources officielles :
- https://www.canva.dev/docs/apps/quickstart/
- https://www.canva.dev/docs/apps/rest-apis/authentication/
- https://www.canva.dev/docs/apps/rest-apis/reference/design-imports/create-design-import-job/
- https://www.canva.dev/docs/apps/rest-apis/reference/merges/create-design-merge-job/

**Point à confirmer avant mise en production :** l'application de service Canva doit pouvoir accéder au **design de destination CSE**. Le droit d'édition par lien destiné aux invités ne garantit pas les droits API de ce service.

## 3. Obtenir l'ID du design cible

1. Ouvrir la présentation cible dans Canva, idéalement depuis le compte propriétaire du CSE.
2. Copier l'adresse **complète de l'éditeur** ressemblant à `https://www.canva.com/design/DAFxxxxxxxx/edit`.
3. La portion `DAFxxxxxxxx` est l'ID. **Ne pas confondre cet ID avec le lien court canva.link.**
4. Reporter cet ID dans le champ « ID du design Canva » de CSE Studio, puis cliquer sur **Mémoriser**.
5. Faire configurer **le même ID** dans le secret Supabase `CANVA_TARGET_DESIGN_ID` ; le serveur refusera toute autre destination.

Le lien public `canva.link` sera conservé pour le bouton Ouvrir Canva et pour les bénévoles n'ayant pas de compte ; l'API travaille avec l'ID et des autorisations distinctes.

## 4. Créer une application de service Canva

Dans le portail développeur Canva, créer une **service app** (« No Canva sign-in required ») si le compte est éligible. Autoriser les scopes de service requis par les endpoints de **design import** et **merges**, notamment :

- `service:design:content:write`
- `service:design:meta:read`

Récupérer les **Client ID** et **Client Secret** dans un gestionnaire de secrets. **Ne jamais les mettre dans GitHub, index.html, cloud-config.js ou dans les champs du navigateur.**

## 5. Déployer la fonction serveur Supabase (obligatoire pour l'ajout automatique)

La V5 réutilise **le même projet Supabase V4**, avec le schéma `supabase/schema.sql` et les rôles `cse_members`.

Installer la CLI Supabase (ou demander à l'administrateur technique) et se connecter au projet Supabase :

```bash
supabase login
supabase link --project-ref VOTRE_PROJECT_REF
supabase secrets set CANVA_CLIENT_ID=VOTRE_ID CANVA_CLIENT_SECRET=VOTRE_SECRET CANVA_TARGET_DESIGN_ID=DAFxxxxxxxx CSE_ALLOWED_ORIGIN=https://mgresset.github.io
supabase functions deploy canva-publish
```

Les variables Supabase `SUPABASE_URL` et `SUPABASE_ANON_KEY` sont normalement fournies à la fonction dans le projet. Si le projet utilise un mode de clés différent, adapter la fonction et la configuration Supabase.

**Ne jamais mettre les vraies valeurs dans ce README ou dans le dépôt public.** Les exemples ci-dessus sont des placeholders.

### Sécurité et déroulement

Le site utilise la connexion Supabase de la V4 pour identifier le bénévole. Il ne peut appeler la fonction serveur de publication que s'il :

1. est connecté à Supabase ;
2. possède le rôle `reviewer` ou `admin` ;
3. a ouvert une fiche **approuvée et synchronisée** dans la bibliothèque partagée.

La fonction vérifie elle-même l'identité, le rôle, la version et le statut de l'activité dans Supabase. Elle accepte uniquement le `CANVA_TARGET_DESIGN_ID` autorisé, puis :

1. importe le PowerPoint comme **nouveau design Canva** ;
2. attend la fin de l'import ;
3. lance un **merge `modify_existing_design` / `insert_pages`** sans `after_page_number` (ajout à la fin) ;
4. attend la confirmation Canva et propose de vérifier la planche cible.

Le lien de partage public n'est jamais utilisé comme jeton d'autorisation. Les secrets sont utilisés exclusivement dans la fonction serveur.

### Limites importantes

- **Non testé de bout en bout avec le compte Canva du CSE** : il faudra d'abord tester sur une présentation *de test* avant d'autoriser une publication sur les planches officielles.
- L'API `merges` étant **preview**, Canva peut refuser l'opération pour l'application ou l'équipe. En cas de refus, conserver le flux **Exporter PowerPoint → importer dans Canva**.
- L'import PPTX dans Canva peut nécessiter des ajustements de mise en page ou de polices. Une vérification humaine avant diffusion reste nécessaire.
- L'app n'empêche pas encore toutes les publications en doublon si deux validateurs publient la même fiche simultanément. Vérifier le document cible avant de retenter en cas de délai d'attente.
- Le lien Canva test fourni n'a pas pu être inspecté avec un accès éditeur API ; sa compatibilité avec les droits du service reste à confirmer.
- Le site GitHub Pages est **statique et public** ; la fonction Supabase est responsable de la sécurité et de l'authentification. **Ne pas** exposer des activités internes ni des données personnelles dans le dépôt.

## Fichiers V5

- `index.html` / `styles.css` : panneau de publication Canva.
- `js/canva-publish.js` : destination, validations, dialogue avec Supabase.
- `js/app.js` : génération en mémoire d'un PPTX modifiable (en plus de l'export fichier existant).
- `js/cloud.js` : récupération sécurisée du contexte utilisateur en ligne.
- `supabase/functions/canva-publish/index.ts` : fonction serveur, authentification, import PPTX et merge Canva.
- `supabase/schema.sql` : reprend la base de données de la V4 (ne pas réexécuter sans précaution sur une base déjà en production).
- `assets/`, `vendor/`, `tests/` : modèles existants, images et bibliothèques.

## Tests locaux effectués et tests restant à faire

Vérification de syntaxe JavaScript, affichage du panneau V5, persistance du lien Canva, conservation des six templates, export PPTX en mémoire et refus explicite d'une publication non configurée. Les appels vers l'API Canva et le projet Supabase du CSE n'ont **pas** pu être testés sans accès autorisés.
