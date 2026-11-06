const assert=require('node:assert/strict');
const P=require('../js/pricing.js');const L=require('../js/layouts.js');
const sample={title:'Concerts de Noël',category:'Sorties culturelles',location:'Massy',summary:'Deux concerts festifs.',activityStart:'2027-12-08',activityEnd:'2027-12-09',registrationStart:'2027-11-01',registrationEnd:'2027-11-30',status:'auto',pricingMode:'tranches',outsidePrice:100,showPricing:true,rates:[70,65,60,55,50,45,40,35,30,25],linkType:'cse',ctaLabel:'Plus d’infos',highlights:'Concert 1\nConcert 2',included:'Entrée incluse',administrative:'Voir conditions'};
const ids=L.CHOICES.map(c=>c.id);assert.equal(ids.length,5);assert.equal(new Set(ids).size,5);
for(const template of ids){const r=L.render({...sample,template},P);assert.equal(r.type,template);assert.equal(r.rows.length,10);assert.ok(r.elements.length>=6);assert.ok(r.elements.some(e=>e.type==='image'&&e.which==='banner'));assert.ok(r.elements.some(e=>e.type==='link'&&e.url==='https://cethaleslasmassy.portailce.com/'));for(const e of r.elements){assert.ok(e.x>=0&&e.y>=0&&e.w>0&&e.h>0,template+': malformed element');assert.ok(e.x+e.w<=1201,template+': overflow x '+JSON.stringify(e));assert.ok(e.y+e.h<=676,template+': overflow y '+JSON.stringify(e))}}
const blank=L.render({...sample,template:'upcoming',linkType:'none'},P);assert.ok(!blank.elements.some(e=>e.type==='link'));
const custom=L.render({...sample,template:'flash',linkType:'custom',customUrl:'https://example.com/events'},P);assert.ok(custom.elements.some(e=>e.url==='https://example.com/events'));
console.log('✓ 5 modèles testés, dimensions, bandeau et hyperliens OK');

const infoWithoutPrice=L.render({...sample,template:'info',showPricing:false,outsidePrice:''},P);
assert.equal(infoWithoutPrice.rows.length,0);
assert.ok(!infoWithoutPrice.elements.some(e=>/tarifs/i.test(String(e.text||''))));
const upcoming=L.render({...sample,template:'upcoming',showPricing:false,outsidePrice:''},P,{upcomingItems:[{title:'Randonnée 2027',category:'Randonnées',location:'Massy',activityStart:'2027-04-15'}]});
assert.ok(upcoming.elements.some(e=>String(e.text).includes('Randonnée 2027')));
const points=L.render({...sample,template:'classic',points:'24',pointCounter:'france',showPricing:false,outsidePrice:'',contacts:[{name:'Camille',email:''},{name:'Michel',email:''}]},P);
assert.ok(points.elements.some(e=>String(e.text).includes('Séjour FRANCE')));
assert.ok(points.elements.some(e=>String(e.text).includes('Michel')));
