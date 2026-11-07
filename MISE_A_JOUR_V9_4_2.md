# CSE Studio V9.4.2 — Grille tarifs sur 3 lignes

## Modification

Le rectangle de tarifs du modèle **Classique** passe de **610 px de large** à **465 px maximum** sur une diapositive de 1200 px, toujours en bas à gauche. Les 10 tranches sont disposées sur **3 lignes (4 + 4 + 2)**. La dernière ligne est centrée pour un rendu régulier. Le prix extérieur et les suppléments restent présents.

Ce choix augmente légèrement la hauteur du rectangle et réduit nettement sa largeur, ce qui laisse plus d'espace horizontal aux autres informations tout en maintenant des chiffres lisibles. Les coordonnées sont partagées par l'aperçu Web et l'export PowerPoint.

## Installer sur GitHub Pages

1. Faire une sauvegarde JSON de l'application.
2. À partir de la V9.4.1, remplacer **uniquement** `js/engine/layout.js` et `js/engine/templates.js` par les fichiers du ZIP de correctifs V9.4.2.
3. Commit changes sur la branche `main` et actualiser avec `Ctrl + Maj + R` après la publication GitHub Pages.

Le code métier, les fiches, les données et la composition du MEL ne changent pas. L'application n'est pas automatiquement déployée sur GitHub.
