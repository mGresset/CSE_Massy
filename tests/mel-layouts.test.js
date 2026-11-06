const assert=require('assert'),fs=require('fs'),vm=require('vm'),path=require('path');
const window={};const ctx=vm.createContext({window,console,Date,URL,Intl,Math,Number,Array,Object,String,Set});
for(const mod of ['mel-data.js','mel-layouts.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',mod),'utf8'),ctx);
const D=window.MEL_DATA,L=window.MEL_LAYOUTS,rows=D.demoSlides();
assert.equal(rows.length,33);assert.equal(D.TEMPLATES.length,11);assert.equal(D.CATEGORIES[0],'Informations');
assert.equal(rows[0].kind,'cover');assert.equal(rows[31].kind,'rules');assert.equal(rows[32].kind,'rules');
assert.equal(rows.filter(s=>s.originPage>=1).length,33);
const cfg=D.DEFAULT_SETTINGS;for(const s of rows){const r=L.render(s,cfg,rows);assert.equal(r.width,1200);assert.equal(r.height,675);assert.ok(r.items.length>3);for(const v of r.items)assert.ok([v.x,v.y,v.w,v.h].every(Number.isFinite)&&v.w>0&&v.h>0);}
const sample=D.makeSlide('activity','En cours','Test tarifs',{outsidePrice:100,priceEnabled:true,pricingMode:'tranches'});
assert.ok(L.costs(sample,cfg)[0][1].includes('30'));
sample.pricingMode='part';sample.fixedPercent=25;assert.ok(L.costs(sample,cfg)[0][1].includes('25'));
sample.pricingMode='pourcentage';sample.fixedPercent=25;assert.ok(L.costs(sample,cfg)[0][1].includes('75'));
sample.pricingMode='manuel';sample.manualPrices='1,2,3,4,5,6,7,8,9,10';assert.equal(L.costs(sample,cfg).length,10);
console.log('CSE Studio V7 : 33 schémas, 11 modèles et 4 tarifs testés');
