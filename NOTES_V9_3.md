# CSE Studio V9.3 – correctifs ciblés

- Calendrier : sélection multiple des jours ouvrés, scroll conservé lors des clics, horaires spéciaux et légende automatique préservés.
- Permanences : lien désactivé par défaut pour les **nouvelles** fiches ; bouton affiché si lien portail/personnalisé choisi. Les anciennes fiches gardent leur choix.
- Dates : la fin s'aligne sur le début si vide ou antérieure ; champ de fin limité dans le calendrier natif.
- Tarifs : bandeau réduit, réduction de l'espace fixe et plus de surface pour le texte.
- Fiches partenaires : petit encart « Partenaire CSE », descriptif agrandi automatiquement quand peu de texte.
- Règlement : sous-titre enfin rendu dans l'aperçu et les exports.
- Couverture : jusqu'à 4 informations complémentaires modifiables même après composition du MEL.
- Images Web : collage d'une image depuis le presse-papiers pour contourner les blocages d'import côté site, sans service tiers. Les CORS ne peuvent pas être supprimés par un site statique.

Sauvegardez d'abord vos données JSON. Déployez l'ensemble des fichiers ou l'archive de correctifs sur GitHub Pages. Les ajustements UI sont ajoutés au code existant et les anciens JSON restent acceptés.

## Déployer sur GitHub Pages

1. Dans CSE Studio, utiliser **Sauvegardes & exports** pour exporter les données JSON.
2. Télécharger le ZIP **V9.3 complet** ou **Correctifs uniquement**.
3. Sur `github.com/mGresset/CSE_Massy`, remplacer les fichiers par ceux contenus dans le ZIP, **en conservant les dossiers `js/`, `css/` et `tests/`**. La méthode la plus fiable est GitHub Desktop pour remplacer tous les fichiers sans erreur.
4. Vérifier les fichiers `index.html` et `mel.html` à la racine, puis faire **Commit changes**.
5. Dans `Settings > Pages`, laisser `Deploy from a branch`, branche `main`, dossier `/(root)`.
6. Une fois GitHub Pages publié, rafraîchir l’onglet avec **Ctrl + Maj + R**.

## Vérification pratique recommandée

- Créer une permanence : sélectionner plusieurs jours, puis une plage. Les clics ne doivent plus ramener au début de la page.
- Vérifier qu’une nouvelle permanence démarre avec **Aucun lien** ; choisir ensuite **Lien personnalisé** puis vérifier le bouton dans l’aperçu et l’export PPTX.
- Dans une activité, choisir une date de départ : le champ de fin doit reprendre le même jour et interdire une date précédente.
- Créer une activité avec 10 tarifs T1–T10 ; le bandeau doit être plus compact qu’en V9.2. Un contenu réellement trop long peut encore nécessiter une seconde slide pour éviter une troncature.
- Vérifier une fiche partenaire, un sous-titre de règlement, les informations complémentaires de couverture.
- Importer et exporter une photo ; en cas de blocage CORS, utiliser **Importer le fichier** ou **coller l’image copiée**.

## Limites techniques

- Le navigateur d’essai de l’environnement de développement n’a pas pu charger l’interface (`ERR_BLOCKED_BY_ADMINISTRATOR`). Les tests automatisés de moteur et d’export ont réussi, mais le parcours complet de clics reste à confirmer une fois le site publié.
- Un site GitHub Pages ne peut pas contourner arbitrairement la protection CORS des images tierces. Le collage d’une vraie image ou l’import de fichier permet de l’embarquer localement dans le PowerPoint. Le lien URL reste disponible à l’aperçu mais peut manquer à l’export si l’origine refuse l’accès.
- La synchronisation Supabase a été testée sur un serveur simulé, pas sur un environnement de production.
