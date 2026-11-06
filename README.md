# CSE Studio V3 — Thales LAS Massy

Application Web de création de diapositives CSE, **prête à déployer sur GitHub Pages**, sans serveur ni installation. Un bénévole remplit le formulaire, sélectionne un modèle et obtient un PowerPoint 16:9 modifiable, importable dans Canva.

## Nouveautés de la V3

- **6 dispositions au choix** : Classique, Immersif, En cartes, Tarifs en avant, **Programme** (nouveau), **Essentiel** (nouveau).
- **Bandeau haute définition officiel** : `assets/bandeau-cse.jpg` (1920 × 282 pixels). Le bandeau reste fixe sur les six modèles.
- **Circuit de vérification avant diffusion** : titre, dates, prix extérieur, cohérence inscriptions et participants, validité du lien ; avertissements pour image/description manquantes.
- **Statut éditorial distinct du statut d’inscription** : Brouillon / À relire / Validée. La modification du contenu d’une fiche validée la remet en « À relire ».
- **Bibliothèque locale filtrable par statut**.
- **Export PowerPoint groupé** des fiches *validées* (25 slides maximum par lot), en plus de l’export unitaire.
- **Sauvegarde / import de bibliothèque entière au format JSON** : partage manuel entre bénévoles, sans base de données. L’import complète la bibliothèque existante ; les fiches peuvent être dupliquées, et les images encodées augmentent le volume.
- **Prompt de création d’image copiable** pour servir dans un outil IA extérieur. **Ne génère pas d’image automatiquement** et ne demande aucune clé d’API.

### Fonctionnalités conservées de la V2

- Prix par tranches **T1 à T10**, calculés à partir du prix extérieur et des taux de subvention ; taux configurables et mémorisables.
- Autres méthodes : subvention fixe en %, pourcentage payé par le salarié, montant salarié fixe en €.
- Photos locales (1 ou 2), URL externe (sous réserve de CORS), prévisualisation avant export.
- Statuts d’inscription auto ou manuels, dates, participants, description, conditions, contact, points CSE, carbone.
- Lien vers `https://cethaleslasmassy.portailce.com/` par défaut ; lien personnalisé non obligatoire ou aucun lien.
- Export PPTX à **textes et formes modifiables**, hyperlien cliquable ; export JSON d’une fiche et CSV pour Canva.
- **Toutes les données sont enregistrées dans le navigateur local**, et non sur GitHub.

## Mettre à jour depuis V2 sur votre GitHub

Dépôt utilisé : <https://github.com/mGresset/CSE_Massy> ; site attendu : <https://mgresset.github.io/CSE_Massy/>.

1. **Sauvegarder** la V2 avant remplacement : sur GitHub → Code → Download ZIP. Si vous avez des fiches enregistrées, ouvrez la V2 et utilisez **Exporter JSON** pour les conserver séparément.
2. Décompresser l'archive V3, puis transférer **le contenu** du dossier `CSE_Studio_V3_GitHub` à la **racine** du dépôt (ne pas ajouter un dossier enveloppe).
3. Remplacer `index.html`, `styles.css`, `js/app.js`, `js/layouts.js`, `js/pricing.js` ainsi que les dossiers `assets`, `vendor` et fichiers concernés. Les bibliothèques JSZip/PptxGenJS sont déjà fournies dans `vendor`.
4. Sur GitHub, cliquez **Commit changes**.
5. GitHub Pages reste configuré sur **Deploy from a branch / main / (root)** ; le site sera actualisé lors de la publication. Rafraîchir avec **Ctrl + Maj + R** si la V2 apparaît toujours.
6. Vérifiez que la page annonce **V3** et affiche **6 modèles**.

**Attention à `index.html`** : il doit se trouver à la racine et charger les scripts locaux dans cet ordre :

```html
<script src="vendor/jszip.min.js" defer></script>
<script src="vendor/pptxgen.min.js" defer></script>
<script src="js/pricing.js" defer></script>
<script src="js/layouts.js" defer></script>
<script src="js/app.js" defer></script>
```

## Mode d’emploi quotidien

1. Choisir une disposition parmi six, puis saisir le titre, le lieu, les dates, les informations, le barème et les photos.
2. Vérifier les informations dans **Contrôle avant diffusion**. Les problèmes bloquants empêchent la validation interne, **pas le travail de brouillon ni l’export individuel**.
3. Cliquez **Mettre à relire**, puis après vérification **Valider cette activité** (statut éditorial local).
4. Exporter la slide `.pptx` individuellement ou créer un **PPTX groupé** avec les activités enregistrées validées.
5. Importer le PowerPoint dans Canva, relire et diffuser aux bénéficiaires. Le bouton de chaque slide renvoie au site CSE (ou au lien personnalisé choisi), pas à un deep link Kalidea supposé.
6. Pour transmettre les fiches à un autre bénévole, exportez la **bibliothèque JSON** et demandez-lui de l’importer dans son navigateur. Cette opération **ne synchronise pas** les modifications : elle crée des copies locales.

## Barème tarifaire

Les taux initiaux sont des **valeurs de démonstration** : 70, 65, 60, 55, 50, 45, 40, 35, 30 et 25 % de subvention. Les huit taux intermédiaires doivent être validés par le CSE.

Calcul par tranche : **prix salarié = prix extérieur × (1 − taux de subvention / 100)**. Exemple : prix extérieur 2 400 €, T1 à 70 % → 720 € ; T10 à 25 % → 1 800 €.

## Limites importantes

- **GitHub Pages est un hébergement statique public.** Ne publiez pas de liste nominative de bénéficiaires, d’identifiants ou de mots de passe dans le dépôt.
- La V3 **n’a ni comptes collaborateurs ni base commune**. « Validée » indique une validation enregistrée localement, pas l’accord d’un responsable authentifié.
- L’outil **ne modifie pas directement les planches Canva** et **ne communique pas avec Up Expert / Kalidea** ; les URL restent des liens de navigation.
- Un lien d’image distant peut bloquer la récupération par le navigateur (CORS). Importer le fichier JPG/PNG/WebP garantit la meilleure fiabilité de l’export.
- Les modèles optimisent la lisibilité mais ne remplacent pas une relecture humaine, notamment pour les programmes très longs.

## Structure

- `index.html` : interface V3 ; `styles.css` : thème responsive.
- `js/pricing.js` : calcul des tarifs ; `js/layouts.js` : six mises en page ; `js/app.js` : formulaire, validation, stockage, exports.
- `assets/` : bandeau et ressources ; `vendor/` : bibliothèques PPTX locales ; `tests/` : contrôles métier et géométriques.
- `.nojekyll` : assure la publication des ressources statiques.

## Tests

- `node tests/pricing.test.js`
- `node tests/layouts.test.js`
- Test navigateur réalisé sur les **6 exports PPTX**, un **lot groupé 2 slides**, le calcul des tranches et la sauvegarde de la bibliothèque JSON.
