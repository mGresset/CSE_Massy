# CSE Studio V7 — Composer le MEL du CSE Thales LAS Massy

**Nouveauté majeure :** éditeur `mel.html` de MEL complets, inspiré des **33 diapositives** du PDF semaine 46 transmis. La V6 (`index.html`) est conservée pour éditer les activités, avec un nouveau lien vers le compositeur V7.

**Site GitHub Pages :** `https://mgresset.github.io/CSE_Massy/`  
**Compositeur :** `https://mgresset.github.io/CSE_Massy/mel.html`

## 1. Fonctions du compositeur V7

**11 modèles éditables** : couverture, calendrier permanences / prêt matériel, information, fiche activité, dernière chance, immersif, partenaire, affiche événement, liste des activités à venir, tableau de programmation et règlement.

- Bandeau CSE **1 920 × 282** exact et bande bleue de pied de page, identiques pour tous les modèles.
- Composition de plusieurs diapositives dans un seul MEL, ordre manuel (glisser-déposer ou ↑↓), tri automatique par rubriques, page exclue sans suppression.
- Prévisualisation immédiate 16:9, contrôles des champs essentiels, export de la slide seule ou du **MEL complet en PPTX éditable** (objets de texte indépendants, liens cliquables).
- Couverture qui récupère automatiquement les premières nouveautés et une activité « Dernière semaine ».
- Permanences avec calendrier modifiable en cliquant sur les jours ouvrables : vert, jaune ou rouge, et légende / horaires / contact.
- Agenda à venir en liste ou en tableau, alimenté à la main ou depuis les activités datées de la bibliothèque du MEL.
- 14 catégories initiales avec **Informations** en premier, ajout et suppression des catégories dans Paramètres, enregistrement partagé avec la V6 sur ce navigateur.
- Tarifs entièrement facultatifs, grilles T1–T10, 10 montants saisis manuellement, prix fixe, **subvention fixe %** et **participation salarié fixe %**.
- Contacts multiples saisis à raison d'un contact par ligne, limites de participants, points séjour long / court / France, CO₂ facultatif, code promo, liens CSE / personnalisés / aucun.
- Sauvegarde automatique locale + export/import de sauvegarde JSON. Possibilité d'importer les **activités enregistrées dans la V6 sur le même navigateur** sans les supprimer.
- Bouton « Charger les 33 schémas » pour créer 33 exemples **anonymisés** reprenant la structure du PDF. Les contenus historiques réels sont fournis séparément dans un **fichier de référence privé**, à ne pas importer sur GitHub.
- Miniatures **schématiques anonymisées** des 33 mises en page disponibles dans l’interface pour comparer leur structure.

## 2. Installation / mise à jour sur GitHub Pages

1. **Dans la V6**, exporter la bibliothèque d'activités en JSON et, si une autre version du MEL existe déjà, télécharger sa sauvegarde dans la V7.
2. Décompresser le ZIP V7, en conservant l'arborescence. Vous devez avoir `index.html` et **`mel.html` à la racine**.
3. Déposer sur `mGresset/CSE_Massy` les **fichiers et sous-dossiers contenus** dans cette archive, sans créer un niveau de dossier supplémentaire. Pour les mises à jour répétées, **GitHub Desktop** permet de remplacer l'ensemble des fichiers puis de faire Commit et Push ; c'est plus fiable qu'une copie manuelle des seuls nouveaux fichiers.
4. Garder la configuration actuelle de GitHub Pages : **Settings → Pages → Deploy from a branch → main → /(root)**.
5. Sur le site, forcer le rechargement avec **Ctrl + Maj + R**.
6. Ouvrir l'onglet **Composer le MEL (V7)** sur `index.html`, ou aller directement sur `/mel.html`.

Les bibliothèques JavaScript nécessaires aux PPTX sont incluses dans `vendor/`. Pas de serveur Node, de compte tiers, ni de build GitHub Actions nécessaire pour le fonctionnement local.

## 3. Workflow hebdomadaire conseillé

1. Ouvrir **Paramètres** et définir la semaine, l'année, la date de référence, le lien portail CSE et (facultatif) le lien Canva.
2. Créer les pages fixes (couverture, permanences, règlement), puis les fiches de nouveautés, d'activités en cours, d'information et de partenaires.
3. Compléter les dates de clôture. Utiliser **⏳** pour classer les échéances des 7 prochains jours en « Dernière semaine ».
4. Préparer les programmes à venir : choisir la catégorie, puis « Depuis les activités enregistrées ».
5. Vérifier le prévol (dates, tarifs, liens, textes trop longs), désélectionner les pages non publiées et classer par rubrique avec **⇅**.
6. **Sauvegarde JSON** ; **Exporter le MEL (.pptx)** ; importer dans Canva et vérifier le rendu final. L'application ne remplace pas Up Expert/Kalidea.

## 4. Publication Canva et collaboration : périmètre réel

- Le site contient un **bouton pour ouvrir** la présentation Canva test. Le PowerPoint V7 est importable et modifiable dans Canva, avec des variations possibles des polices et espacements.
- **L'ajout automatique d'une slide dans la présentation Canva existante n'est pas activé par le lien d'édition libre.** La V5/V6 comporte des préparatifs API Canva, mais il faut une connexion serveur et des autorisations pour finaliser le flux.
- Les données du compositeur MEL V7 résident dans **localStorage** sur le navigateur du bénévole. Elles **ne sont pas encore synchronisées avec Supabase** même si la V4/V6 est déjà configurée ; la sauvegarde JSON est prévue pour les échanges et la reprise sur un autre poste.
- Le dépôt GitHub Pages est public : ne publiez jamais de secrets, d'identifiants d'accès, ou de données individuelles sensibles dans le code. Les noms et courriels intégrés à la slide exportée deviennent visibles pour les bénéficiaires.
- La grille de subventions initiale est **illustrative** : valider les taux avec le CSE ; les tarifs des 33 exemples sont saisis manuellement lorsqu'ils diffèrent d'un calcul arrondi.

## 5. Pages d'origine et fiabilité des données

L’analyse détaillée des 33 pages est fournie **séparément dans une archive privée non destinée au dépôt GitHub**. Le site contient uniquement les modèles et des schémas anonymisés dans `assets/references/`, avec un montage dans `docs/wireframes_33_pages.jpg`. Cette séparation empêche que les coordonnées et conditions internes du MEL d’origine deviennent publiques par inadvertance.

Les **deux pages de règlement** du site public sont des **trames vides**, à renseigner puis faire contrôler par les responsables CSE. Un règlement générique ne remplace jamais le document officiel en vigueur. Le contenu historique du PDF est inclus uniquement dans l’archive de références privées séparée.

## 6. Tests

- Tests visuels Chromium : 11 modèles, composition de 33 pages, calendrier cliquable, gestion de catégories, sauvegarde JSON, export d'une page et de 33 pages.
- Exports PPTX analysés avec `python-pptx` : 33 slides, textes modifiables, liens CSE présents. Une slide a été ouverte via LibreOffice pour contrôler le rendu.
- Test de structure reproductible depuis la racine : `node tests/mel-layouts.test.js`.

### Si un export d'image échoue

Une URL d'image publique peut bloquer son téléchargement depuis GitHub Pages en raison du CORS. L'application crée une zone de remplacement sans bloquer le PowerPoint ; utiliser **Importer un visuel** dans l'éditeur pour garantir son export.

### Si une sauvegarde locale échoue

Le stockage local du navigateur a une taille limitée. Sauvegarder le MEL en JSON, alléger les photos et supprimer les anciennes compositions si nécessaire. Ne pas vider les données du navigateur sans sauvegarde préalable.

## 7. Confidentialité de la démonstration historique

Le dépôt est public : les miniatures et la démonstration embarquées dans le site sont **anonymisées**. Un **deuxième ZIP privé**, fourni à part, contient les 33 captures de référence et une sauvegarde JSON d’exemples avec noms, tarifs et conditions historiques extraits du document communiqué au CSE. **Ne pas déposer ce deuxième ZIP dans un dépôt public** ; importer uniquement le JSON depuis le navigateur en utilisant « Importer JSON » si nécessaire.
