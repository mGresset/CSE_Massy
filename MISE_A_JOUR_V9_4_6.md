# CSE Studio V9.4.6 — Alignement du tarif extérieur

## Correctif

- Le prix extérieur reste sur la **troisième ligne**, à droite de T9 et T10.
- Le bord droit de « Extérieur : … » est désormais aligné sur la fin des prix de la dernière colonne (T4 et T8), **au lieu du bord droit du rectangle**.
- Le cartouche conserve sa largeur, sa hauteur, son typage et ses suppléments.
- La position s'adapte aux montants réellement calculés (les prix T4/T8 peuvent varier).
- Le moteur commun de rendu continue de fournir les mêmes coordonnées au HTML et au PowerPoint.

## Mise à jour de GitHub Pages depuis la V9.4.5

1. Faire une sauvegarde JSON des données dans l'application.
2. Décompresser `CSE_Studio_Massy_V9_4_6_Correctifs_Seulement.zip`.
3. Copier les fichiers modifiés en respectant leur arborescence (`index.html`, `mel.html`, `js/app/main.js`, `js/engine/layout.js`).
4. `Commit changes` sur GitHub. Rafraîchir ensuite le site avec **Ctrl + Maj + R**.

## Vérification

- `node tests/run.js` : 17 suites de tests réussies, incluant les montants extérieurs 3 000 € et 12 000 €.
- Export PowerPoint généré et contrôlé visuellement après conversion en image : le prix extérieur n'excède pas le cartouche.
