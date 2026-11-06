# CSE Studio V6 — Éditeur de slides CSE Thales LAS Massy

**Site cible :** https://mgresset.github.io/CSE_Massy/  
**Dépot :** https://github.com/mGresset/CSE_Massy

Application statique pour GitHub Pages, avec export PowerPoint modifiable. Le bandeau CSE envoyé par l'utilisateur est utilisé sur toutes les diapositives. Cette version conserve la configuration facultative Supabase (bibliothèque partagée) et les préparatifs d'intégration Canva de la V5.

## Nouveautés V6

### Catégories

Quatorze catégories, avec **Informations en premier** :

1. Informations
2. Voyages
3. Week-ends
4. Animations
5. Sorties culturelles
6. Musiques
7. Œnologie
8. Sport
9. Randonnées
10. Sports mécaniques
11. Parapentes
12. Couture
13. Dessins
14. La Ruche

Dans **Présentation et programme**, saisissez un nom dans « Gérer les catégories » puis **+ Ajouter**. Une catégorie créée est enregistrée dans `localStorage` (`cse-studio-massy:v6:categories`), et sera disponible sur ce navigateur lors des prochaines visites. **Supprimer la sélection** efface une catégorie du catalogue, sauf si des activités locales enregistrées l'utilisent encore : modifiez d'abord ces fiches pour éviter de laisser des références orphelines. Les catégories personnalisées figurent également dans l'export de bibliothèque JSON et sont récupérées lors de son import.

**Important** : le catalogue de catégories est **local au navigateur**. Il n'est pas encore automatiquement synchronisé via Supabase entre les bénévoles. Pour le répliquer sur un autre appareil, exportez puis importez la bibliothèque JSON. Les activités, elles, peuvent toujours être stockées dans la bibliothèque collaborative Supabase V4/V5.

### Cinq dispositions de slides

- **Classique** : fiche complète en trois colonnes.
- **Immersif** : photo principale et présentation de l'activité.
- **Informations** : annonce de service, communication CSE ou procédure.
- **Essentiel** : message court et dates clés.
- **Activités à venir** : agenda collectif généré automatiquement à partir des **huit prochaines activités validées et datées de la bibliothèque locale** (`activityStart` >= date du jour, statut différent de « Annulé »). Les activités sont triées par date croissante. Si aucune activité validée n'existe, un message informatif s'affiche.

La disposition est choisie sur la gauche et utilisée **à la fois** par l'aperçu et par le PowerPoint exporté. Les anciens modèles « En cartes », « Tarifs en avant » et « Programme » sont automatiquement ouverts avec le modèle **Classique** pour préserver les informations des anciennes fiches. Aucun ancien enregistrement n'est effacé.

### Tarifs facultatifs

Dans **Tarifs et subventions CSE**, cochez **Afficher des tarifs sur cette activité** uniquement si la slide doit montrer un prix. Sinon aucun encart ni tableau tarifaire n'est ajouté. Quand les tarifs sont activés, les calculs existants T1–T10, taux de subvention, participation salariale ou prix fixe restent disponibles. Les taux T1–T10 de démonstration sont à confirmer par le CSE.

### Référents multiples

Sous **Inscriptions, contact et validation**, utilisez **+ Ajouter un contact**, indiquez un nom et un e-mail facultatif, puis ajoutez d'autres référents si besoin. Ces données restent dans la fiche de l'activité, y compris ses export/import JSON et sa sauvegarde Supabase. Les noms des référents sont repris dans les modèles de diapositives. Limite pratique : 15 référents par activité.

### Valeur en points facultative

Saisissez un nombre de points (facultatif), puis sélectionnez **Séjour long**, **Séjour court** ou **Séjour FRANCE**. Lorsque la valeur est absente, l'information n'apparaît pas sur la slide. Le contrôle avant publication exige un compteur lorsque des points sont indiqués. Les fiches anciennes « 24 points » sont converties automatiquement en « 24 » (compteur Séjour long par défaut, à revérifier).

## Mettre à jour GitHub Pages sans perdre ses fiches

1. Depuis la V5, sauvegardez la bibliothèque locale avec **Sauvegarder toute la bibliothèque (JSON)**.
2. Téléchargez et décompressez ce dossier V6.
3. Dans le dépôt GitHub `mGresset/CSE_Massy`, remplacez les fichiers présents à la **racine**, ainsi que les sous-dossiers `js`, `assets`, `vendor`, `supabase`, `tests` et `docs`. Attention : l'import via le navigateur GitHub peut ne pas écraser les fichiers déjà présents ; utilisez l'éditeur ou GitHub Desktop si besoin.
4. Vérifiez que `index.html` affiche **V6** et que `js/layouts.js` et `js/app.js` ont bien été mis à jour.
5. Faites **Commit changes** sur `main`. La configuration Pages reste **Deploy from a branch → main → /(root)**.
6. Ouvrez https://mgresset.github.io/CSE_Massy/ et actualisez avec **Ctrl + Maj + R**.
7. En cas de souci de stockage local, réimportez le JSON que vous avez sauvegardé. Évitez de vider les données du navigateur avant la sauvegarde.

## Supabase existant : migration recommandée

La V6 rend les tarifs facultatifs et introduit les fiches « Informations » et « Activités à venir » sans date propre. Les anciens contrôles de la base Supabase V4/V5 refuseraient leur approbation.

**Si un projet Supabase est déjà actif**, exécutez **`supabase/v6_migration.sql`** dans le SQL Editor du projet administrateur. Cette migration remplace uniquement la fonction de validation serveur. Elle ne crée pas de nouvel utilisateur et ne supprime pas les fiches.

**Si vous n'avez jamais créé de projet Supabase**, le site fonctionne en mode local sans aucune action supplémentaire. Lorsque vous souhaiterez le mode partagé, installez **`supabase/schema.sql`** et configurez les rôles comme dans la documentation V4.

La validation Supabase conserve les protections de rôles et versions. Si les tarifs sont activés, le prix extérieur est toujours obligatoire. Les activités classiques conservent l'exigence d'une date d'activité ; seuls les modèles Informations et Activités à venir en sont dispensés.

**Limite de l'agenda collectif :** le modèle « Activités à venir » utilise pour l'instant les fiches validées **localement** sur le navigateur. Il ne récupère pas encore automatiquement les activités approuvées de la bibliothèque Supabase. Le module partagé et l'export PowerPoint groupé des activités approuvées sont conservés.

## Canva

La destination Canva, les liens mémorisés et la fonction de publication de la V5 sont conservés. **L'insertion automatique dans une présentation Canva n'est pas activée par la seule possession d'un lien de partage** : elle nécessite les autorisations API du compte CSE et la configuration d'une fonction serveur Supabase. Le chemin sûr reste **Exporter PowerPoint** et l'importer manuellement dans Canva, tant que la publication API réelle n'a pas été validée.

## Tests

En environnement Node :

```bash
node tests/pricing.test.js
node tests/layouts.test.js
node tests/v5_sanity.test.js
```

Essais navigateur : ajout/suppression d'une catégorie, sauvegarde locale, contacts multiples, tarification désactivée, compteur de points, génération d'agenda à partir d'activités validées et export de 5 PowerPoint. La connexion à un véritable compte Canva ou Supabase n'a pas été testée.

## Sécurité et données

GitHub Pages héberge un site public : ne déposez pas de données personnelles non destinées à la publication dans le code du dépôt. Les noms et e-mails des référents seront visibles sur les slides publiées. Ne placez **jamais** une clé Supabase `service_role`, `sb_secret_` ni les secrets Canva dans les fichiers statiques.
