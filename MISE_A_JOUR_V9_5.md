# CSE Studio V9.5 — Qualité, ergonomie et sécurisation du MEL

Mise à jour compatible avec la V9.4.6, toujours hébergeable gratuitement sur GitHub Pages.

## Objectif conservé

Une fiche d'activité se crée **une seule fois dans la Bibliothèque**, puis se réutilise dans les MEL. On peut modifier la fiche source (mise à jour des MEL concernés) ou personnaliser une diapositive **pour un MEL donné**. Les dix rubriques éditoriales sont classées automatiquement :

1. Couverture (obligatoire) ; 2. Ouvertures et permanences ; 3. Informations importantes ; 4. Dernières chances ; 5. Nouvelles activités ; 6. Inscriptions en cours ; 7. Annonces / concerts ; 8. Partenaires ; 9. Plannings ; 10. Règlement.

Le glisser-déposer et les flèches peuvent réordonner des pages **dans une même rubrique uniquement**. Le modèle Classique conserve le petit tableau des tarifs en bas à gauche (T1–T10 en 3 lignes, tarif extérieur aligné sur la dernière ligne).

## Corrections et nouveautés de la V9.5

- **Déplacement des pages** : correction du glisser-déposer d'une page sur sa voisine, qui pouvait ne produire aucun changement ; liste de pages qui conserve sa position de défilement pendant les manipulations.
- **Classement fiable** : les activités complètes, annulées ou closes ne se retrouvent pas dans les nouveautés automatiques. Une « dernière chance » forcée ne réactive pas une inscription expirée.
- **Sélection manuelle respectée** : choisir zéro nouveauté conserve une sélection vide, y compris sur la couverture. Les fiches archivées sont exclues des sélections automatiques.
- **Actualisation non destructive** : protection de l'ordre éditorial lorsque la date du MEL change, et conservation des personnalisations de pages et des fiches source.
- **Contrôle éditorial avant export** : avertissement explicite pour les fiches en brouillon/à relire, les erreurs bloquantes et les textes tronqués. Les essais restent possibles après confirmation.
- **Sauvegarde immédiate depuis « Composer le MEL »** : bouton JSON, avec avertissement si des photos référencées ne sont plus disponibles dans le stockage local.
- **PDF imprimable** : préparation après chargement des images, au lieu d'un délai fixe trop court (limite de sécurité de 4 secondes).
- **Liens plus sûrs** : seules les URLs HTTP(S) et les adresses e-mail `mailto:` valides sont utilisées par les diapositives et les exports. Si l'URL du portail est incorrecte, le lien CSE officiel reste utilisé.
- **Interface plus guidée** : trois étapes depuis le tableau de bord, état des fiches approuvées/à relire/en brouillon dans le MEL, accès direct aux options de la diapositive, meilleure navigation au clavier et améliorations sur petit écran.
- **Robustesse des images et fichiers** : fermeture du sélecteur de fichier sans laisser de promesse en attente ; message de sauvegarde plus fiable.
- **Documentation et tests** : deux nouveaux fichiers de tests de régression. Tous les 19 fichiers de tests passent.

## Déployer sur votre dépôt existant

1. Ouvrez **Sauvegardes & exports** et téléchargez votre sauvegarde JSON complète avant la mise à jour. Conservez-la sur votre ordinateur, pas dans le dépôt GitHub public.
2. Décompressez `CSE_Studio_Massy_V9_5_Correctifs_Seulement.zip` et remplacez les fichiers concernés à la **même position** dans le dépôt GitHub `mGresset/CSE_Massy` (branche `main`). Avec GitHub Desktop, copiez les fichiers par-dessus les anciens, puis validez le commit et poussez les modifications.
3. Attendez le résultat de l'action GitHub Pages. Actualisez le site avec **Ctrl+Maj+R**.
4. Testez une fiche d'activité, le glisser-déposer de deux pages dans une rubrique, la modification d'une seule diapositive, la sauvegarde JSON et l'export PPTX.

L'archive « complète » contient tous les fichiers à la **racine** du dépôt et peut être utilisée si les fichiers existants sont incomplets. N'ajoutez pas les archives de référence historiques internes au dépôt public.

## Vérifications et limites

- `node tests/run.js` : **19 fichiers de tests réussis**.
- `node --check` : syntaxe JavaScript contrôlée.
- Export PPTX de démonstration : 5 diapositives, texte modifiable, bandeau, hyperliens CSE et `mailto:` ; archive ZIP PowerPoint valide.
- Les tests JavaScript et d'export ont été exécutés localement. **Le test interactif dans Chromium a été empêché par les restrictions du navigateur dans cet environnement.** Une vérification réelle après publication est indispensable.
- La publication **directe** dans une présentation Canva via son simple lien de partage n'est toujours pas opérationnelle. Le flux fiable reste l'export PowerPoint modifiable, puis son import dans Canva.
- Le mode de collaboration Supabase n'a pas été essayé sur une véritable instance multi-utilisateur : vérifier les droits et les conflits avant de le généraliser.
- Si une sauvegarde signale des images absentes, réimportez les photos manquantes depuis leur source avant de considérer le fichier JSON comme une archive complète.

## Confidentialité

GitHub Pages public n'est pas une plateforme d'hébergement privée. Ne versionnez jamais les listes de bénéficiaires, adresses e-mail privées, mots de passe, tokens, clés `service_role` Supabase, fichiers de sauvegarde avec données internes ou PDF confidentiels. Le fonctionnement local et les règles de partage des données restent inchangés.
