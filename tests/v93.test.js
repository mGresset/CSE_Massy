/* CSE Studio V9.3 – tests de non-régression ciblés. */
'use strict';
const { assert, test, done } = require('./lib/assert-ext');
const { load } = require('./lib/env');
const C = load([]), M = C.model, T = C.templates, D = C.dates;
function page(item, opts){
  const p = M.blankProject();p.items=[M.normalizeItem(item)];
  const issue=M.blankIssue('2026-11-09');
  return T.renderPage(M.blankPage('item',Object.assign({itemId:p.items[0].id},opts||{})),p,issue);
}
function strings(s){return s.items.filter(x=>x.t==='text').map(x=>C.metrics.plain(x.paras)).join('\n')}

test('Permanences : lien absent par défaut, bouton si lien personnalisé, conservation états',()=>{
  const blank=M.blankItem('calendar');
  assert.equal(blank.link.type,'none');
  blank.title='Permanences CSE';blank.calendar.month='2026-11';
  blank.calendar.days={'2026-11-02':'open','2026-11-03':'special','2026-11-04':'closed'};
  blank.calendar.dayHours={'2026-11-03':'14h–16h'};
  let s=page(blank)[0];
  assert.ok(!s.items.some(x=>x.field==='bouton'),'aucun CTA pour un nouveau calendrier');
  assert.ok(strings(s).includes('14h–16h'));
  blank.link={type:'custom',url:'https://example.org/catalogue',label:'Voir les activités'};
  s=page(blank)[0];
  assert.ok(s.items.some(x=>x.field==='bouton'&&x.link==='https://example.org/catalogue'),'bouton actif sur calendrier');
});
test('Partenaire : badge discret, texte grossit si peu de texte',()=>{
  const s=page({id:'p1',type:'partner',title:'Offre partenaire',description:'20 % de réduction sur une sélection de produits.',partner:{offer:'Remise préférentielle'}})[0];
  assert.ok(strings(s).includes('Partenaire CSE'));
  const t=s.items.find(x=>x.field==='conditions de l’offre');
  assert.ok(t && t.size>=22,'caractères agrandis sur une offre courte');
});
test('Règlement : le sous-titre est visible et survit à une normalisation',()=>{
  const s=page({id:'r1',type:'rules',title:'Règlement',subtitle:'Information importante',description:'Les inscriptions sont ouvertes à tous les salariés.'})[0];
  assert.ok(strings(s).includes('Information importante'));
});
test('Tarifs plus compacts : 10 tranches en 3 rangées',()=>{
  const s=page({id:'a1',type:'activity',title:'Séjour',dateStart:'2027-01-01',description:'Voyage de découverte.',pricing:{enabled:true,mode:'tranches',outside:'3000'}})[0];
  const band=s.items.find(x=>x.t==='rect'&&x.fill==='#F8F6FE');
  assert.ok(band&&band.h<=92,'cartouche V10 <= 92 px sans notes');
  assert.equal(page({id:'a2',type:'activity',title:'Séjour',description:'Voyage de découverte.',pricing:{enabled:false}}).length,1);
});
test('Couverture : notes supplémentaires modifiables sont rendues et normalisées',()=>{
  const p=M.blankProject(),is=M.blankIssue('2026-11-09'),pg=M.blankPage('cover');
  pg.opts.extraNotes=['Permanence exceptionnelle jeudi','Réouverture de la billetterie lundi'];
  is.pages=[M.normalizePage(pg)];
  const s=T.renderPage(is.pages[0],p,is)[0];
  assert.ok(strings(s).includes('Permanence exceptionnelle jeudi'));
  assert.ok(strings(s).includes('Réouverture de la billetterie lundi'));
  assert.ok(is.pages[0].opts.extraNotes.length===2);
});
console.log('V9.3 : scénarios de régression OK');
test('Couverture très fournie : pas de messages écrasés, notes préservées sur continuation', () => {
  const p=C.demo.build('2026-11-09'), is=p.issues[0], pg=is.pages.find(x=>x.kind==='cover');
  pg.opts.important={label:'Important',title:'Information CSE',text:'Message important de la semaine.'};
  pg.opts.mustSee={auto:false,text:'Dernière semaine avant inscription'};
  pg.opts.extraNotes=['Note additionnelle A','Note additionnelle B','Note additionnelle C','Note additionnelle D'];
  const slides=T.renderPage(pg,p,is);
  const all=slides.map(strings).join('\n');
  ['Note additionnelle A','Note additionnelle B','Note additionnelle C','Note additionnelle D'].forEach(x=>assert.ok(all.includes(x),'information présente : '+x));
  const boxes=slides[0].items.filter(x=>x.t==='rect'&&x.w===1120&&['#EAF2FE','#FFF1E5'].includes(x.fill));
  assert.ok(boxes.every(x=>x.h>=58),'messages Important / Dernière chance gardent une vraie hauteur');
  assert.ok(slides.length<=2,'une page de notes supplémentaire au maximum');
});
