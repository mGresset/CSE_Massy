# CSE Studio V9.4.1 — MEL durable et tarifs réduits

## Installation GitHub Pages

1. Sauvegarder la bibliothèque et les MEL depuis l'application en JSON.
2. Décompresser l'archive **Correctifs uniquement** à la racine du dépôt `CSE_Massy`, en conservant les dossiers `js/` et `tests/`.
3. Remplacer les fichiers du même nom et publier avec **Commit changes**.
4. Attendre la publication GitHub Pages, puis actualiser avec `Ctrl + Maj + R`.

## Différences avec la V9.3

- V9.4 : ordre éditorial immuable des 10 rubriques, ouvertures juste après la couverture, édition des fiches source ou personnalisation d'une seule diapositive, recomposition non destructive.
- V9.4.1 : le bloc T1–T10 du modèle **Activité classique** est un **petit rectangle bas-gauche** (610 px maximum sur une largeur de slide de 1 200 px), avec **deux lignes de cinq tranches**. Le libellé, le prix extérieur et l'éventuel supplément sont conservés.
- Les tarifs restent facultatifs : si désactivés, le bloc ne prend aucune place.
- L'aperçu et le PowerPoint utilisent les mêmes coordonnées.

## Vérifications

`node tests/run.js` : 14 fichiers de tests réussis, dont `tests/v94.test.js` et `tests/v941.test.js`.

La publication automatique vers Canva et la synchronisation Supabase réelle ne sont pas couvertes par ces tests.
