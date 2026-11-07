/* MEL témoin V10 : 33 diapositives FICTIVES couvrant les 13 modèles (aucune donnée du MEL réel).
 * Construit à partir des cas de référence V10, complétés par quelques fiches supplémentaires. */
(function (root, factory) {
  'use strict';
  var mod = factory();
  root.CSE_V10_DEMO = mod;
  if (typeof module === 'object' && module.exports) module.exports = mod;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  function build(CSE, ref, photo) {
    var cases = (typeof module === 'object' && module.exports ? require('./v10-cases.js') : (typeof window !== 'undefined' ? window : globalThis).CSE_V10_CASES).build(CSE, ref, photo);
    var M = CSE.model, D = CSE.dates, p = cases.project, issue = cases.issue;
    var at = function (n) { return D.addDays(ref, n); };
    var cat = function (name) { var c = p.categories.find(function (x) { return x.name === name; }); return c ? c.id : ''; };
    function add(o) { var it = M.normalizeItem(Object.assign(M.blankItem(o.type || 'activity'), o)); it.createdAt = o.createdAt || '2026-09-01T09:00:00.000Z'; it.editorialStatus = 'approved'; p.items.push(it); issue.pages.push(M.blankPage('item', { itemId: it.id })); return it; }
    add({ id: 'demo-visite', title: 'Visite guidée : les passages couverts de Paris', categoryId: cat('Sorties culturelles'), subtitle: 'Samedi matin',
      summary: 'Une promenade de deux heures entre galeries et passages du XIXᵉ siècle, avec une conférencière.',
      description: 'Rendez-vous devant l’entrée de la galerie à 9h45. Prévoir de bonnes chaussures : environ trois kilomètres de marche à allure tranquille.',
      dateStart: at(26), timeStart: '10:00', timeEnd: '12:00', location: 'Paris 2ᵉ', regEnd: at(18), maxPart: '25',
      pricing: { enabled: true, mode: 'tranches', outside: '18' }, contacts: [{ name: 'Lucie Morel', email: 'lucie.morel@exemple.org' }], photos: [photo('temple')].filter(Boolean) });
    add({ id: 'demo-raquettes', title: 'Week-end raquettes dans le Vercors', categoryId: cat('Week-ends'),
      summary: 'Deux jours de balades en raquettes encadrées, nuit en gîte et repas montagnards.',
      description: 'Départ en autocar le samedi à 6h30, retour le dimanche vers 21h. Niveau facile à moyen, matériel fourni. Les groupes sont constitués selon le rythme de chacun.',
      dateStart: at(75), dateEnd: at(76), regEnd: at(45), minPart: '15', maxPart: '30', points: { value: '6', counter: 'short' },
      pricing: { enabled: true, mode: 'tranches', outside: '320', notes: 'Supplément chambre individuelle : 40 €' }, contacts: [{ name: 'Paul Leroy', email: 'paul.leroy@exemple.org' }], photos: [photo('snow'), photo('mountain')].filter(Boolean) });
    add({ id: 'demo-partenaire-2', type: 'partner', title: 'Cinéma Le Grand Écran', categoryId: cat('Informations'), subtitle: 'Billetterie CSE',
      partner: { offer: 'Places à tarif réduit toute l’année, y compris les avant-premières', amount: '6,50 €', code: '', validUntil: at(200) },
      description: 'Billets électroniques à commander sur le portail du CSE, dans la limite de 10 places par mois et par salarié. Valables dans toutes les salles du réseau, hors séances spéciales.', photos: [photo('concert')].filter(Boolean) });
    add({ id: 'demo-info-2', type: 'info', title: 'Chèques cadeaux de fin d’année', categoryId: cat('Informations'),
      summary: 'Les chèques cadeaux seront distribués à partir du 1er décembre.',
      description: 'Ils sont remis en main propre au local du CSE pendant les permanences, sur présentation du badge.\n\n- Retrait possible par un collègue muni d’une procuration ;\n- Envoi postal pour les salariés en télétravail permanent, sur demande.',
      contacts: [{ name: 'Accueil CSE', email: 'accueil-cse@exemple.org' }] });
    add({ id: 'demo-couture', title: 'Atelier couture du lundi', categoryId: cat('Couture'), editorial: 'ongoing',
      summary: 'Débutants ou initiés, venez avec votre projet : nous le réaliserons ensemble.',
      description: 'Le lundi de 17h à 19h, environ onze ateliers par trimestre. Machines à disposition.',
      location: 'Salle des ateliers', dateStart: at(7), dateEnd: at(70), maxPart: '8', pricing: { enabled: true, mode: 'single', fixed: '132', label: 'Le trimestre' }, photos: [photo('games')].filter(Boolean), template: 'poster' });
    issue.pages = CSE.compose.enforceOrder(issue.pages, p, issue);
    issue.title = 'MEL DU CSE (DÉMONSTRATION)';
    return { project: p, issue: issue, labels: cases.labels };
  }
  return { build: build };
});
