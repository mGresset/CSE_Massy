# CSE Studio V8 — Compositeur de MEL adaptatif

Application web pour le CSE THALES LAS Massy, déployable directement sur **GitHub Pages**. La V8 améliore le **compositeur de MEL** (`mel.html`), tout en conservant l'éditeur de fiches d'activités (`index.html`) et les données de la V7.

**Site :** `https://mgresset.github.io/CSE_Massy/`  
**Compositeur de MEL :** `https://mgresset.github.io/CSE_Massy/mel.html`

## Ce qui change en V8

1. **13 modèles** : les 11 modèles de la V7 et deux mises en page supplémentaires : `Nouveautés · mosaïque` et `Urgences · dernière semaine`.
2. **Nouveautés et urgences plus visuelles** : de 1 à 6 fiches par page. La grille passe automatiquement de 1 grande carte à deux, trois ou quatre cartes, puis à deux rangées de trois lorsque nécessaire.
3. **Choix intelligent des contenus** : extraction automatique des activités classées « Nouveautés » ou arrivant à échéance dans les **7 jours suivant la date de référence du MEL**. La sélection peut être remplacée par une sélection manuelle de 1 à 6 fiches, avec filtre facultatif par catégorie.
4. **Mise en page adaptative** des fiches, affiches, informations, programmes, partenaires, couverture et règlement. Les rubriques facultatives ne réservent plus de place lorsqu'elles sont vides.
5. **Tarifs dynamiques** : lorsqu'ils sont activés, le bloc des tarifs T1–T10 réalloue l'espace du descriptif ; lorsqu'ils sont désactivés, ce bloc disparaît et les éléments restants se développent. Les taux eux-mêmes ne sont pas modifiés.
6. **Densité réglable pour chaque page** : automatique, aérée ou compacte. Le texte baisse de taille seulement jusqu'à un seuil de lisibilité ; si la zone reste trop chargée, un avertissement demande de réduire le texte ou d'utiliser deux diapositives.
7. **Zoom de prévisualisation** en grand format, indépendant de la taille de la fenêtre.
8. **Bandeau CSE d'origine en haute résolution**, conservé dans `assets/bandeau-cse.jpg` et `bandeau-cse.jpg`.
9. Export PowerPoint 16:9 avec **textes, formes, dates, tarifs et hyperliens modifiables**.

## Créer une page de nouveautés ou de dernière chance

- Préparer les fiches individuelles et leur attribuer une rubrique (`Nouveautés`, `En cours`, `Dernière semaine`), une date d'activité et éventuellement une date de fin d'inscription.
- Dans le menu « Type de diapositive », ajouter **Nouveautés · mosaïque** ou **Urgences · dernière semaine**.
- Sans sélection manuelle, le compositeur affiche les fiches correspondantes. Pour une page « Dernière chance », la date de référence du MEL se règle dans **Paramètres**.
- Pour maîtriser précisément la sélection, ouvrir la section « Activités affichées automatiquement », puis cocher jusqu'à six activités et, si souhaité, une seule catégorie.
- Pour une fiche classique, activer / désactiver les tarifs dans « Tarifs et subventions (facultatif) ». L'aperçu est recalculé immédiatement.
- Utiliser « Mise en page intelligente » pour choisir la densité souhaitée. Si l'outil signale un texte abrégé, **ne pas publier la diapositive telle quelle** : alléger le contenu ou prévoir une seconde slide.

## Installer sur GitHub Pages

1. Depuis la V7 déjà en ligne, **exporter une sauvegarde JSON du MEL** et, si nécessaire, la bibliothèque d'activités.
2. Décompresser l'archive ZIP V8. Déposer **le contenu** à la racine du dépôt `mGresset/CSE_Massy`, sans ajouter de dossier intermédiaire. Les dossiers `js`, `assets`, `vendor`, `docs` doivent rester à leur emplacement.
3. Remplacer les fichiers existants et ajouter notamment le nouveau fichier **`js/mel-responsive.js`**.
4. Effectuer **Commit changes** sur la branche `main` (via GitHub Desktop si possible).
5. Conserver **Settings → Pages → Deploy from a branch → main → /(root)** ; ne pas réintroduire un workflow GitHub Actions si le déploiement par branche fonctionne déjà.
6. Ouvrir `https://mgresset.github.io/CSE_Massy/mel.html` et effectuer `Ctrl+Maj+R` pour recharger la version.

## Sauvegardes et compatibilité

La V8 garde volontairement la clé de stockage de la V7 : `cse-studio-massy:v7:mel`, ainsi que le **schéma JSON `cse-studio:mel-v7`**, afin de restaurer directement les MEL existants. Les nouveaux champs (`density`, `smartCategory`, `featureIds`) reçoivent des valeurs par défaut sur les anciennes fiches. Les catégories restent dans `cse-studio-massy:v6:categories`. L'export / import JSON reste fortement conseillé à chaque évolution.

**Attention :** les données du compositeur sont encore stockées **dans le navigateur local**. Si plusieurs bénévoles doivent partager la même composition, il faudra ensuite brancher réellement le compositeur sur une base de données et contrôler les autorisations. La configuration collaborative de l'éditeur d'activités ne synchronise pas automatiquement le compositeur du MEL.

## Canva, Up Expert / Kalidea, confidentialité

- Les boutons d'accès renvoient par défaut vers `https://cethaleslasmassy.portailce.com/`, avec un lien personnalisé ou aucun lien au choix.
- Le compositeur peut ouvrir la présentation Canva de référence, mais **le lien modifiable sans compte ne suffit pas à insérer automatiquement une nouvelle slide**. L'import du PPTX dans Canva reste nécessaire en l'absence d'intégration API Canva officiellement autorisée.
- Up Expert / Kalidea continue de gérer les activités et les inscriptions ; ce logiciel édite uniquement les supports de communication.
- Le dépôt GitHub Pages est public : **ne pas publier** d'informations internes confidentielles, d'identifiants, de secrets, ou des 33 pages originales du MEL. La démonstration du site utilise des fiches anonymisées, et l'archive privée de référence fournie à part ne doit pas être versée dans le dépôt.
- Le barème T1–T10 par défaut reste **illustratif** : le faire contrôler avant diffusion. Les mentions réglementaires du modèle sont des trames à vérifier contre le règlement officiel.

## Tests réalisés

- Test de syntaxe et de modèle en Node : `node tests/mel-layouts.test.js` et `node tests/mel-responsive.test.js`.
- Tests visuels dans Chromium des 13 modèles, des choix d'activités, des champs tarifaires activés/désactivés, des alertes de texte trop long et de l'aperçu agrandi.
- Export PPTX d'un MEL de 35 pages (les 33 exemples anonymisés + deux mosaïques) et d'un MEL test de 10 pages. Les textes restent modifiables, et les liens sont inclus.
- Conversion d'un PowerPoint test en PDF via LibreOffice pour vérifier l'apparence d'une fiche tarifaire. L'export avec des URL d'images externes reste dépendant des restrictions CORS du site source ; importer les images directement est plus fiable.

## Structure du projet

- `index.html`, `styles.css`, `js/app.js` : éditeur de fiches d'activités hérité des versions antérieures.
- `mel.html`, `mel.css`, `js/mel-app.js`, `js/mel-data.js` : compositeur MEL.
- **`js/mel-responsive.js`** : nouveau moteur de mise en page V8 partagé entre aperçu et PowerPoint. `js/mel-layouts.js` conserve les fonctions et le calendrier de la V7.
- `assets/` : bandeau et autres éléments graphiques ; `vendor/` : JSZip et PptxGenJS locaux.
- `docs/apercu_v8_4_mises_en_page.jpg` : planche des quatre modes principaux.
