/* V9.6.2 — retours utilisateurs : photo intégrée, bas de fiche structuré, suppléments en haut de cartouche. */
'use strict';
const {assert,test,done}=require('./lib/assert-ext');
const {load}=require('./lib/env');
const {tiers}=require('./lib/price-grid');
const C=load(), M=C.model, X=C.metrics;
function slide(notes,subtitle,photos,description) {
  const p=M.blankProject();
  const it=M.normalizeItem({id:'example',type:'activity',title:'Circuit découverte',
    dateStart:'2027-02-15',dateEnd:'2027-02-28',
    subtitle:subtitle||'Séjour découverte',
    description:description||'Circuit accompagné avec visites guidées et activités en plein air.',
    photos:photos||[],
    pricing:{enabled:true,mode:'tranches',outside:'3000',label:'Chambre double',notes:notes||''}});
  p.items=[it];
  const out=C.templates.renderPage(M.blankPage('item',{itemId:'example',template:'classic'}),p,M.blankIssue('2026-11-09'));
  return out;
}
const text=(t)=>t.t==='text'?X.plain(t.paras):'';
test('supplément single : intégré en haut du cartouche, aucun texte orphelin sous les tranches',()=>{
  const slides=slide('Supplément single : 150 €');
  const s=slides[0];
  const price=s.items.find(i=>i.t==='rect'&&i.fill==='#F8F6FE');
  const note=s.items.find(i=>i.t==='text'&&i.field==='notes tarifs');
  const title=s.items.find(i=>i.t==='text'&&text(i).includes('Tarifs CSE'));
  const ext=s.items.find(i=>i.t==='text'&&text(i).startsWith('Extérieur'));
  const t=tiers(s,X);
  assert.equal(slides.length,1);
  assert.ok(price&&note&&title&&ext);
  assert.equal(t.length,10);
  assert.equal(new Set(t.map(x=>x.y)).size,3);
  assert.ok(note.y===title.y && note.y<ext.y,'supplément sur la ligne de titre');
  assert.ok(title.x+title.w<=note.x,'titre et supplément ne se superposent pas');
  assert.ok(note.x+note.w<=price.x+price.w+0.1);
  assert.ok(price.h<92,'la note courte n’allonge pas le cartouche');
  assert.ok(!note.overflow&&!title.overflow&&!s.overflow);
  assert.ok(!s.warnings.some(x=>x.level==='block'));
});
test('notes plus longues : section intégrée à l’intérieur du cartouche, sans masquer T9/T10',()=>{
  const s=slide('Supplément individuel 180 € par voyageur, chambre côté jardin')[0];
  const note=s.items.find(i=>i.t==='text'&&i.field==='notes tarifs');
  const price=s.items.find(i=>i.t==='rect'&&i.fill==='#F8F6FE');
  const ext=s.items.find(i=>i.t==='text'&&text(i).startsWith('Extérieur'));
  assert.ok(price&&note&&ext);
  assert.ok(note.y>=ext.y+ext.h-1,'note longue sous les tiers');
  assert.ok(note.y+note.h<=price.y+price.h+0.1,'note contenue dans le cartouche');
  assert.ok(!note.overflow);
});
test('fiche peu chargée : panneau discret derrière le descriptif, sans recouvrir la photo',()=>{
  const s=slide('Single : 150 €',null,['assets/sri-lanka.jpg'],'Découverte des volcans, excursions et visites guidées.')[0];
  const panel=s.items.find(i=>i.t==='rect'&&i.fill==='#F7F9FD');
  const photo=s.items.find(i=>i.t==='image'&&i.role==='photo');
  const price=s.items.find(i=>i.t==='rect'&&i.fill==='#F8F6FE');
  assert.ok(panel&&photo&&price);
  assert.ok(panel.x>=photo.x+photo.w-0.1,'panneau à côté, pas sur la photo');
  // V10 : le cartouche peut être sous la photo (colonne gauche) ou en bande basse ; il ne chevauche jamais le panneau.
  assert.ok(panel.y+panel.h<price.y || panel.x>=price.x+price.w || price.x>=panel.x+panel.w,'panneau distinct des prix');
  assert.ok(!s.overflow);
});
test('période saisie deux fois : conserve un seul exemplaire et le complément du sous-titre',()=>{
  const s=slide('', 'Du 15 au 28 février 2027 — Nature et découverte')[0];
  const date=s.items.find(i=>i.t==='text'&&i.field==='date');
  const line=text(date);
  assert.equal(line.split('Du 15 au 28 février 2027').length-1,1);
  assert.ok(line.includes('Nature et découverte'));
});
test('tarifs et informations pratiques : une même rangée sans chevauchement ni bande blanche supplémentaire',()=>{
  const p=M.blankProject();
  p.items=[M.normalizeItem({id:'side',type:'activity',title:'Séjour court',dateStart:'2027-02-15',
    description:'Découverte et visites guidées.',regEnd:'2026-12-31',minPart:15,maxPart:25,
    pricing:{enabled:true,mode:'tranches',outside:'3000',notes:'Supplément single : 150 €'}})];
  const out=C.templates.renderPage(M.blankPage('item',{itemId:'side',template:'classic'}),p,M.blankIssue('2026-11-09'));
  const slide=out[0], price=slide.items.find(i=>i.t==='rect'&&i.fill==='#F8F6FE');
  // V10 : les cartes d'informations forment la bande basse avec le cartouche (même haut, même bas).
  const infos=slide.items.filter(i=>i.t==='rect'&&i.fill==='#F6F8FC'&&price&&i.y>=price.y-0.5);
  assert.equal(out.length,1);
  assert.ok(price && infos.length===2);
  assert.ok(infos.every(i=>Math.abs(i.y-price.y)<0.1 && Math.abs(i.y+i.h-(price.y+price.h))<0.6),'cartes à hauteur des prix');
  assert.ok(infos.every(i=>i.x>=price.x+price.w+10),'aucun recouvrement des tarifs');
  assert.ok(infos[1].x+infos[1].w <= 1160+0.1,'les cartes restent sur la diapositive');
  assert.ok(!slide.overflow);
});
done('V9.6.2 — supplément, hauteur de cartouche, contenu visuel et dates');
