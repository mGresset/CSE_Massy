# CSE Studio V9.4.5 — Correctif de présentation des tarifs

## Contenu

- Cartouche tarifs bas gauche conservé, format 4 + 4 + 2.
- T9 et T10 restent à gauche de la dernière ligne.
- **Extérieur** s'aligne à droite sur cette même ligne, en gras et plus visible.
- L'espacement vertical des lignes est réduit sans réduire excessivement les caractères.
- Les notes de supplément restent sous les tranches.
- Mise à jour du numéro de version et de la gestion du cache.

## Installation GitHub Pages

1. Faire une sauvegarde JSON de l'application actuelle.
2. Décompresser `CSE_Studio_Massy_V9_4_5_Correctifs_Seulement.zip`.
3. Copier les fichiers en conservant les chemins exacts : `js/engine/layout.js`,
   `js/app/main.js`, `index.html`, `mel.html`.
4. Valider dans GitHub avec **Commit changes**.
5. Actualiser le site avec **Ctrl + Maj + R** après déploiement.

## Validation

`node tests/run.js` : 16 suites de tests validées.

Le bloc a également été contrôlé après export PowerPoint et conversion en image.
