# Mettre CSE Studio V9.2 sur GitHub Pages

**Base de départ :** archive `CSE_Massy-main (1).zip` (V9.1 fournie par le CSE).  
**Objectif :** stabiliser les synchronisations Supabase sans modifier les templates, les tarifs ou l'export PowerPoint.

## Avant de remplacer les fichiers

1. Sur le site actuellement en ligne : **Sauvegardes & exports → exporter le JSON complet**. Conserver ce fichier localement.
2. Si vous utilisez Supabase, ne faites pas le premier test avec plusieurs bénévoles simultanément. Faites d'abord une sauvegarde distante si vous en avez la possibilité.
3. Assurez-vous que le dépôt GitHub à mettre à jour contient encore la V9.1 examinée ici. Si le code a changé entre-temps, comparer les versions avant d'écraser les fichiers.

## Installation sur le dépôt `mGresset/CSE_Massy`

Vous disposez de deux archives :

- **V9.2 complète** : tous les fichiers, y compris le bandeau et les bibliothèques existantes ; à privilégier avec GitHub Desktop.
- **V9.2 correctif seul** : uniquement les fichiers modifiés, avec les chemins de dossiers corrects ; à privilégier pour une mise à jour courte.

Avec GitHub Desktop :

1. Cloner/ouvrir `CSE_Massy`.
2. Copier le **contenu** de l'archive à la racine du dépôt, pas le dossier enveloppe lui-même.
3. Vérifier les différences, créer un commit `fix: stabilisation synchronisation CSE Studio V9.2`, puis pousser sur GitHub.
4. Dans `Settings → Pages`, conserver `Deploy from a branch`, `main` et `/(root)`.
5. Ouvrir le site et actualiser avec **Ctrl + Maj + R**.

La page principale indique désormais **V9.2** et les ressources portent la version `?v=9.2.0` pour contourner l'ancien cache du navigateur.

## Changements

- Une fiche déjà connue sur Supabase via `payload.id` est rattachée au lieu d'être recréée.
- Une version locale de fiche divergente est préservée dans la Bibliothèque comme « (version locale en conflit) ».
- Les copies locales des MEL en conflit sont conservées dans **Composer le MEL** sous une entrée distincte « COPIE LOCALE EN CONFLIT ».
- Ces copies ne sont **pas envoyées automatiquement** dans le partage. Depuis **Paramètres → Espace partagé**, l'utilisateur peut décider explicitement d'autoriser leur partage comme nouveaux MEL.
- Les versions locales divergentes des **paramètres et catégories** sont conservées dans une liste de récupération (max. 10), consultable même sans connexion Supabase, avec un bouton « Restaurer ici ».
- Les images provenant d'IndexedDB et leur version data URL distante peuvent être reconnues comme identiques.

Aucune migration SQL supplémentaire n'est nécessaire pour ces changements côté navigateur. Les données utilisent la même clé locale V9 (`cse-studio-massy:v9:project`).

## Vérifications réalisées

Depuis le répertoire du projet :

```bash
node tests/run.js
```

Résultat : **11 fichiers de tests réussis**, dont `cloud-regressions.test.js` et `cloud-panel.test.js` ajoutés pour la V9.2. Les anciens tests de prix, mise en page, sauvegarde et PowerPoint restent verts.

## Limites connues et mesures de prudence

- Les tests de synchronisation ont été exécutés avec un **faux serveur PostgREST**, pas avec le projet Supabase réel du CSE. Contrôler les rôles, les droits RLS, le premier raccordement et les conflits sur deux navigateurs avant l'ouverture à tous les bénévoles.
- Le dédoublonnage implémenté protège le **premier raccordement séquentiel** par identifiant métier. Deux créations simultanées pendant la toute première synchronisation peuvent encore nécessiter une contrainte d'unicité **côté base** après nettoyage des doublons préexistants.
- Les copies de récupération restent stockées **localement**. Exporter une sauvegarde JSON avant de supprimer les données du navigateur.
- La publication directe dans Canva n'est pas activée par ce correctif ; l'export PowerPoint reste la méthode de publication fiable.
- Les tests visuels automatisés dans un navigateur n'ont pas pu aboutir dans cet environnement à cause d'une restriction d'accès réseau local. Ils doivent être refaits sur le site GitHub Pages publié.
