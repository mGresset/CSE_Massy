/* V9.4.1 — Cartouche tarifs T1–T10 réduit, ancré en bas à gauche. */
'use strict';
const { assert, test, done } = require('./lib/assert-ext');
const { load } = require('./lib/env');
const C = load(), M = C.model;
const project = M.blankProject();
function render(pricing) {
  project.items = [M.normalizeItem({
    id: 'voyage-compact', type: 'activity', title: 'Circuit découverte au Costa Rica',
    dateStart: '2027-02-15', dateEnd: '2027-02-28',
    description: 'Circuit guidé dans les paysages et les parcs naturels du pays.',
    pricing,
    contacts: [{ name: 'Référent' }], minPart: '15', maxPart: '25',
    points: { value: '30', counter: 'long' }, photos: ['assets/sri-lanka.jpg']
  })];
  return C.templates.renderPage(M.blankPage('item', { itemId: 'voyage-compact', template: 'classic' }), project, M.blankIssue('2026-11-09'));
}
function priceBox(slide) { return slide.items.find(x => x.t === 'rect' && x.fill === '#F8F6FE'); }
function priceText(slide) { return slide.items.filter(x => x.t === 'text' && x.field === 'tarifs'); }

test('10 tranches : petit rectangle en bas à gauche, trois rangées et aucune troncature', () => {
  const slides = render({ enabled: true, mode: 'tranches', outside: '3000', label: 'Chambre double' });
  assert.equal(slides.length, 1, 'une seule slide pour un descriptif normal');
  const s = slides[0], b = priceBox(s);
  assert.ok(b, 'cartouche présent');
  assert.equal(b.x, 40, 'alignement à gauche');
  assert.ok(b.w <= 470, 'rectangle ≤ 40 % de la largeur');
  assert.ok(b.y >= 450, 'ancré en bas');
  assert.ok(b.h <= 67, 'hauteur compacte sans notes');
  assert.ok(b.y + b.h <= 590, 'la grille ne touche pas le pied de page');
  const tiers = priceText(s).filter(x => /^T\d+\s/.test(C.metrics.plain(x.paras)));
  assert.equal(tiers.length, 10, '10 tarifs affichés');
  assert.equal(new Set(tiers.map(x => x.y)).size, 3, 'exactement trois rangées');
  assert.ok(tiers.every(x => !x.overflow && x.size >= 11), 'montants lisibles et complets');
  assert.ok(!s.overflow, 'aucun texte hors cadre');
});
test('notes de tarifs, prix extérieur : toutes les informations sont préservées', () => {
  const s = render({ enabled: true, mode: 'tranches', outside: '3000', label: 'Chambre double', notes: 'Supplément individuel : 150 €' })[0];
  const b = priceBox(s);
  assert.ok(b.h <= 81, 'cartouche avec note reste compact');
  assert.ok(priceText(s).some(x => C.metrics.plain(x.paras).includes('Extérieur')));
  assert.ok(s.items.some(x => x.field === 'notes tarifs' && !x.overflow), 'supplément lisible');
  assert.ok(!s.overflow);
});
test('tarifs facultatifs : aucun rectangle réservé si désactivés', () => {
  const s = render({ enabled: false })[0];
  assert.ok(!priceBox(s));
});
done('V9.4.1 — rectangle tarifs compact');
