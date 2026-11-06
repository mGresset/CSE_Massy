# CSE Studio – Thales LAS Massy

Site web statique pour préparer les activités du CSE et générer des diapositives PowerPoint importables et modifiables dans Canva.

![Capture de l’application](docs/apercu-application.png)

*Exemple de slide exportée :* ![Diapositive Sri Lanka](docs/apercu-slide-pptx.png)

## Fonctionnalités de la version 1

- Édition et prévisualisation de la slide au format 16:9.
- Champs : activité, catégorie, lieu, dates, sous-titre, descriptif, temps forts, prestations, formalités, alertes, statut, inscriptions, capacités, points, contact, bilan carbone, photo.
- Tarifs calculés à partir du **prix extérieur** selon les tranches T1 à T10 (subventions du CSE paramétrables) ou une subvention fixe %, une participation du salarié fixe %, ou un prix salarié fixe €.
- Barème initial : T1 70 %, T2 65 %, T3 60 %, T4 55 %, T5 50 %, T6 45 %, T7 40 %, T8 35 %, T9 30 %, T10 25 % (correspond à la slide Sri Lanka fournie, avec prix extérieur de 2 400 €).
- Lien : `Portail du CSE` par défaut, `Lien personnalisé`, ou `Aucun lien`.
- Bouton avec hyperlien vers https://cethaleslasmassy.portailce.com/ ou autre destination.
- Enregistrement local dans le navigateur, bibliothèque de fiches, duplication, import/export JSON.
- Export CSV (une ligne, variables à mapper dans Canva Création en lot), PowerPoint (.pptx) et impression/PDF via navigateur.
- Aucun service tiers nécessaire pour la génération de slides.

## Déploiement GitHub Pages (sans installation)

1. Créer un nouveau dépôt GitHub, par exemple `cse-studio-massy` (public, ou privé si votre formule GitHub permet Pages privé).
2. Importer **tous les fichiers et dossiers** de ce projet à la racine du dépôt, en conservant `assets/`, `js/`, `vendor/` et `.github/workflows/`.
3. Mettre la branche principale sous le nom `main` et effectuer un commit.
4. Dans **Settings → Pages → Build and deployment**, choisir **GitHub Actions**.
5. Le workflow `Publier CSE Studio sur GitHub Pages` se lance à chaque `push` sur `main`.
6. Ouvrir l’adresse indiquée dans GitHub Actions → déploiement Pages (habituellement `https://VOTRE-COMPTE.github.io/cse-studio-massy/`).

L’application étant statique, aucun serveur applicatif, aucune base de données et aucune clé API ne sont nécessaires. Pour tester en local, lancer un petit serveur HTTP dans le dossier :

```bash
python -m http.server 8000
```

Puis ouvrir `http://localhost:8000/`. L’ouverture directe du fichier `index.html` sans serveur peut empêcher l’export PPTX de charger les images locales.

## Processus de publication dans Canva

1. Créer ou ouvrir une activité dans CSE Studio.
2. Vérifier le tarif et le texte, puis cliquer sur **Générer PPTX**.
3. Importer le PowerPoint dans Canva et ajouter la diapositive à la planche de publication.
4. Vérifier la mise en page **et le lien cliquable** dans Canva après importation, puis publier.

Le lien vers les planches Canva de test est dans l’en-tête de l’application : https://canva.link/rewv8gx5iilr8kz

**Attention :** le lien de partage Canva n’est pas une autorisation d’écriture pour une application externe. Cette V1 ne fait pas d’automatisation directe dans les fichiers Canva. Pour le faire, il faudra connecter Canva via OAuth et utiliser ses API Autofill, avec des champs de données définis sur les modèles et un compte éligible.

## Partage entre bénévoles et confidentialité

Les fiches sauvegardées sont dans le `localStorage` du navigateur **de chaque utilisateur** : elles ne se synchronisent pas entre ordinateurs. Le site n’a pas d’authentification et n’offre pas encore de validation centralisée. Utiliser « Exporter JSON » pour transférer des fiches. Éviter toute donnée personnelle non nécessaire.

Pour un usage collaboratif (comptes, rôles bénévole/validateur, stockage commun), ajouter dans une V2 une base de données avec gestion d’accès (par exemple Supabase) et protéger l’écriture des activités.

## Définition des tarifs

- **Tranches T1 à T10** : `prix salarié = prix extérieur × (1 − taux de subvention CSE / 100)`.
- **Subvention CSE fixe** : exemple 40 % de subvention → salarié paie 60 % du prix extérieur.
- **Participation salarié fixe** : exemple salarié paie 40 % du prix extérieur → subvention 60 %.
- **Prix salarié fixe (€)** : montant communiqué directement.
- Les taux sont **modifiables** et peuvent être sauvegardés par défaut pour les prochaines fiches via « Définir par défaut » ; ces préférences restent propres au navigateur.
- Les calculs arrondissent au centime. Ils ne gèrent pas encore les plafonds, quotients familiaux, cumuls de subventions ou arrondis spécifiques à votre règlement interne.

## Structure

```text
index.html
styles.css
assets/bandeau-cse.jpg      # extrait d'une slide fournie par le CSE
assets/sri-lanka.jpg        # illustration d'exemple
assets/icon.svg
js/app.js                  # interface et export PPTX/CSV/JSON
js/pricing.js              # calculs tarifaires testables
vendor/pptxgen.min.js       # PptxGenJS 4.0.0 (code tiers)
vendor/jszip.min.js          # JSZip (dépendance tierce du PPTX)
.github/workflows/pages.yml
.nojekyll
tests/pricing.test.js
```

Les images intégrées sont extraites de la capture communiquée pour le projet. Le code embarqué de PptxGenJS et JSZip est fourni avec ses mentions de licence dans `vendor/`. Remplacez-les par des éléments graphiques validés par le CSE si vous publiez l’outil publiquement.

## Limitations et évolutions

- La version 1 est une maquette avancée : le modèle PPTX est proche de la capture, **pas une copie exacte** des planches Canva éditables.
- Le contenu d’une diapositive a une capacité finie. L’outil signale des textes longs, mais la vérification visuelle reste indispensable.
- L’export de photos chargées depuis certaines URLs peut échouer à cause de CORS ; importer le fichier image directement est plus fiable.
- Le bouton dans le PowerPoint est cliquable, sous réserve du comportement de l’import Canva. Tester après chaque import.
- L’IA d’images et le travail multiutilisateur ne sont pas inclus dans cette V1.

## Test du calcul des tarifs

```bash
node tests/pricing.test.js
```


## Correctif images / export PPTX (06/11/2026)

- L’export recherche le bandeau en `bandeau-cse.jpg` (racine), puis en `assets/bandeau-cse.jpg`.
- Une image distante bloquée par CORS ou absente ne bloque plus le téléchargement du PPTX : un visuel de remplacement ou un encadré neutre est utilisé.
- Pour garantir l’image souhaitée, privilégier « Choisir une image depuis l’ordinateur ».
- En cas de fichier manquant, vérifier exactement le chemin et les majuscules/minuscules des noms sur GitHub Pages.
