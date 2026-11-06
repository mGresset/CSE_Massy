const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const window={};const ctx=vm.createContext({window,console,Date,URL,Intl,Math,Number,Array,Object,String,Set});
for(const mod of ['mel-data.js','mel-layouts.js','mel-responsive.js'])vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../js',mod),'utf8'),ctx);
const D=window.MEL_DATA,L=window.MEL_LAYOUTS,cfg=D.DEFAULT_SETTINGS;
let acts=Array.from({length:6},(_,i)=>D.makeSlide('activity',i%2?'Dernière semaine':'Nouveautés','Activité de démonstration '+(i+1),{category:i%2?'Sports mécaniques':'Sorties culturelles',date:'2026-11-12',deadline:'2026-11-12',image:'',description:'Découverte d’une activité avec programme, calendrier et modalités d’inscription. '.repeat(5)}));
const shared=D.makeSlide('newsgrid','Nouveautés','Nos nouveautés');
const urgent=D.makeSlide('lastboard','Dernière semaine','Inscriptions bientôt closes');
for(let n of [1,2,3,4,5,6]){
  shared.featureIds=acts.slice(0,n).map(x=>x.id);const board=L.render(shared,cfg,acts.concat([shared]));assert.equal(board.template,'newsgrid');assert(board.items.length>12);
  assert(board.items.every(x=>[x.x,x.y,x.w,x.h].every(Number.isFinite)&&x.x>=0&&x.y>=0&&x.x+x.w<1201&&x.y+x.h<676),'hors page n '+n);
  const cards=board.items.filter(x=>x.kind==='text'&&x.text.includes('Activité de démonstration'));assert.equal(cards.length,n,'nombre de cartes '+n);
}
shared.featureIds=[acts[0].id];urgent.featureIds=[];assert.equal(L.featureSelection(urgent,acts,cfg.newsletterDate,true).length,6);
assert.deepEqual(Array.from(D.makeSlide('newsgrid','Nouveautés','Test').featureIds),[],'pas de référence partagée pour featureIds');
assert.equal(D.CATEGORIES[0],'Informations');
const a=D.makeSlide('activity','En cours','Voyage');a.date='2026-11-14';a.description='Programme découverte '.repeat(45);a.outsidePrice=1000;a.priceEnabled=true;let yes=L.render(a,cfg,acts);assert(yes.items.some(x=>x.text==='TARIFS CSE'));
a.priceEnabled=false;const no=L.render(a,cfg,acts);assert(!no.items.some(x=>x.text==='TARIFS CSE'));assert(no.items.length<yes.items.length);
a.description='Description très longue '.repeat(180);const long=L.render(a,cfg,acts);assert(long.warnings.length>0);
console.log('V8 : mosaïques 1–6, tarifs facultatifs, alertes de débordement, héritage catégories OK');
