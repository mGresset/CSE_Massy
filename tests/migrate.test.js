/* Migrations : V6 (éditeur), V7/V8 (compositeur), sauvegardes JSON — aucune perte silencieuse. */
'use strict';
const { assert, test, done } = require('./lib/assert-ext');
const { load } = require('./lib/env');
const C = load();
const M = C.model, MG = C.migrate;

function memStorage(o) { return { getItem: (k) => (k in o ? o[k] : null), setItem: (k, v) => { o[k] = String(v); }, key: (i) => Object.keys(o)[i], get length() { return Object.keys(o).length; } }; }
const V6 = {
  'act-1': { title: 'Week-end à Bruges', category: 'Week-ends', location: 'Bruges', venue: 'Hôtel du Canal', activityStart: '2026-12-12', activityEnd: '2026-12-13', summary: 'Résumé', highlights: 'A\nB', included: 'Car\nHôtel', administrative: 'CNI', warning: 'Places limitées', priceLabel: 'Par personne', outsidePrice: '400', pricingMode: 'tranches', showPricing: true, rates: [80, 75, 70, 65, 60, 55, 50, 45, 40, 35], registrationEnd: '2026-11-12', status: 'Complet', minimum: '10', maximum: '40', points: '4 points', pointCounter: 'short', contacts: [{ name: 'Alice', email: 'alice@exemple.org' }], linkType: 'custom', customUrl: 'https://www.exemple.org/x', ctaLabel: 'Réserver', editorialStatus: 'approved', internalReference: 'WE-1', template: 'hero', updatedAt: '2026-10-20T10:00:00.000Z' },
  'act-2': { title: 'Info', category: 'Catégorie inconnue', template: 'info', summary: 'Texte', showPricing: false, pricingMode: 'fixedEuro', fixedEuro: '12' }
};
const V8 = { settings: { week: 46, year: 2026, newsletterDate: '2026-11-09', title: 'MEL DU CSE', cseUrl: 'https://cethaleslasmassy.portailce.com/', footer: 'Pied', rates: [70, 65, 60, 55, 50, 45, 40, 35, 30, 25] }, slides: [
  { id: 's1', kind: 'cover', title: 'MEL', included: true, highlight: 'Important', details: 'Édito' },
  { id: 's2', kind: 'calendar', title: 'Permanences', calendarMonth: '2026-11', scheduleDays: { '2026-11-02': 'open', '2026-11-04': 'short' }, openHours: '13h–16h', shortHours: '14h30–16h', catalogueUrl: 'https://www.exemple.org/c' },
  { id: 's3', kind: 'activity', section: 'Nouveautés', title: 'Atelier dessin', category: 'Dessins', date: '2026-12-01', deadline: '2026-11-25', description: 'Desc', details: 'Détails', highlight: 'Encart', contact: 'Claire Petit claire@exemple.org\nDenis', priceEnabled: true, pricingMode: 'manuel', manualPrices: '10,12,14,16,18,20,22,24,26,28', age: 'Dès 12 ans', density: 'compact', points: '2', counter: 'france', carbon: '12 kg' },
  { id: 's4', kind: 'partner', title: 'Opticien', included: false, highlight: '-20 %', code: 'CSE20', deadline: '2026-12-31' },
  { id: 's5', kind: 'newsgrid', title: 'Nouveautés', featureIds: ['s3'], smartCategory: 'Dessins' },
  { id: 's6', kind: 'lastboard', title: 'Urgences' },
  { id: 's7', kind: 'table', title: 'Sorties', agendaRows: [{ date: '2027-01-15', title: 'Musée', location: 'Paris', status: 'Visite' }] },
  { id: 's8', kind: 'agenda', title: 'Œnologie', agendaRows: [{ date: '2027-02-01', title: 'Soirée', location: '', status: '' }] },
  { id: 's9', kind: 'rules', title: 'Modalités', description: 'P1\n\nP2', details: 'P3', highlight: 'Paiement' },
  { id: 's10', kind: 'deadline', section: 'Dernière semaine', title: 'Karting' },
  { id: 's11', kind: 'immersive', title: 'EXEMPLE — Visuel immersif 17' }
] };

test('migration du navigateur V6 + V8 : toutes les données reprises, clés d’origine intactes', () => {
  const store = { 'cse-studio-massy:v6:categories': JSON.stringify(['Informations', 'Week-ends', 'Musiques', 'Dessins', 'Bien-être']), 'cse-studio-massy:v1:activities': JSON.stringify(V6), 'cse-studio-massy:v7:mel': JSON.stringify(V8) };
  const before = JSON.stringify(store);
  const r = MG.fromLegacyStorage(memStorage(store));
  assert.equal(JSON.stringify(store), before, 'aucune clé modifiée');
  const p = r.project;
  const byTitle = (t) => p.items.find((x) => x.title === t);
  // Catégories : personnalisées conservées, « Catégorie inconnue » créée, Informations en premier.
  const names = p.categories.map((c) => c.name);
  assert.equal(names[0], 'Informations');
  for (const n of ['Bien-être', 'Musiques', 'Catégorie inconnue', 'Dessins']) assert.ok(names.includes(n), n);
  // V6
  const b = byTitle('Week-end à Bruges');
  assert.equal(b.pricing.mode, 'manual', 'barème propre → prix figés');
  assert.deepEqual(b.pricing.manual, ['80', '100', '120', '140', '160', '180', '200', '220', '240', '260']);
  assert.equal(b.regStatus, 'full'); assert.equal(b.template, 'immersive'); assert.equal(b.editorialStatus, 'approved');
  assert.equal(b.points.value, '4'); assert.equal(b.points.counter, 'short');
  assert.equal(b.link.type, 'custom'); assert.equal(b.link.label, 'Réserver');
  assert.equal(b.address, 'Hôtel du Canal'); assert.equal(b.conditions, 'CNI'); assert.equal(b.notes, 'Places limitées');
  assert.ok(/Car/.test(b.description) && /Hôtel/.test(b.description), 'prestations incluses conservées');
  assert.equal(b.legacy.raw.internalReference, 'WE-1', 'valeurs d’origine conservées');
  const info = byTitle('Info');
  assert.equal(info.type, 'info'); assert.equal(info.pricing.enabled, false); assert.equal(info.pricing.mode, 'fixed');
  // V8
  const cal = byTitle('Permanences');
  assert.equal(cal.type, 'calendar'); assert.equal(cal.calendar.days['2026-11-04'], 'short'); assert.equal(cal.calendar.statuses[0].label, 'Permanence 13h–16h');
  const d = byTitle('Atelier dessin');
  assert.equal(d.pricing.manual.length, 10); assert.equal(d.editorial, 'new'); assert.equal(d.density, 'compact');
  assert.deepEqual(d.contacts.map((c) => c.name + '|' + c.email), ['Claire Petit|claire@exemple.org', 'Denis|']);
  assert.equal(d.minAge, 'Dès 12 ans'); assert.equal(d.points.counter, 'france'); assert.equal(d.carbon, '12 kg');
  assert.ok(/Détails/.test(d.description)); assert.equal(d.notes, 'Encart');
  assert.equal(byTitle('Opticien').partner.code, 'CSE20');
  assert.equal(byTitle('Karting').forceLast, true, 'section Dernière semaine sans date → exception manuelle');
  assert.equal(byTitle('Modalités').notes, 'Paiement'); assert.ok(/P3/.test(byTitle('Modalités').description));
  assert.equal(byTitle('EXEMPLE — Visuel immersif 17').archived, true, 'exemples V8 archivés, pas supprimés');
  // Numéro
  const is = p.issues[0];
  assert.equal(is.refDate, '2026-11-09'); assert.equal(is.week, 46);
  assert.equal(is.pages.length, V8.slides.length, 'une page par diapositive V8');
  assert.equal(is.pages[0].opts.important.text, 'Important');
  const opt = is.pages.find((pg) => pg.itemId === byTitle('Opticien').id);
  assert.equal(opt.included, false, 'page exclue conservée');
  const news = is.pages.find((pg) => pg.kind === 'news');
  assert.deepEqual(news.opts.ids, [d.id]);
  assert.equal(is.pages.find((pg) => pg.kind === 'upcoming' && pg.opts.style === 'table').opts.rows[0].title, 'Musée');
  assert.equal(p.settings.footerNote, 'Pied');
});
test('import des sauvegardes JSON de toutes les versions', () => {
  const cur = M.blankProject();
  const r1 = MG.fromBackup(Object.assign({ schema: 'cse-studio:mel-v7' }, V8), cur);
  assert.equal(r1.project.items.length, 6); assert.equal(r1.project.issues[0].pages.length, 11);
  const r2 = MG.fromBackup({ schema: 'cse-studio:3-library', categories: ['Voyages'], activities: Object.values(V6) }, cur);
  assert.equal(r2.project.items.length, 2);
  const r3 = MG.fromBackup({ schema: 'cse-studio:2', activity: V6['act-1'] }, cur);
  assert.equal(r3.project.items[0].title, 'Week-end à Bruges');
  assert.throws(() => MG.fromBackup({ schema: 'autre' }, cur), /non reconnu/);
});
test('sauvegarde V9 : aller-retour sans perte et fusion sans écrasement', () => {
  const p = C.demo.build('2026-11-09');
  p.trash = [{ at: '2026-11-01T00:00:00.000Z', item: M.normalizeItem({ title: 'Supprimée' }) }];
  const json = JSON.parse(JSON.stringify(Object.assign({ schema: M.SCHEMA }, p)));
  const back = MG.fromBackup(json, M.blankProject());
  assert.equal(back.full, true);
  const again = M.normalizeProject(back.project);
  assert.equal(again.items.length, p.items.length);
  assert.equal(again.trash.length, 1, 'la corbeille est conservée');
  assert.deepEqual(again.items.map((x) => x.title), p.items.map((x) => x.title));
  const merged = MG.merge(p, back.project);
  assert.equal(merged.items.length, p.items.length * 2, 'fusion = ajout');
  assert.equal(new Set(merged.items.map((x) => x.id)).size, merged.items.length, 'identifiants uniques');
  const is = merged.issues[1];
  assert.ok(is.pages.filter((pg) => pg.kind === 'item').every((pg) => merged.items.some((x) => x.id === pg.itemId)), 'références réécrites');
});
done('migrations et sauvegardes');
