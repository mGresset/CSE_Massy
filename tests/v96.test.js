/* V9.6 — Tests de finition et régression du moteur de mise en page. */
'use strict';
const { assert, test, done } = require('./lib/assert-ext');
const { load } = require('./lib/env');
const { tiers } = require('./lib/price-grid');
const C = load(), M = C.model, X = C.metrics;
const REF = '2026-11-09';
function project(raw) {
  const p = M.blankProject();
  p.items = raw.map(x => M.normalizeItem(x));
  return p;
}
function render(p, itemId, template) {
  return C.templates.renderPage(M.blankPage('item', { itemId, template: template || 'auto' }), p, M.blankIssue(REF));
}
function plain(it) { return it.t === 'text' ? X.plain(it.paras) : ''; }
function priceBox(slide) { return slide.items.find(x => x.t === 'rect' && x.fill === '#F8F6FE'); }

// Les colonnes tarifaires doivent aligner les libellés à gauche et les prix à droite,
// en maintenant les trois lignes et les petites marges du cartouche.
test('tarifs : 4/4/2, euro aligné, même abscisse pour T1/T5/T9 et barre à l’intérieur', () => {
  const p = project([{ id:'a', type:'activity', title:'Circuit', description:'Découverte culturelle.',
    pricing:{enabled:true,mode:'tranches',outside:'3000'} }]);
  const s = render(p,'a','classic')[0];
  const box = priceBox(s), cells = tiers(s,X);
  assert.ok(box && cells.length === 10);
  assert.ok(box.w < 470, 'le cartouche doit épouser son contenu');
  assert.equal(new Set(cells.map(c=>c.y)).size,3);
  const t = n => cells.find(x=>x.label==='T'+n);
  assert.ok(Math.abs(t(1).x-t(5).x)<.5 && Math.abs(t(1).x-t(9).x)<.5,'T1/T5/T9 alignés à gauche');
  for (let col=0;col<4;col++) {
    assert.ok(Math.abs(t(col+1).amountNode.x+t(col+1).amountNode.w-(t(col+5).amountNode.x+t(col+5).amountNode.w))<.5,
      '€ dans colonne '+(col+1)+' alignés à droite');
  }
  const ext = s.items.find(x=>x.field==='tarifs'&&plain(x).startsWith('Extérieur'));
  assert.ok(ext && ext.y===t(9).y && ext.align==='right');
  assert.ok(ext.x+ext.w<=box.x+box.w-5,'ext. ne sort pas du cartouche');
  const accent = s.items.find(x=>x.t==='rect'&&x.fill==='#6236C9'&&x.h<box.h&&x.y>=box.y&&x.y<box.y+box.h);
  assert.ok(accent && accent.x>=box.x && accent.y>box.y && accent.y+accent.h<box.y+box.h,
    'barre violette non collée aux bords');
  assert.ok(cells.every(c=>c.amountNode&&!c.amountNode.overflow&&!c.labelNode.overflow));
});

test('partenaire avec offre courte : offre recentrée et pas de débordement', () => {
  const p = project([{id:'partner1',type:'partner',title:'Offre spéciale',partner:{offer:'15 % de remise',amount:'-15%',validUntil:'2027-03-01'}}]);
  const s = render(p,'partner1','partner')[0];
  const title = s.items.find(x=>x.field==='titre');
  const offer = s.items.find(x=>x.field==='offre');
  assert.ok(title && offer && offer.y>title.y+title.h-10);
  assert.ok(offer.y>290,'l’offre courte est mieux équilibrée verticalement');
  assert.ok(!s.overflow,'aucune troncature');
  assert.ok(s.items.some(x=>plain(x)==='Partenaire CSE'));
});

test('programme manuel de 30 activités : toutes les lignes sont présentes, avec pagination', () => {
  const p = M.blankProject(), is = M.blankIssue(REF), page = M.blankPage('upcoming');
  page.opts.auto = false;
  page.opts.rows = Array.from({length:30},(_,i)=>({date:'2027-03-'+String(1+i%28).padStart(2,'0'),title:'Activité '+String(i+1).padStart(2,'0'),location:'Massy',type:'Sport'}));
  const slides = C.templates.renderPage(page,p,is);
  assert.ok(slides.length>=2 && slides.length<=30);
  const all = slides.flatMap(s=>s.items).filter(it=>it.t==='text').map(plain).join('\n');
  for(let i=1;i<=30;i++) assert.ok(all.includes('Activité '+String(i).padStart(2,'0')),'activité '+i+' manquante');
  slides.forEach(s=>assert.ok(!s.overflow));
});

test('règlement long : pagination préserve les dernières sections (au-delà de huit pages)', () => {
  const content = Array.from({length:105},(_,i)=>'# Section '+(i+1)+'\n'+'Ce paragraphe précise les modalités des inscriptions et des règlements. '.repeat(6)).join('\n\n');
  const p = project([{id:'r',type:'rules',title:'Modalités'}]);
  // Forcer le moteur avec un texte dépassant la limite habituelle du formulaire (6 000 caractères).
  p.items[0].description = content;
  const slides = render(p,'r','rules');
  assert.ok(slides.length>8,'le règlement doit dépasser huit pages dans ce test');
  const all = slides.flatMap(s=>s.items.filter(x=>x.field==='règlement')).map(plain).join('\n');
  assert.ok(all.includes('Section 105'),'dernière section conservée');
  assert.ok(!slides.some(s=>s.warnings.some(w=>w.level==='block')),'aucune perte de texte');
});


test('dates et sous-titres : ne pas répéter deux fois la même période', () => {
  const p = project([{id:'date-demo',type:'activity',title:'Séjour',dateStart:'2027-02-15',dateEnd:'2027-02-20',subtitle:'Du 15 au 20 février 2027'}]);
  const slide = render(p,'date-demo','classic')[0];
  const date = slide.items.find(x=>x.field==='date');
  assert.ok(date);
  const value = plain(date);
  assert.equal(value.split('Du 15 au 20 février 2027').length - 1, 1);
});

test('partenaire sans logo : pictogramme vectoriel et pas de doublon de titre', () => {
  const p = project([{id:'p2',type:'partner',title:'Nom partenaire',partner:{offer:'Offre spéciale',amount:'-10 %'}}]);
  const slide=render(p,'p2','partner')[0];
  assert.ok(slide.items.some(x=>x.t==='path'),'icône vectorielle de remplacement');
  assert.equal(slide.items.filter(x=>x.t==='text'&&plain(x)==='Nom partenaire').length,1);
  assert.ok(slide.items.some(x=>x.t==='text'&&plain(x)==='AVANTAGE PARTENAIRE'));
});

done('V9.6 — lisibilité, pagination, encarts et tarifs');
