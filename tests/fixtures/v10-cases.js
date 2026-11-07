/* Cas de référence V10 (données 100 % fictives) : contrôle graphique avant/après,
 * parité aperçu ↔ PowerPoint et tests d'acceptation (B01–B16).
 * Utilisable dans Node (tests) et dans le navigateur (tests/visual.html?set=v10).
 * photo(theme, w, h) renvoie une référence d'image (ou '' pour un rendu sans photo). */
(function (root, factory) {
  'use strict';
  var mod = factory();
  root.CSE_V10_CASES = mod;
  if (typeof module === 'object' && module.exports) module.exports = mod;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  var LOREM = [
    'Le séjour alterne visites guidées, découvertes culturelles et temps libres pour profiter des villages, des marchés et de la gastronomie locale.',
    'Les hébergements sont choisis pour leur confort et leur situation, au cœur des villes ou au calme de la campagne.',
    'Les transferts se font en autocar climatisé avec un guide francophone présent du premier au dernier jour.',
    'Le programme peut être légèrement adapté sur place selon la météo, sans réduire les prestations prévues.',
    'Chaque soirée est libre afin que chacun puisse découvrir la région à son rythme, seul ou en petit groupe.',
    'Une réunion d’information est organisée au CSE trois semaines avant le départ pour remettre les carnets de voyage.'
  ];
  function words(n) {
    var out = [], i = 0;
    while (out.join(' ').split(/\s+/).length < n) { out.push(LOREM[i % LOREM.length]); i++; }
    var w = out.join(' ').split(/\s+/).slice(0, n).join(' ');
    return w.replace(/[,;:]?$/, '.');
  }
  function paragraphs(n, per) {
    var out = [];
    for (var i = 0; i < n; i++) out.push(words(per));
    return out.join('\n\n');
  }
  function build(CSE, ref, photo) {
    var M = CSE.model, D = CSE.dates;
    ref = ref || '2026-11-09';
    photo = photo || function () { return ''; };
    var at = function (n) { return D.addDays(ref, n); };
    var p = M.blankProject();
    var cat = function (name) { var c = p.categories.find(function (x) { return x.name === name; }); return c ? c.id : ''; };
    var old = '2026-09-01T09:00:00.000Z', recent = at(-2) + 'T09:00:00.000Z';
    var labels = {};
    function item(o, label) {
      var it = M.normalizeItem(Object.assign(M.blankItem(o.type || 'activity'), o));
      it.createdAt = o.createdAt || old;
      it.editorialStatus = o.editorialStatus || 'approved';
      p.items.push(it);
      if (label) labels[it.id] = label;
      return it;
    }
    var contacts2 = [{ name: 'Camille Martin', email: 'camille.martin@exemple.org' }, { name: 'Louis Bernard', email: 'louis.bernard@exemple.org' }];
    var program = 'Jour 1 : vol et installation, dîner de bienvenue\nJour 2 : vieille ville et marché couvert\nJour 3 : excursion dans les collines et déjeuner chez l’habitant\nJour 4 : grottes et jardins, après-midi libre\nJour 5 : journée en bord de mer\nJour 6 : retour en fin de journée';
    var voyage = {
      categoryId: cat('Voyages'), subtitle: 'Vacances de printemps', location: 'Circuit 6 jours',
      summary: 'Un circuit découverte complet entre villages blancs, oliveraies et bord de mer, encadré par un guide local francophone.',
      description: words(95), program: program,
      transport: 'Vols A/R, transferts en autocar climatisé.', lodging: 'Hôtels 3* en chambre double, demi-pension.',
      dateStart: at(150), dateEnd: at(155), regEnd: at(27), minPart: '20', maxPart: '35', minAge: '12',
      points: { value: '18', counter: 'long' }, carbon: '540 kg CO₂e (vol A/R)', contacts: contacts2,
      photos: [photo('travel'), photo('temple')].filter(Boolean)
    };
    var c = {};
    c.voyagePrix = item(Object.assign({}, voyage, { id: 'v10-voyage-tarifs', title: 'Les Pouilles : villages blancs et bord de mer',
      pricing: { enabled: true, mode: 'tranches', outside: '2400', label: 'Chambre double', notes: 'Supplément single : 150 €' } }), 'Voyage tarifé + supplément court');
    c.voyageSupLong = item(Object.assign({}, voyage, { id: 'v10-voyage-sup-long', title: 'Les Pouilles : villages blancs et bord de mer',
      description: words(60), program: '',
      pricing: { enabled: true, mode: 'tranches', outside: '3000', label: 'Chambre double', notes: 'Supplément chambre individuelle : 350 € (nombre limité, attribué selon disponibilité à l’inscription)' } }), 'Voyage tarifé + supplément long');
    c.voyageSans = item(Object.assign({}, voyage, { id: 'v10-voyage-sans', title: 'Les Pouilles : villages blancs et bord de mer', pricing: { enabled: false } }), 'Voyage sans tarifs');
    c.grandsPrix = item(Object.assign({}, voyage, { id: 'v10-grands-prix', title: 'Croisière des fjords · 12 jours', categoryId: cat('Voyages'),
      subtitle: 'Du 2 au 13 juillet 2027 — Excursions comprises', dateStart: at(235), dateEnd: at(246), description: words(70), program: '',
      photos: [photo('mountain')].filter(Boolean),
      pricing: { enabled: true, mode: 'tranches', outside: '12500', label: 'Cabine double' } }), 'Grands montants (12 500 €)');
    c.courte = item({ id: 'v10-courte', title: 'Initiation à l’escalade en salle', categoryId: cat('Sport'),
      summary: 'Deux heures pour découvrir l’escalade avec un moniteur diplômé, matériel fourni.',
      description: 'Ouvert aux débutants comme aux grimpeurs occasionnels. Prévoir une tenue de sport.',
      dateStart: at(24), timeStart: '18:30', timeEnd: '20:30', location: 'Salle Vertical’Art, Massy', regEnd: at(16), maxPart: '12',
      contacts: [{ name: 'Inès Garnier', email: 'ines.garnier@exemple.org' }] }, 'Activité courte sans photo ni tarif');
    c.longue = item({ id: 'v10-longue', title: 'Trek en Corse : le GR20 nord en 7 étapes', categoryId: cat('Randonnées'), subtitle: 'Niveau sportif',
      summary: 'Une semaine de randonnée itinérante sur la partie nord du GR20, accompagnée par un guide de haute montagne.',
      description: paragraphs(5, 110), highlights: 'Lacs d’altitude\nCrêtes du Monte Cinto\nNuits en refuge gardé',
      dateStart: at(200), dateEnd: at(206), regEnd: at(40), minPart: '8', maxPart: '12', minAge: '18',
      photos: [photo('mountain')].filter(Boolean),
      pricing: { enabled: true, mode: 'tranches', outside: '1450' }, contacts: [{ name: 'Paul Leroy', email: 'paul.leroy@exemple.org' }] }, 'Activité longue (≈ 600 mots)');
    c.nouveaute = item({ id: 'v10-nouveaute', title: 'Atelier peinture sur céramique : trois soirées pour créer votre service à thé', categoryId: cat('Dessin'),
      editorial: 'new', createdAt: recent, subtitle: 'Du 30 novembre au 14 décembre 2026 — Trois séances',
      summary: 'Initiation à la peinture sur céramique : chacun repart avec sa création.',
      description: 'Trois séances de deux heures, matériel fourni. Aucun prérequis : l’animatrice accompagne débutants et confirmés.',
      dateStart: at(21), dateEnd: at(35), timeStart: '18:00', timeEnd: '20:00', location: 'Salle des ateliers', maxPart: '10',
      pricing: { enabled: true, mode: 'single', fixed: '25', label: 'Les 3 séances' }, contacts: [{ name: 'Inès Garnier', email: 'ines.garnier@exemple.org' }],
      photos: [photo('games')].filter(Boolean) }, 'Titre long + sous-titre + Nouveauté');
    c.derniere = item({ id: 'v10-derniere', title: 'Soirée œnologie : vins de fête', categoryId: cat('Œnologie'),
      summary: 'Autour d’un bon repas, un œnologue vous fait découvrir quatre vins sur le thème des fêtes.',
      description: 'Entrée, plat, fromages et dessert dans un restaurant partenaire proche du site.',
      dateStart: at(9), timeStart: '19:30', location: 'Restaurant Le Cep, Massy', regEnd: at(3), maxPart: '45',
      pricing: { enabled: true, mode: 'tranches', outside: '65' }, contacts: [{ name: 'Paul Leroy', email: 'paul.leroy@exemple.org' }, { name: 'Sarah Petit', email: '' }],
      photos: [photo('wine')].filter(Boolean) }, 'Dernière chance');
    c.partenaire = item({ id: 'v10-partenaire', type: 'partner', title: 'Librairie Les Pages Vives', categoryId: cat('Informations'),
      partner: { offer: '−15 % sur tout le rayon jeunesse', amount: '−15 %', code: 'CSE2026', validUntil: at(50) },
      description: 'Sur présentation de la carte CSE en magasin.', photos: [photo('books')].filter(Boolean) }, 'Partenaire court');
    c.info = item({ id: 'v10-info', type: 'info', title: 'Dépôt des avis d’imposition 2026', categoryId: cat('Informations'), subtitle: 'Nouvelle procédure',
      summary: 'Le dépôt des avis d’imposition évolue cette année.',
      description: 'Dans le cadre du rapprochement des deux CSE, nous adaptons notre procédure afin de mettre un nouvel outil à votre disposition. Ce changement nécessite un délai supplémentaire de mise en place.\n\nRassurez-vous : **aucune démarche n’est à effectuer pour le moment**. Vous serez informés par la lettre d’information des nouvelles modalités.',
      notes: 'Merci de ne pas envoyer votre avis par e-mail.', contacts: [{ name: 'Accueil CSE', email: 'accueil-cse@exemple.org' }] }, 'Information');
    var month = ref.slice(0, 7), days = {}, dayHours = {};
    for (var d = 1; d <= 31; d++) {
      var iso = month + '-' + D.pad(d);
      if (!D.isValid(iso)) continue;
      var wd = D.weekday(iso);
      if (wd === 0 || wd === 6) continue;
      days[iso] = (wd === 3 || d === 11) ? 'closed' : (d === 12 || d === 26) ? 'special' : 'open';
      if (days[iso] === 'special') dayHours[iso] = '14h30–16h';
    }
    dayHours[month + '-19'] = '9h–12h / 14h–16h'; days[month + '-19'] = 'special';
    c.calendrier = item({ id: 'v10-permanences', type: 'calendar', title: 'Permanences CSE du mois', categoryId: cat('Informations'),
      calendar: { month: month, days: days, dayHours: dayHours, openHours: '13h–16h', service: 'Permanences', hours: 'Bureau du CSE, bâtiment A, rez-de-chaussée.' },
      link: { type: 'none' }, contacts: [{ name: 'Accueil CSE', email: 'accueil-cse@exemple.org' }] }, 'Calendrier des permanences');
    var days2 = {};
    Object.keys(days).forEach(function (k) { days2[k] = D.weekday(k) === 2 || D.weekday(k) === 4 ? 'open' : 'closed'; });
    c.pret = item({ id: 'v10-pret', type: 'calendar', title: 'Prêt de matériel du mois', categoryId: cat('Informations'),
      calendar: { month: month, days: days2, dayHours: {}, openHours: '13h30–14h', service: 'Prêt de matériel', hours: 'Réservation conseillée 48 h à l’avance.',
        catalogUrl: 'https://exemple.org/catalogue', catalogLabel: 'Catalogue du matériel' },
      link: { type: 'none' }, contacts: [{ name: 'Prêt de matériel', email: 'pret-materiel@exemple.org' }] }, 'Calendrier du prêt de matériel');
    var rulesText = ['# Inscriptions', words(70), '- Sur le portail du CSE pour les activités qui le proposent ;', '- Au local du CSE lors d’une permanence ;', '- Par dépôt du bulletin et du règlement dans la boîte aux lettres du CSE.',
      '# Paiement', words(90), '# Désistement', words(120), '- Si la place est réattribuée, seuls les frais engagés sont retenus ;', '- Sinon, la totalité de la participation reste due.', '# Cas particuliers', words(110), '# Assurance', words(80)].join('\n');
    c.regle = item({ id: 'v10-regle', type: 'rules', title: 'Modalités d’inscription aux activités du CSE', subtitle: 'Règlement en vigueur au 1er septembre 2026',
      description: rulesText, notes: 'Toute inscription doit être accompagnée de son règlement.' }, 'Règlement long avec sous-titre');
    c.concert = item({ id: 'v10-concert', title: 'Concert de Noël des ateliers musicaux', categoryId: cat('Musique'), melSection: 'announcements',
      summary: 'Les ateliers musicaux du CSE vous donnent rendez-vous pour leur concert de fin d’année.',
      highlights: 'Ensemble vocal\nÉlèves de piano\nQuatuor à cordes', program: '18h30 - Accueil\n19h00 - Première partie\n20h00 - Entracte\n20h20 - Seconde partie',
      dateStart: at(38), timeStart: '18:30', location: 'Salle Pékin Turin, Massy', photos: [photo('concert')].filter(Boolean),
      contacts: [{ name: 'Lucie Morel', email: 'lucie.morel@exemple.org' }], template: 'animation' }, 'Animation / concert');
    c.immersif = item({ id: 'v10-immersif', title: 'Ludothèque du CSE', type: 'page', categoryId: cat('Animations'),
      summary: 'Plus de 300 jeux de société à emprunter gratuitement, pour tous les âges.',
      description: 'Permanence le jeudi de 13h à 14h au local du CSE.', photos: [photo('games')].filter(Boolean), template: 'immersive' }, 'Immersif');
    c.affiche = item({ id: 'v10-affiche', title: 'Karting en équipe', categoryId: cat('Sports mécaniques'),
      dateStart: at(12), timeStart: '14:00', location: 'Circuit de Trappes', regEnd: at(5), minAge: '16', maxPart: '24',
      pricing: { enabled: true, mode: 'tranches', outside: '80' }, photos: [photo('race')].filter(Boolean), template: 'poster' }, 'Affiche / essentiel');
    // Programme de 20 lignes (B14).
    var rows = [];
    var themes = ['Visite guidée', 'Spectacle', 'Exposition', 'Atelier', 'Concert'];
    for (var r = 0; r < 20; r++) rows.push({ date: at(20 + r * 6), title: themes[r % 5] + ' · ' + ['Le Marais historique', 'Théâtre du quartier', 'Peintres du XIXᵉ siècle', 'Cuisine des fêtes', 'Orchestre de chambre'][r % 5] + (r % 3 === 0 ? ' et rencontre avec les artistes' : ''), location: ['Paris 4ᵉ', 'Massy', 'Paris 7ᵉ', 'Antony', 'Palaiseau'][r % 5], type: themes[r % 5] });
    var issue = M.blankIssue(ref);
    var page = function (it, extra) { return M.normalizePage(Object.assign({ kind: 'item', itemId: it.id }, extra || {})); };
    var cover = M.blankPage('cover');
    cover.opts.important = { label: 'Important', title: 'Demandes de subvention', text: 'En cette fin d’année, les bénévoles traitent un grand nombre de dossiers. Merci de votre patience et de limiter les relances.' };
    cover.opts.extraNotes = ['Le rapprochement avec le CSE voisin se poursuit : nouvelles modalités en janvier.', 'Fermeture exceptionnelle du local le mercredi 11 novembre.'];
    cover.opts.editorial = 'Bonne semaine à toutes et à tous !';
    var news = M.blankPage('news'); news.opts.auto = false; news.opts.ids = [c.nouveaute.id, c.voyagePrix.id, c.concert.id];
    var last = M.blankPage('last');
    var upList = M.normalizePage({ kind: 'upcoming', opts: { style: 'list', auto: false, rows: rows, title: 'Programme des sorties culturelles', subtitle: '1er semestre 2027' } });
    var upTable = M.normalizePage({ kind: 'upcoming', opts: { style: 'table', auto: false, rows: rows.slice(0, 12), title: 'Prévision des sorties culturelles', subtitle: 'Inscriptions bientôt ouvertes' } });
    issue.pages = [cover, page(c.calendrier), page(c.pret), page(c.info), last, page(c.derniere), news, page(c.nouveaute),
      page(c.voyagePrix), page(c.voyageSupLong), page(c.voyageSans), page(c.grandsPrix), page(c.courte), page(c.longue),
      page(c.concert), page(c.immersif), page(c.affiche), page(c.partenaire), upList, upTable, page(c.regle)];
    p.issues = [issue]; p.activeIssueId = issue.id;
    return { project: p, issue: issue, items: c, labels: labels, words: words };
  }
  return { build: build, words: words };
});
