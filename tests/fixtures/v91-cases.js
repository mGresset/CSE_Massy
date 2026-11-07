/* Cas de référence V9.1 (données fictives) : captures avant/après et tests de parité HTML/PPTX.
 * 1. Voyage avec tarifs T1–T10 (fiche dense, type « Voyage 1 »)  2. Voyage sans tarifs
 * 3. Nouveauté  4. Dernière chance  5. Permanences (ouvert / fermé / horaires particuliers)
 * Compatible avec les données V9 (le calendrier utilise l'ancien statut « short » pour tester la reprise). */
(function (root, factory) {
  'use strict';
  var mod = factory();
  root.CSE_CASES = mod;
  if (typeof module === 'object' && module.exports) module.exports = mod;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  function build(CSE, ref, photo) {
    var M = CSE.model, D = CSE.dates;
    ref = ref || '2026-11-09';
    photo = photo || function () { return ''; };
    var at = function (n) { return D.addDays(ref, n); };
    var p = M.blankProject();
    var cat = function (name) { var c = p.categories.find(function (x) { return x.name === name; }); return c ? c.id : ''; };
    var old = '2026-09-01T09:00:00.000Z', recent = at(-2) + 'T09:00:00.000Z';
    var desc = 'Circuit découverte au rythme de chacun, avec un guide local francophone, des visites incontournables et des moments libres pour profiter des marchés et de la gastronomie. ' +
      'Les hébergements sont choisis pour leur confort et leur situation, au cœur des villes ou au calme. Les transferts se font en car climatisé et des pauses régulières sont prévues.\n\n' +
      'Chaque journée alterne visites guidées, découvertes culturelles et temps de détente. Le programme peut être légèrement adapté sur place selon la météo et les conditions locales, sans réduire les prestations prévues.';
    var program = 'Jour 1 : vol et installation, dîner de bienvenue\nJour 2 : visite de la vieille ville et du marché couvert\nJour 3 : excursion dans les montagnes et déjeuner chez l’habitant\nJour 4 : temples et jardins, après-midi libre\nJour 5 : croisière sur le fleuve et spectacle traditionnel\nJour 6 : retour';
    var base = {
      type: 'activity', categoryId: cat('Voyages'), subtitle: 'Vacances de printemps', location: 'Circuit 6 jours',
      summary: 'Un voyage découverte complet, entre patrimoine, nature et rencontres, encadré par un guide local.',
      description: desc, program: program,
      transport: 'Vols A/R, transferts en car climatisé.', lodging: 'Hôtels 3* en chambre double, pension complète.',
      dateStart: at(150), dateEnd: at(155), regEnd: at(27), minPart: '20', maxPart: '35', minAge: '12',
      points: { value: '18', counter: 'long' }, carbon: '620 kg CO₂e (vol A/R)',
      contacts: [{ name: 'Camille Martin', email: 'camille.martin@exemple.org', phone: '01 23 45 67 89', role: 'Référente voyages' }, { name: 'Louis Bernard', email: 'louis.bernard@exemple.org' }],
      photos: [photo('travel'), photo('temple')].filter(Boolean), createdAt: old
    };
    function item(o) { var it = M.normalizeItem(Object.assign(M.blankItem(o.type || 'activity'), o)); it.createdAt = o.createdAt || old; p.items.push(it); return it; }
    var withPrices = item(Object.assign({}, base, { id: 'cas-voyage-tarifs', title: 'Voyage 1 · Circuit découverte en six jours', pricing: { enabled: true, mode: 'tranches', outside: '2400', label: 'Chambre double' } }));
    var noPrices = item(Object.assign({}, base, { id: 'cas-voyage-sans', title: 'Voyage 1 · Circuit découverte en six jours', pricing: { enabled: false } }));
    var news = item({ id: 'cas-nouveaute', title: 'Atelier peinture sur céramique', categoryId: cat('Dessin'), editorial: 'new', createdAt: recent,
      summary: 'Initiation à la peinture sur céramique : chacun repart avec sa création.',
      description: 'Trois séances de deux heures, matériel fourni. Aucun prérequis : l’animatrice accompagne débutants et confirmés.',
      dateStart: at(20), timeStart: '18:00', timeEnd: '20:00', location: 'Salle des ateliers', maxPart: '10',
      pricing: { enabled: true, mode: 'single', fixed: '25', label: 'Les 3 séances' }, contacts: [{ name: 'Inès Garnier', email: 'ines.garnier@exemple.org' }], photos: [photo('games')].filter(Boolean) });
    var last = item({ id: 'cas-derniere-chance', title: 'Soirée œnologie : vins de fête', categoryId: cat('Œnologie'), editorial: 'new', createdAt: recent,
      summary: 'Autour d’un bon repas, un œnologue vous fait découvrir quatre vins sur le thème des fêtes.',
      description: 'Entrée, plat, fromages et dessert dans un restaurant partenaire proche du site.',
      dateStart: at(9), timeStart: '19:30', location: 'Restaurant Le Cep, Massy', regEnd: at(2), maxPart: '45',
      pricing: { enabled: true, mode: 'tranches', outside: '65' }, contacts: [{ name: 'Paul Leroy', email: 'paul.leroy@exemple.org' }, { name: 'Sarah Petit', email: 'adresse-invalide' }], photos: [photo('wine')].filter(Boolean) });
    var month = ref.slice(0, 7), days = {};
    for (var d = 1; d <= 31; d++) {
      var iso = month + '-' + D.pad(d);
      if (!D.isValid(iso)) continue;
      var wd = D.weekday(iso);
      if (wd === 0 || wd === 6) continue;
      days[iso] = d === 11 ? 'closed' : d === 12 || d === 26 ? 'short' : d === 19 ? 'special' : 'open';
    }
    var cal = item({ id: 'cas-permanences', type: 'calendar', title: 'Permanences CSE du mois', categoryId: cat('Informations'),
      calendar: { month: month, days: days, dayHours: { }, statuses: [{ key: 'open', label: 'Permanence 13h–16h', color: '#8BC34A' }, { key: 'short', label: 'Ouverture 9h–12h', color: '#FFE45C' }, { key: 'closed', label: 'Fermé', color: '#E5484D' }],
        service: 'Permanences', hours: 'Bureau du CSE, bâtiment A, rez-de-chaussée.', note: '' },
      contacts: [{ name: 'Accueil CSE', email: 'accueil-cse@exemple.org' }] });
    cal.calendar.dayHours = cal.calendar.dayHours || {};
    cal.calendar.dayHours[month + '-19'] = '14h–17h';
    var issue = M.blankIssue(ref);
    issue.pages = [withPrices, noPrices, news, last, cal].map(function (it) { return M.blankPage('item', { itemId: it.id }); });
    p.issues = [issue]; p.activeIssueId = issue.id;
    return { project: p, issue: issue, labels: ['Voyage avec tarifs', 'Voyage sans tarifs', 'Nouveauté', 'Dernière chance', 'Permanences'] };
  }
  return { build: build };
});
