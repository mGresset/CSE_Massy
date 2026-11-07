# CSE Studio V9.6 — Finitions UX/UI

## Objectifs préservés
- Créer des fiches d'activités et les modifier à tout moment, sans ressaisie.
- Conserver les pages personnalisées d'un MEL après actualisation.
- Garder les dix rubriques dans l'ordre : couverture ; ouvertures/permanences ; informations importantes ; dernières chances ; nouveautés ; inscriptions en cours ; annonces ; partenaires ; plannings ; règlement.
- Conserver le bandeau CSE et les liens du portail, les tarifs facultatifs T1–T10 et les exportations PowerPoint modifiables.

## Changements
1. **Tarifs** — cartouche bas gauche à trois lignes (4/4/2), montant extérieur à droite. Libellés alignés à gauche et montants alignés par colonne à droite, avec une meilleure séparation entre les colonnes et une barre violette intérieure, avec marges en haut et en bas. Aucun changement aux calculs.
2. **Activités** — évite la duplication de dates quand le sous-titre reprend déjà la période. Sans photo et avec un programme court, une colonne graphique de remplacement (pictogramme vectoriel) est proposée sans requérir d'image externe.
3. **Partenaires** — offre courte mieux centrée verticalement ; typographie plus lisible dans les offres courtes ; remplacement du grand titre dupliqué dans la colonne sans logo par une illustration vectorielle « Avantage partenaire ».
4. **Programmes** — lignes plus aérées, deux lignes possibles pour les noms longs, pagination lorsque le nombre d'activités l'exige.
5. **Règlement** — les documents exceptionnellement longs ne sont plus limités silencieusement à huit diapositives ; vérification jusqu'à 60 pages, avec avertissement en cas de dépassement.
6. **Interface** — uniformisation des cartes, titres, boutons, étapes de saisie, sélection des diapositives, responsive et pastilles pastel. Meilleur contraste, focus clavier, prise en charge de la réduction des animations.
7. **Tests** — adaptation des anciens tests au nouveau moteur de tarifs (libellés et montants distincts) ; nouveaux tests de géométrie, de partenaires et de pagination.

## Installation GitHub Pages
1. Dans CSE Studio, **Sauvegardes & exports → Export JSON** avant toute mise à jour.
2. Décompresser `CSE_Studio_Massy_V9_6_Correctifs_Seulement.zip` à la racine du dépôt GitHub, en conservant les sous-dossiers. Remplacer les fichiers existants.
3. **Commit changes** sur `main` ou, idéalement, ouvrir une pull request depuis une branche de préparation.
4. Dans **Actions** / **Settings → Pages**, vérifier la réussite du déploiement, puis actualiser la page avec Ctrl + Maj + R. Les URLs des scripts portent la version `9.6.0` pour éviter l'ancien cache.
5. Tester un voyage, un partenaire, un calendrier, un planning et un MEL existant avant la diffusion bénéficiaires.

## Validation
- `node tests/run.js` : **20 suites de tests réussies**.
- Export PowerPoint de cinq slides (couverture, ouverture, activité, partenaire et règlement) ; import dans LibreOffice puis contrôle du rendu.
- MEL de démonstration de vingt diapositives généré.

**Limites :** les contrôles interactifs par navigateur ont été bloqués dans l'environnement de test ; vérifier sur le GitHub Pages après déploiement. Aucun test réel de synchronisation avec une instance Supabase CSE n'a été réalisé. La publication directe dans Canva reste à configurer via une intégration API autorisée ; l'export PowerPoint vers Canva fonctionne comme solution manuelle.
