/* V9.4.2 — Cartouche tarifaire sur trois lignes, 4/4/2. */
'use strict';
const { assert, test, done } = require('./lib/assert-ext');
const { load } = require('./lib/env');
const C = load(), M = C.model;
const p = M.blankProject();
p.items = [M.normalizeItem({ id: 'tariff-v942', type: 'activity', title: 'Séjour Costa Rica',
  description: 'Découvrir les paysages et la nature. Programme et visites guidées.',
  dateStart: '2027-02-15', dateEnd: '2027-02-28',
  pricing: { enabled: true, mode: 'tranches', outside: '3000', label: 'Chambre double' },
  contacts: [{name:'Référent'}], minPart: 10, maxPart: 25 })];
function render() {return C.templates.renderPage(M.blankPage('item', {itemId:'tariff-v942',template:'classic'}),p,M.blankIssue('2026-11-09'));}
test('Le cartouche est à gauche, plus étroit, et contient 10 tarifs en 3 lignes', () => {
  const slides = render(), s = slides[0];
  assert.equal(slides.length, 1);
  const box = s.items.find(x => x.t === 'rect' && x.fill === '#F8F6FE');
  assert.ok(box);
  assert.equal(box.x, 40);
  assert.ok(box.w <= 470);
  const tiers = s.items.filter(x => x.t === 'text' && x.field === 'tarifs' && /^T\d+\s/.test(C.metrics.plain(x.paras)));
  assert.equal(tiers.length, 10);
  assert.equal(new Set(tiers.map(x => x.y)).size, 3);
  const rows = Object.groupBy ? Object.groupBy(tiers, x => x.y) : tiers.reduce((a,x) => ((a[x.y]??=[]).push(x),a),{});
  assert.deepEqual(Object.values(rows).map(a => a.length),[4,4,2]);
  assert.ok(tiers.every(t => !t.overflow && t.size >= 11));
  assert.ok(!s.overflow);
});
done('V9.4.2 — tarifs plus étroits sur 3 lignes');
