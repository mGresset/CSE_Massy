# CSE Studio V9.6.2 — Corrections des exports et finitions graphiques

## Nouveautés

1. Les images importées localement sont réellement embarquées dans les exports PPTX, avec le cadrage de l’aperçu Web. Les images Web bloquées par CORS ne peuvent pas être ajoutées silencieusement : l’utilisateur est averti et doit importer un fichier ou coller une copie réelle.
2. Dans les fiches de voyages, les descriptions courtes disposent d’un panneau légèrement teinté pour éviter un grand espace blanc non structuré. Les photos restent séparées et leur zone n’est pas recouverte.
3. Dans les fiches comportant une ou deux informations pratiques, les cartes « Inscriptions » et « Participants » prennent place **sur la même rangée que les tarifs**. Cela libère de la hauteur pour les photos et les textes, et évite une grande bande blanche sous la fiche.
4. Le supplément « single » ou autre note tarifaire courte est aligné à droite **sur la ligne de titre du cartouche Tarifs CSE**. Il n’est plus seul sous les tarifs. Les notes longues restent dans le même cartouche, sur un fond discret, sans masquer les tranches.
5. Les montants des dix tranches sont alignés par colonne ; le tarif extérieur reste à droite sur la dernière ligne lorsque la grille fait 4 + 4 + 2 tranches.
6. Le sous-titre qui commence par la même plage de dates que les champs structurés n’affiche plus deux fois la période.
7. Le numéro de version des ressources Web est passé à 9.6.2, pour éviter un mélange d’anciens scripts après déploiement GitHub Pages.

## Installation

- Effectuer une sauvegarde JSON depuis l’application avant modification.
- Pour une V9.6 existante, installer le ZIP de correctifs en copiant les fichiers à la racine du dépôt, sans créer de sous-dossier supplémentaire.
- Pour une installation neuve, décompresser le ZIP complet **et déposer son contenu**, pas le dossier contenant.
- Valider avec GitHub `Commit changes`, puis recharger `https://mgresset.github.io/CSE_Massy/` après déploiement.

## Remarques importantes

- Les URL d’images externes non téléchargeables en raison du CORS ne peuvent pas être transformées en images intégrées depuis GitHub Pages sans les droits du serveur source. Importer une image locale JPG/PNG (ou coller une copie) avant d’exporter.
- Les tests Node et les captures PowerPoint portent sur des exemples. Un contrôle final de ton MEL réel dans Canva demeure nécessaire avant publication.
- Aucun changement n’est apporté au barème T1 à T10, à l’ordre des rubriques MEL ou au stockage Supabase.
