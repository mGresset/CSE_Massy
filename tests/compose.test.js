/* Règles éditoriales : dernière semaine, nouveautés, en cours, ordre du MEL, contrôles. */
'use strict';
const { assert, test, done } = require('./lib/assert-ext');
const { load } = require('./lib/env');
const C = load();
const M = C.model, CO = C.compose;
const REF = '2026-11-09';
const S = M.normalizeSettings({});
const OLD = '2026-09-01T10:00:00.000Z';
const act = (o) => M.normalizeItem(Object.assign(M.blankItem('activity'), { title: 'Activité', createdAt: OLD }, o));

test('catégories initiales : « Informations » en premier, 14 valeurs', () => {
  const cats = M.defaultCategories();
  assert.equal(cats.length, 14);
  assert.equal(cats[0].name, 'Informations');
  assert.deepEqual(cats.map((c) => c.name), ['Informations', 'Voyages', 'Week-ends', 'Sorties culturelles', 'Animations', 'Musique', 'Œnologie', 'Randonnées', 'Sport', 'Sports mécaniques', 'Parapente', 'Couture', 'Dessin', 'La Ruche']);
  const n = M.normalizeCategories([{ name: 'Voyages' }, { name: 'Informations' }, 'Voyages', '']);
  assert.equal(n[0].name, 'Informations'); assert.equal(n.length, 2);
});
test('dernière semaine : clôture entre la date du MEL et J+7 inclus', () => {
  assert.equal(CO.classify(act({ regEnd: '2026-11-09' }), REF, S).rubric, 'last');
  assert.equal(CO.classify(act({ regEnd: '2026-11-16' }), REF, S).rubric, 'last');
  assert.equal(CO.classify(act({ regEnd: '2026-11-17' }), REF, S).rubric, 'ongoing');
  const closed = CO.classify(act({ regEnd: '2026-11-08' }), REF, S);
  assert.equal(closed.rubric, 'closed'); assert.equal(closed.isLast, false);
  assert.equal(CO.classify(act({ regEnd: '2026-11-12' }), REF, S).daysLeft, 3);
});
test('exceptions manuelles', () => {
  assert.equal(CO.classify(act({ regEnd: '2026-12-20', forceLast: true }), REF, S).rubric, 'last');
  assert.equal(CO.classify(act({ regEnd: '2026-11-10', excludeLast: true }), REF, S).rubric, 'ongoing');
  assert.equal(CO.classify(act({ regEnd: '2026-11-01', forceLast: true }), REF, S).rubric, 'closed', 'jamais une inscription close');
  assert.equal(CO.classify(act({ regEnd: '2026-11-10', regStatus: 'full' }), REF, S).isLast, false);
});
test('nouveautés : statut explicite ou création récente (règle configurable)', () => {
  assert.equal(CO.classify(act({ editorial: 'new' }), REF, S).rubric, 'new');
  assert.equal(CO.classify(act({ createdAt: '2026-11-05T09:00:00.000Z' }), REF, S).rubric, 'new');
  assert.equal(CO.classify(act({ createdAt: '2026-11-05T09:00:00.000Z' }), REF, Object.assign({}, S, { newDays: 0 })).rubric, 'ongoing');
  assert.equal(CO.classify(act({ editorial: 'new', regEnd: '2026-11-10' }), REF, S).rubric, 'last', 'la dernière chance prime');
  assert.equal(CO.classify(act({ editorial: 'ongoing', createdAt: '2026-11-08T09:00:00.000Z' }), REF, S).rubric, 'ongoing', 'surclassement en cours');
});
test('à venir, expirée, annulée', () => {
  assert.equal(CO.classify(act({ regStart: '2026-12-01' }), REF, S).rubric, 'upcoming');
  assert.equal(CO.classify(act({ dateStart: '2026-10-01' }), REF, S).rubric, 'expired');
  assert.equal(CO.classify(act({ regStatus: 'cancelled' }), REF, S).rubric, 'cancelled');
  assert.equal(CO.classify(M.normalizeItem({ type: 'info', title: 'i', dateEnd: '2026-11-01' }), REF, S).rubric, 'expired');
});
test('composition automatique : couverture en tête, règlement en fin, rubriques ordonnées', () => {
  const p = M.blankProject();
  p.items = [
    M.normalizeItem({ type: 'rules', title: 'Règlement', createdAt: OLD }),
    act({ title: 'En cours A', regEnd: '2026-12-15' }),
    act({ title: 'Urgent', regEnd: '2026-11-11' }),
    act({ title: 'Nouveau', editorial: 'new' }),
    M.normalizeItem({ type: 'calendar', title: 'Permanences', createdAt: OLD }),
    M.normalizeItem({ type: 'info', title: 'Info', createdAt: OLD }),
    M.normalizeItem({ type: 'partner', title: 'Partenaire', createdAt: OLD }),
    act({ title: 'Archivée', archived: true }),
    act({ title: 'Expirée', dateStart: '2026-10-01' })
  ];
  const issue = M.blankIssue(REF);
  const pages = CO.autoCompose(p, issue);
  const labels = pages.map((pg) => pg.kind === 'item' ? CO.findItem(p, pg.itemId).title : pg.kind);
  assert.deepEqual(labels, ['cover', 'Permanences', 'Info', 'last', 'Urgent', 'news', 'Nouveau', 'En cours A', 'Partenaire', 'Règlement']);
  // Le règlement revient en fin même après déplacement manuel.
  const moved = [pages[pages.length - 1]].concat(pages.slice(0, -1));
  const fixed = CO.enforceOrder(moved, p);
  assert.equal(fixed[0].kind, 'cover');
  assert.equal(CO.findItem(p, fixed[fixed.length - 1].itemId).title, 'Règlement');
});
test('sélections : mosaïques automatiques et manuelles', () => {
  const p = M.blankProject();
  p.items = [act({ title: 'B', regEnd: '2026-11-14' }), act({ title: 'A', regEnd: '2026-11-10' }), act({ title: 'C', regEnd: '2026-11-30' })];
  const issue = M.blankIssue(REF);
  const last = M.blankPage('last');
  assert.deepEqual(CO.selection(last, p, issue).map((x) => x.title), ['A', 'B'], 'triées par échéance, C exclue');
  last.opts.auto = false; last.opts.ids = [p.items[2].id];
  assert.deepEqual(CO.selection(last, p, issue).map((x) => x.title), ['C']);
});
test('contrôles : doublons, dates manquantes, URL invalides, fiches expirées', () => {
  const p = M.blankProject();
  const a = act({ title: 'Karting', dateStart: '2026-12-01' }), b = act({ title: 'karting ', dateStart: '2026-12-01' });
  const c = act({ title: 'Sans date' });
  const d = act({ title: 'Mauvais lien', dateStart: '2026-12-01', link: { type: 'custom', url: 'javascript:alert(1)' } });
  const e = act({ title: 'Passée', dateStart: '2026-10-01' });
  p.items = [a, b, c, d, e];
  assert.equal(CO.duplicates(p).length, 1);
  assert.ok(CO.checkItem(c, p, REF).some((x) => /Date de l’activité manquante/.test(x[1])));
  assert.ok(CO.checkItem(d, p, REF).some((x) => x[0] === 'block' && /lien/.test(x[1])));
  assert.equal(CO.linkOf(d, p.settings), '', 'aucun lien dangereux exporté');
  assert.ok(CO.checkItem(e, p, REF).some((x) => /expirée/.test(x[1])));
  const issue = M.blankIssue(REF);
  issue.pages = [M.blankPage('item', { itemId: e.id }), M.blankPage('item', { itemId: 'inexistante' })];
  const au = CO.audit(p, issue);
  assert.ok(au.some((x) => /Doublon/.test(x.msg)));
  assert.ok(au.some((x) => /supprimée/.test(x.msg)));
  assert.ok(au.some((x) => /expirée/.test(x.msg)));
});
test('information sans date ni tarif : aucune exigence inutile', () => {
  const p = M.blankProject();
  const info = M.normalizeItem({ type: 'info', title: 'Info administrative' });
  assert.equal(CO.checkItem(info, p, REF).filter((x) => x[0] !== 'info').length, 0);
});
done('règles éditoriales et composition');
