/* CSE Studio V9 · Jeu de démonstration FICTIF (aucune donnée issue d'un MEL réel).
 * Les dates sont calculées par rapport à la date de référence pour que la démo reste cohérente
 * (dernières chances à J+2/J+4, nouveautés récentes, etc.). Adresses e-mail en @exemple.org. */
(function (root, factory) {
  'use strict';
  var mod = factory(root.CSE || {});
  root.CSE = root.CSE || {};
  root.CSE.demo = mod;
  if (typeof module === 'object' && module.exports) module.exports = mod;
})(typeof window !== 'undefined' ? window : globalThis, function (CSE) {
  'use strict';
  function build(refDate, photo) {
    var M = CSE.model, D = CSE.dates;
    photo = photo || function () { return ''; };
    var ref = refDate || D.todayParis();
    var at = function (n) { return D.addDays(ref, n); };
    var recent = new Date(Date.UTC(+ref.slice(0, 4), +ref.slice(5, 7) - 1, +ref.slice(8, 10) - 2, 9)).toISOString();
    var old = new Date(Date.UTC(+ref.slice(0, 4), +ref.slice(5, 7) - 1, +ref.slice(8, 10) - 40, 9)).toISOString();
    var month = ref.slice(0, 7);
    var p = M.blankProject();
    var cat = function (name) { var c = p.categories.find(function (x) { return x.name === name; }); return c ? c.id : ''; };
    function item(type, o) {
      var it = M.normalizeItem(Object.assign(M.blankItem(type), o));
      it.createdAt = o.createdAt || old; it.updatedAt = it.createdAt;
      p.items.push(it);
      return it;
    }
    var ph = function () { return Array.prototype.slice.call(arguments).map(function (t) { return photo(t); }).filter(Boolean); };

    item('activity', {
      title: 'Circuit Sri Lanka authenticité', categoryId: cat('Voyages'), subtitle: 'Vacances de printemps',
      summary: 'Un circuit découverte très varié au cœur du Sri Lanka, entre sites classés, nature préservée et rencontres.',
      description: 'Accompagnement par un guide local francophone tout au long du séjour, hébergement en hôtels de catégorie supérieure et pension complète.',
      highlights: 'Temple d’or de Dambulla et rocher de Sigiriya\nVisite des sites anciens de Polonnaruwa à vélo\nSafari en 4×4 dans une réserve naturelle\nDémonstration d’art martial traditionnel\nDétente en bord de mer à Passikudah',
      transport: 'Vol aller-retour Paris – Colombo avec escale, transferts en car climatisé.',
      conditions: 'Passeport valable 6 mois après le retour et autorisation de voyage électronique (ETA).',
      notes: 'Séjour non adapté aux personnes à mobilité réduite.',
      dateStart: at(150), dateEnd: at(161), regEnd: at(27), location: 'Sri Lanka',
      minPart: '20', maxPart: '35', points: { value: '24', counter: 'long' }, carbon: '3 000 kg CO₂e (vol A/R)',
      pricing: { enabled: true, mode: 'tranches', outside: '2400', label: 'Chambre double', notes: 'Réductions non cumulables. Supplément chambre individuelle : 350 €.' },
      contacts: [{ name: 'Référent Voyages', email: 'voyages@exemple.org' }], photos: ph('travel', 'temple'), editorial: 'auto'
    });
    item('info', {
      title: 'Demandes de subvention : date limite de dépôt', categoryId: cat('Informations'), subtitle: 'Sport, culture, location de matériel…',
      summary: 'Les demandes de subvention de l’année doivent être déposées au plus tard le ' + D.fmtLong(at(21)) + '.',
      description: 'Déposez vos justificatifs sur le portail du CSE, rubrique « Mes demandes ».\n- Une demande par justificatif\n- Factures nominatives et acquittées\n- Délai de traitement : environ 30 jours',
      notes: 'Merci de ne pas relancer les bénévoles par e-mail : le suivi de votre demande est visible sur le portail.',
      contacts: [{ name: 'Accueil CSE', email: 'accueil-cse@exemple.org' }], createdAt: recent
    });
    item('partner', {
      title: 'Librairie Les Pages Vives', categoryId: cat('Informations'), subtitle: 'Partenaire du CSE',
      partner: { offer: 'Remise supplémentaire sur tout le catalogue, livraison offerte au CSE', amount: '−15 %', code: 'CSE-MASSY', validUntil: at(24) },
      description: 'Offre réservée aux bénéficiaires du CSE, non cumulable avec d’autres promotions. Commande en ligne avec le code ci-dessus.',
      link: { type: 'custom', url: 'https://www.exemple.org/offre-cse', label: 'Voir l’offre' }, photos: ph('books'), createdAt: recent, editorial: 'new'
    });
    var days = {};
    for (var d = 1; d <= 31; d++) {
      var iso = month + '-' + D.pad(d);
      if (!D.isValid(iso)) continue;
      var wd = D.weekday(iso);
      if (wd === 0 || wd === 6) continue;
      days[iso] = wd === 3 ? 'short' : (d % 9 === 0 ? 'closed' : 'open');
    }
    item('calendar', {
      title: 'Permanences CSE du mois', categoryId: cat('Informations'),
      calendar: { month: month, days: days, service: 'Permanences', hours: 'Bureau du CSE, bâtiment A, rez-de-chaussée.', catalogUrl: '', note: '' },
      contacts: [{ name: 'Accueil CSE', email: 'accueil-cse@exemple.org' }]
    });
    item('activity', {
      title: 'Soirée œnologie : vins de fête', categoryId: cat('Œnologie'),
      summary: 'Autour d’un bon repas, un œnologue vous fait découvrir quatre vins sur le thème des fêtes de fin d’année.',
      description: 'Entrée, plat, fromages et dessert. Restaurant partenaire à proximité du site.',
      dateStart: at(9), timeStart: '19:30', location: 'Restaurant Le Cep, Massy', regEnd: at(2), maxPart: '45',
      pricing: { enabled: true, mode: 'tranches', outside: '65' },
      contacts: [{ name: 'Référent Œnologie', email: 'oenologie@exemple.org' }], photos: ph('wine')
    });
    item('activity', {
      title: 'Karting en équipe', categoryId: cat('Sports mécaniques'),
      summary: 'Course d’endurance par équipes de 2 ou 3 pilotes sur circuit extérieur.',
      program: '14h00 - Accueil et briefing\n14h45 - Essais libres et qualifications\n15h30 - Course d’endurance de 2 h\n18h30 - Résultats et podium',
      dateStart: at(12), location: 'Circuit de Bel-Air', regEnd: at(4), minAge: '16', minPart: '12', maxPart: '30',
      pricing: { enabled: true, mode: 'tranches', outside: '80' },
      contacts: [{ name: 'Référent Sports mécaniques', email: 'karting@exemple.org' }, { name: 'Co-référent', email: 'karting2@exemple.org' }], photos: ph('race')
    });
    item('activity', {
      title: 'Le Jura en hiver : 5 jours / 4 nuits', categoryId: cat('Randonnées'),
      summary: 'Randonnées en raquettes à neige dans le Haut-Jura, encadrées par deux accompagnateurs en montagne.',
      description: 'Niveau technique 2/5, niveau physique 2/5 : 4 à 6 heures de marche par jour, 200 à 450 m de dénivelé.',
      lodging: 'Hôtel club en demi-pension, chambres doubles (option individuelle : 100 €).', transport: 'Train Paris – Genève puis transferts en minibus.',
      dateStart: at(80), dateEnd: at(84), regEnd: at(21), minAge: '14', minPart: '20', maxPart: '24', points: { value: '9', counter: 'short' },
      pricing: { enabled: true, mode: 'tranches', outside: '997' }, createdAt: recent,
      contacts: [{ name: 'Référent Randonnées', email: 'rando@exemple.org' }], photos: ph('mountain', 'snow')
    });
    item('activity', {
      title: 'Concert de Noël des ateliers musicaux', categoryId: cat('Musique'),
      summary: 'Les groupes et chorales des ateliers du CSE se produisent sur scène : venez les applaudir !',
      highlights: 'Ensemble vocal du jeudi\nÉlèves de piano\nGroupe rock des ateliers\nQuatuor à cordes\nFinale tous ensemble',
      program: '18h00 - Ouverture des portes\n18h30 - Premier set\n19h45 - Entracte gourmand\n20h15 - Second set et finale',
      dateStart: at(40), dateEnd: at(41), location: 'Salle polyvalente du site', createdAt: recent,
      pricing: { enabled: false }, contacts: [{ name: 'Référent Musique', email: 'musique@exemple.org' }], photos: ph('concert')
    });
    item('activity', {
      title: 'Atelier couture du lundi', categoryId: cat('Couture'), subtitle: 'Trimestre en cours',
      summary: 'Les ateliers continuent le lundi de 17h à 19h. Débutants ou initiés, venez avec votre projet !',
      dateStart: at(-20), dateEnd: at(45), timeStart: '17:00', timeEnd: '19:00', location: 'Salle des ateliers', maxPart: '8',
      pricing: { enabled: true, mode: 'single', fixed: '132', label: 'Trimestre' }, editorial: 'ongoing',
      contacts: [{ name: 'Référente Couture', email: 'couture@exemple.org' }]
    });
    item('activity', {
      title: 'Visite guidée : la ville au XIXᵉ siècle', categoryId: cat('Sorties culturelles'), dateStart: at(65), location: 'Paris 4ᵉ',
      summary: 'Une promenade commentée sur les traces des grands travaux du XIXᵉ siècle.', regStart: at(30), editorial: 'upcoming'
    });
    item('activity', {
      title: 'Exposition d’art contemporain', categoryId: cat('Sorties culturelles'), dateStart: at(85), location: 'Boulogne', regStart: at(40), editorial: 'upcoming'
    });
    item('activity', {
      title: 'Découverte du street-art', categoryId: cat('Sorties culturelles'), dateStart: at(110), location: 'Paris 13ᵉ', regStart: at(60), editorial: 'upcoming'
    });
    item('page', {
      title: 'Ludothèque du CSE', categoryId: cat('Animations'),
      summary: 'Plus de 300 jeux de société à emprunter gratuitement pour 3 semaines.',
      description: 'Permanence le jeudi de 13h à 14h au local du CSE. Catalogue consultable en ligne.',
      contacts: [{ name: 'Responsable ludothèque', email: 'ludo@exemple.org' }], photos: ph('games'), editorial: 'permanent'
    });
    item('rules', {
      title: 'Modalités d’inscription aux activités du CSE', categoryId: cat('Informations'),
      notes: 'Toute inscription doit être accompagnée de son paiement (carte bancaire ou chèque à l’ordre du CSE).',
      description: '# Via le portail du CSE\nPour les activités qui le proposent : billetterie, chèques culture, œnologie, sorties culturelles, spectacles…\n\n# Au local du CSE\n- Auprès du secrétariat lors d’une permanence\n- Par dépôt du règlement dans la boîte aux lettres du CSE, en indiquant l’activité concernée et les participants\n- Par courrier postal (le cachet de la poste fait foi pour les dates limites)\n\n# Montant à régler\nLe montant dépend de votre tranche (T1 à T10). Une simulation est disponible sur le portail pour chaque activité.\n\n# Séjours longs et week-ends\nPaiement par chèque : un acompte de 50 € par personne et un chèque de solde.\n\n# Désistement\nAprès la date limite d’inscription, si les places perdues ne peuvent pas être réattribuées, la participation reste due. Si un remplaçant est trouvé, la participation est remboursée après déduction de frais forfaitaires.\n\nCe texte est un modèle : le faire valider par le bureau du CSE avant diffusion.'
    });
    var issue = M.blankIssue(ref);
    issue.pages = CSE.compose.autoCompose(p, issue);
    var coverPage = issue.pages.find(function (x) { return x.kind === 'cover'; });
    if (coverPage) {
      coverPage.opts.important = { label: 'Important', title: 'Demandes de subvention', text: 'En cette fin d’année, les bénévoles traitent un grand nombre de dossiers. Merci de votre patience.' };
      coverPage.opts.editorial = 'Exemple fictif : remplacez ces contenus par les informations validées du CSE.';
    }

    issue.pages.splice(issue.pages.length - 2, 0, M.normalizePage({ kind: 'upcoming', opts: { style: 'table', auto: true, categoryId: cat('Sorties culturelles'), title: 'Prévision des sorties culturelles', subtitle: 'Inscriptions bientôt ouvertes' } }));

    // La fiche Sri Lanka, très complète, est publiée sur deux pages (fonction « Scinder »).
    var sri = p.items.find(function (x) { return /Sri Lanka/.test(x.title); });
    issue.pages.forEach(function (pg) { if (sri && pg.itemId === sri.id) pg.split = true; });
    p.issues = [issue];
    p.activeIssueId = issue.id;
    return p;
  }
  return { build: build };
});
