/* V9.4.5 — Bandeau de tarifs resserré, prix extérieur à droite de T9 et T10. */
'use strict';
const {assert, test, done} = require('./lib/assert-ext');
const {load} = require('./lib/env');
const C = load(), M = C.model;
const project = M.blankProject();
const { tiers } = require('./lib/price-grid');
function render(outside, notes) {
  project.items = [M.normalizeItem({
    id:'v945', type:'activity', title:'Circuit Costa Rica',
    description:'Séjour découverte avec visites et hébergement.',
    dateStart:'2027-02-15', dateEnd:'2027-02-28',
    pricing:{enabled:true,mode:'tranches',outside:outside,label:'Chambre double',notes:notes||''}
  })];
  return C.templates.renderPage(M.blankPage('item',{itemId:'v945',template:'classic'}),project,M.blankIssue('2026-11-09'))[0];
}
const plain = (t) => C.metrics.plain(t.paras);
test('T9, T10 et prix extérieur sur la dernière ligne, sans débordement', () => {
  const s=render('3000');
  const tier=tiers(s,C.metrics);
  const t9=tier.find(x=>x.label==='T9').labelNode;
  const t10=tier.find(x=>x.label==='T10').labelNode;
  const ext=s.items.find(x=>x.t==='text'&&x.field==='tarifs'&&plain(x).includes('Extérieur'));
  const box=s.items.find(x=>x.t==='rect'&&x.fill==='#F8F6FE');
  assert.ok(box&&t9&&t10&&ext);
  assert.equal(tier.length,10);
  assert.equal(t9.y,t10.y);
  assert.equal(t10.y,ext.y);
  assert.ok(t9.x<t10.x && t10.x<ext.x);
  assert.equal(ext.align,'right');
  assert.ok(ext.size>=12.2);
  assert.ok(ext.x+ext.w <=box.x+box.w);
  assert.ok(!ext.overflow && !s.overflow);
  assert.ok(box.h<=64);
});
test('Cartouche plus bas avec supplément, sans chevauchement', () => {
  const s=render('3000','Supplément individuel : 150 €');
  const box=s.items.find(x=>x.t==='rect'&&x.fill==='#F8F6FE');
  const ext=s.items.find(x=>x.t==='text'&&x.field==='tarifs'&&plain(x).includes('Extérieur'));
  const notes=s.items.find(x=>x.t==='text'&&x.field==='notes tarifs');
  assert.ok(box && ext && notes);
  assert.ok(notes.y >=ext.y+ext.h-2);
  assert.ok(box.h<=78);
  assert.ok(!notes.overflow && !s.overflow);
});
test('Quand aucun prix extérieur n’est fourni, pas de cartouche extérieur', () => {
  const s=render('');
  assert.ok(!s.items.some(x=>x.field==='tarifs'&&plain(x).includes('Extérieur')));
});
done('V9.4.5 — tarifs harmonisés');
