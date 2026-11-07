'use strict';
const fs = require('fs'), path = require('path');
const {loadExport}=require('./lib/env');
const C = loadExport();
const p=C.model.blankProject();
const example=C.model.normalizeItem({
  id:'travel-v962',type:'activity', title:'Circuit Sri Lanka', categoryId:(p.categories.find(x=>/Voyage/i.test(x.name))||{}).id,
  subtitle:'Du 15 au 28 février 2027 — Découvertes et excursions',dateStart:'2027-02-15',dateEnd:'2027-02-28',
  regEnd:'2026-12-31',
  summary:'Un circuit découverte entre temples historiques, paysages tropicaux et plages.',
  description:'Découverte de sites naturels, rencontres locales et visites guidées. Un séjour alliant culture, détente et excursions.',
  highlights:'Découverte des sites historiques\nVisite de paysages naturels\nExcursions et rencontres locales',
  photos:['assets/sri-lanka.jpg'],
  pricing:{enabled:true,mode:'tranches',outside:'3000',label:'Chambre double',notes:'Supplément single : 150 €'},
  minPart:15,maxPart:25,contacts:[{name:'Référent CSE',email:'referent@example.com'}]
});
p.items=[example];
const page=C.model.blankPage('item',{itemId:'travel-v962',template:'classic'});
const slides=C.templates.renderPage(page,p,C.model.blankIssue('2026-11-09'));
const dest=process.argv[2]||'/mnt/data/CSE_Studio_V9_6_2_Demo.pptx';
C.pptx.toBlob(slides.map(slide=>({slide,title:'Circuit Sri Lanka'})),{title:'CSE Studio V9.6.2 – fiche voyage'}).then(r=>{
  fs.writeFileSync(dest,r.buffer);
  fs.writeFileSync(dest.replace('.pptx','.layouts.json'),JSON.stringify(slides));
  console.log('Slides:',slides.length,'output:',dest,'size:',r.buffer.length,'warnings:',JSON.stringify(r.warnings));
  slides.forEach((s,i)=>console.log('Slide',i+1,'warnings',JSON.stringify(s.warnings)));
}).catch(e=>{console.error(e);process.exit(1);});
