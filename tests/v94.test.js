'use strict';
const { assert, test, done } = require('./lib/assert-ext');
const { load } = require('./lib/env');
const C = load();
const M = C.model, CO = C.compose;
const REF = '2026-11-09', OLD = '2026-08-01T00:00:00.000Z';
const p = M.blankProject();
function item(type, title, data) {
  const it = M.normalizeItem(Object.assign(M.blankItem(type), { title, createdAt: OLD, dateStart: '2027-02-01' }, data || {}));
  p.items.push(it); return it;
}
const calendar = item('calendar', 'Ouverture des permanences');
const info = item('info', 'Informations importantes');
const last = item('activity', 'Dernière chance', { regEnd: '2026-11-11' });
const news = item('activity', 'Voyage nouveau', { editorial: 'new' });
const ongoing = item('activity', 'Voyage en cours', { regEnd: '2026-12-15' });
const announce = item('activity', 'Concert de Noël', { melSection: 'announcements', regEnd: '2026-12-15' });
const partner = item('partner', 'Offre partenaire');
const planning = item('activity', 'Programme prévisionnel', { melSection: 'planning', regEnd: '2026-12-20' });
const rules = item('rules', 'Règlement du CSE');
const is = M.blankIssue(REF);
function page(it) { return M.blankPage('item', { itemId: it.id }); }
const exp = ['cover', 'opening', 'important', 'last', 'new', 'ongoing', 'announcements', 'partners', 'planning', 'rules'];

test('V9.4 — le classement éditorial reste fixé, même si les pages sont insérées en désordre', () => {
  const pages = [page(rules), page(planning), page(partner), page(announce), page(ongoing), page(news), page(last), page(info), page(calendar), M.blankPage('cover')];
  const ordered = CO.enforceOrder(pages, p, is);
  assert.deepEqual(ordered.map(pg => CO.sectionForPage(pg, p, is)), exp);
  assert.equal(ordered[1].itemId, calendar.id, 'les ouvertures sont juste après la couverture');
  assert.equal(ordered[ordered.length - 1].itemId, rules.id);
  assert.deepEqual(CO.enforceOrder(ordered, p, is).map(x => x.id), ordered.map(x => x.id), 'tri idempotent');
});

test('V9.4 — les annonces sont une affectation séparée de la catégorie', () => {
  assert.equal(announce.melSection, 'announcements');
  assert.equal(CO.sectionForPage(page(announce), p, is), 'announcements');
  const x = M.normalizeItem(Object.assign({}, announce, { melSection: 'incorrect' }));
  assert.equal(x.melSection, 'auto', 'les données étrangères sont neutralisées');
});

test('V9.4 — l’actualisation garde l’identité des pages, les textes édités et les exclusions', () => {
  const initial = CO.autoCompose(p, is);
  is.pages = initial;
  const ap = is.pages.find(pg => pg.itemId === announce.id);
  const cover = is.pages.find(pg => pg.kind === 'cover');
  ap.template = 'animation'; ap.included = false; ap.opts.useOverrides = true;
  ap.opts.override = { title: 'Concert — version propre au MEL', summary: 'Nouvelle version' };
  cover.opts.important.title = 'Information prioritaire personnalisée';
  const extra = M.blankPage('upcoming', { opts: { style: 'table', auto: false, rows: [{ title: 'Information manuelle', date: '2027-02-15' }] } });
  is.pages.push(extra);
  const updated = CO.refreshPreservingEdits(p, is);
  const copy = updated.find(pg => pg.itemId === announce.id);
  assert.strictEqual(copy, ap, 'l’original n’est pas recréé');
  assert.equal(copy.included, false);
  assert.equal(copy.template, 'animation');
  assert.equal(copy.opts.override.title, 'Concert — version propre au MEL');
  assert.strictEqual(updated.find(x => x.kind === 'cover'), cover);
  assert.ok(updated.includes(extra), 'pages manuelles conservées');
  assert.deepEqual(updated.map(pg => CO.sectionForPage(pg, p, is)), updated.map(pg => CO.sectionForPage(pg, p, is)).slice().sort((a,b) => exp.indexOf(a)-exp.indexOf(b)));
});

test('V9.4 — une surcharge modifie seulement la slide du MEL, sans toucher la fiche source', () => {
  const pg = page(ongoing);
  const issue = M.blankIssue(REF);
  const originalTitle = ongoing.title;
  pg.opts = { useOverrides: true, override: { title: 'Titre édité seulement dans ce MEL', summary: 'Informations adaptées à cette semaine' } };
  const slides = C.templates.renderPage(pg, p, issue);
  const txt = slides.flatMap(s => s.items.filter(x => x.t === 'text').flatMap(x => x.paras.flatMap(y => y.runs.map(r=>r.text)))).join(' ');
  assert.ok(txt.includes('Titre édité seulement dans ce MEL'), 'visible dans la diapositive');
  assert.equal(ongoing.title, originalTitle, 'la fiche source reste inchangée');
  const normal = C.templates.renderPage(page(ongoing), p, issue).flatMap(s=>s.items.filter(x=>x.t==='text').flatMap(x=>x.paras.flatMap(y=>y.runs.map(r=>r.text)))).join(' ');
  assert.ok(!normal.includes('Titre édité seulement dans ce MEL'));
  const normalizedPage = M.normalizePage(pg);
  assert.equal(normalizedPage.opts.override.title, 'Titre édité seulement dans ce MEL', 'les surcharges survivent aux sauvegardes JSON');
});

test('V9.4 — composition automatique respecte l’ordre de toutes les rubriques', () => {
  const pages = CO.autoCompose(p, is);
  const groups = pages.map(pg=>CO.sectionForPage(pg,p,is));
  assert.deepEqual(groups, groups.slice().sort((a,b)=>exp.indexOf(a)-exp.indexOf(b)));
  assert.equal(groups[0], 'cover');
  assert.equal(groups[1], 'opening');
  assert.equal(groups[groups.length-1], 'rules');
});
test('V9.4 — une page retirée reste absente lors des actualisations, mais peut être réintégrée', () => {
  const issue = M.blankIssue(REF);
  issue.pages = CO.autoCompose(p, issue);
  issue.suppressed = [CO.pageKey(issue.pages.find(pg => pg.itemId === ongoing.id))];
  issue.pages = issue.pages.filter(pg => pg.itemId !== ongoing.id);
  const refreshed = CO.refreshPreservingEdits(p, issue);
  assert.ok(!refreshed.some(pg => pg.itemId === ongoing.id), 'le retrait manuel est respecté');
  assert.deepEqual(M.normalizeIssue(issue).suppressed, issue.suppressed, 'le retrait survit aux sauvegardes');
  issue.suppressed = [];
  assert.ok(CO.refreshPreservingEdits(p, issue).some(pg => pg.itemId === ongoing.id), 'la réintégration explicite fonctionne');
});
done('V9.4 — composition durable et ordre éditorial');
