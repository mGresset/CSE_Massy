/* V9.4.6 — Prix extérieur aligné sur les tranches à droite, sans dépasser le cartouche. */
'use strict';
const {assert, test, done} = require('./lib/assert-ext');
const {load} = require('./lib/env');
const C = load(), M = C.model;
const project = M.blankProject();
const { tiers } = require('./lib/price-grid');
const txt = (node) => C.metrics.plain(node.paras);
function render(outside) {
  project.items = [M.normalizeItem({
    id:'alignment-check', type:'activity', title:'Séjour Costa Rica', description:'Programme du voyage.',
    dateStart:'2027-02-15', dateEnd:'2027-02-28',
    pricing:{enabled:true,mode:'tranches',outside:String(outside),label:'Chambre double'}
  })];
  return C.templates.renderPage(M.blankPage('item',{itemId:'alignment-check',template:'classic'}),project,M.blankIssue('2026-11-09'))[0];
}
[3000,12000].forEach(function(amount) {
  test('Extérieur '+amount+' € : aligné sur T4/T8 et à l’intérieur du cartouche',function() {
    const slide=render(amount);
    const box=slide.items.find(i=>i.t==='rect'&&i.fill==='#F8F6FE');
    const text=slide.items.filter(i=>i.t==='text'&&i.field==='tarifs');
    const ext=text.find(i=>txt(i).startsWith('Extérieur'));
    const rows=tiers(slide,C.metrics);
    const t8=rows.find(i=>i.label==='T8').amountNode;
    const t9=rows.find(i=>i.label==='T9').labelNode;
    const t10=rows.find(i=>i.label==='T10').labelNode;
    assert.ok(box&&ext&&t8&&t9&&t10);
    assert.equal(ext.y,t9.y);
    assert.equal(ext.y,t10.y);
    assert.equal(ext.align,'right');
    const extRight=ext.x+ext.w;
    const rightOfT8=t8.x+t8.w;
    assert.ok(Math.abs(extRight-rightOfT8)<2,'Extérieur doit finir sous le bord du tarif T8');
    assert.ok(extRight<=box.x+box.w-8,'Marges à droite insuffisantes');
    assert.ok(ext.x>t10.x,'Extérieur doit être après T10');
    assert.ok(C.metrics.width(txt(ext),ext.size,true)*1.04<ext.w,'Libellé Extérieur tronqué');
    assert.ok(!ext.overflow&&!slide.overflow,'Aucun texte tronqué');
  });
});
done('V9.4.6 — alignement des tarifs');
