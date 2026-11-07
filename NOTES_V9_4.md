# Version 9.4 — Compositeur durable

## Modifications

1. Rubriques fixes : Couverture → Ouvertures → Informations importantes → Dernières chances → Nouvelles activités → Inscriptions en cours → Annonces → Partenaires → Plannings → Règlement.
2. Classement des fiches contrôlé par leurs données à la date du MEL, sauf placement manuel d'annonce / information / planning.
3. Couverture obligatoire, placée en première position et non supprimable.
4. Options de texte propres à un MEL sans modifier la fiche d'origine.
5. Modification de la fiche source et retour à la même diapositive.
6. Actualisation automatique non destructive avec suppression persistante des pages retirées.
7. Navigation de la liste par sous-sections ; réorganisation uniquement dans une rubrique.
8. Cache-busting 9.4.0 pour l'actualisation GitHub Pages.

## Installation

Exporter la sauvegarde JSON du CSE avant toute mise à jour. Décompresser l’archive de correctifs dans le dépôt et **conserver les dossiers `js/`, `css/` et `tests/`**. Valider (Commit changes), attendre le déploiement GitHub Pages puis forcer l'actualisation du navigateur (Ctrl+Maj+R). L'archive complète peut aussi être utilisée.

## Précisions

- Une fiche modifiée dans la bibliothèque affecte tous les MEL qui la référencent. Pour une modification propre à une semaine, utiliser « Personnaliser uniquement cette diapositive ».
- Une activité classée automatiquement peut changer de rubrique lorsque la date de référence du MEL est modifiée. Les annonces peuvent être fixées à la rubrique « Annonces ».
- Les champs et sauvegardes de V9.3 sont compatibles.
- Cette mise à jour n'ajoute pas de publication directe dans Canva : export PowerPoint puis import Canva.
- Les 13 suites de tests Node sont passées ; le parcours navigateur réel n'a pas pu être vérifié ici.

## Ajustement V9.4.1 — tarifs en cartouche discret

- Sur les fiches « Activité classique », la grille T1 à T10 devient un petit rectangle ancré en bas à gauche, **610 px de large maximum** (sur 1 200 px).
- Cinq tranches par ligne sur deux lignes ; fond lilas clair et accent violet très fin.
- Prix extérieur conservé discrètement sur la ligne d’en-tête.
- Hauteur 49 px sans notes, 63 px avec notes ; redistribution automatique lorsque les tarifs sont désactivés.
- Le même moteur fournit la prévisualisation HTML et l’export PowerPoint modifiable.
