/* Tarifs : barème T1–T10, arrondis, modes communs, surcharges, contrôles. */
'use strict';
const { assert, test, done } = require('./lib/assert-ext');
const P = require('../js/pricing.js');
const S = { rates: [70, 65, 60, 55, 50, 45, 40, 35, 30, 25], rounding: { step: 'unit', mode: 'nearest' } };

test('API historique : 2 400 € → T1 720 €, T10 1 800 €', () => {
  const prices = P.compute(2400, 'tranches', P.DEFAULT_RATES);
  assert.deepEqual(prices.map((r) => r.price), [720, 840, 960, 1080, 1200, 1320, 1440, 1560, 1680, 1800]);
  assert.equal(P.compute(1000, 'fixedSubsidy', [], 40)[0].price, 600);
  assert.equal(P.compute(1000, 'fixedEmployee', [], 40)[0].price, 400);
  assert.equal(P.compute(1000, 'fixedEuro', [], 0, 280)[0].price, 280);
});
test('V9 barème : 2 400 € → T1 720 €, T10 1 800 €', () => {
  const r = P.fromPricing({ enabled: true, mode: 'tranches', outside: '2400' }, S);
  assert.equal(r.kind, 'grid'); assert.equal(r.rows.length, 10);
  assert.equal(r.rows[0].price, 720); assert.equal(r.rows[9].price, 1800); assert.equal(r.outside, 2400);
  assert.equal(r.issues.length, 0);
});
test('arrondi paramétrable', () => {
  const base = { enabled: true, mode: 'tranches', outside: '99' };
  assert.equal(P.fromPricing(base, Object.assign({}, S, { rounding: { step: 'unit', mode: 'nearest' } })).rows[0].price, 30); // 29,70
  assert.equal(P.fromPricing(base, Object.assign({}, S, { rounding: { step: 'unit', mode: 'down' } })).rows[0].price, 29);
  assert.equal(P.fromPricing(base, Object.assign({}, S, { rounding: { step: 'cent', mode: 'nearest' } })).rows[0].price, 29.7);
  assert.equal(P.fromPricing(base, Object.assign({}, S, { rounding: { step: 'five', mode: 'up' } })).rows[0].price, 30);
  assert.equal(P.fromPricing(base, Object.assign({}, S, { rounding: { step: 'half', mode: 'nearest' } })).rows[0].price, 29.5);
});
test('barème configurable', () => {
  const r = P.fromPricing({ enabled: true, mode: 'tranches', outside: 100 }, Object.assign({}, S, { rates: [50, 50, 50, 50, 50, 50, 50, 50, 50, 0] }));
  assert.equal(r.rows[0].price, 50); assert.equal(r.rows[9].price, 100);
});
test('surcharge d’une tranche', () => {
  const r = P.fromPricing({ enabled: true, mode: 'tranches', outside: 2400, overrides: { 2: '2000' } }, S);
  assert.equal(r.rows[2].price, 2000); assert.ok(r.rows[2].overridden);
  assert.ok(r.issues.some((x) => /croissants/.test(x[1])), 'incohérence détectée');
});
test('modes communs, prix fixe, tarif unique, manuel', () => {
  assert.equal(P.fromPricing({ enabled: true, mode: 'subsidy', outside: 80, percent: 25 }, S).rows[0].price, 60);
  assert.equal(P.fromPricing({ enabled: true, mode: 'participation', outside: 80, percent: 25 }, S).rows[0].price, 20);
  const f = P.fromPricing({ enabled: true, mode: 'fixed', outside: 80, fixed: '45' }, S);
  assert.equal(f.kind, 'single'); assert.equal(f.rows[0].price, 45); assert.equal(f.outside, 80);
  const u = P.fromPricing({ enabled: true, mode: 'single', fixed: '15' }, S);
  assert.equal(u.rows[0].label, 'Tarif unique'); assert.equal(u.outside, null);
  const m = P.fromPricing({ enabled: true, mode: 'manual', manual: ['10', '12', '14'] }, S);
  assert.equal(m.rows.length, 3); assert.ok(m.issues.some((x) => /3 tarif/.test(x[1])));
});
test('sans tarif et module masqué', () => {
  assert.equal(P.fromPricing({ enabled: false, mode: 'tranches', outside: 100 }, S).kind, 'none');
  assert.equal(P.fromPricing({ enabled: true, mode: 'tranches', outside: 100 }, Object.assign({}, S, { pricingModule: false })).kind, 'none');
});
test('contrôles', () => {
  assert.ok(P.fromPricing({ enabled: true, mode: 'tranches', outside: '' }, S).issues.some((x) => x[0] === 'block'));
  assert.ok(P.fromPricing({ enabled: true, mode: 'fixed', outside: 50, fixed: 60 }, S).issues.some((x) => /dépasse/.test(x[1])));
});
test('format monétaire insécable', () => {
  assert.equal(P.money(2400), '2\u00a0400\u00a0€');
  assert.equal(P.money(12.5), '12,50\u00a0€');
});
done('tarifs');
