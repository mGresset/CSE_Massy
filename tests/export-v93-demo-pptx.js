/* Exemple public et fictif de vérification V9.3 : les 5 types de fiches modifiés. */
'use strict';
const fs=require('fs');
const {loadExport}=require('./lib/env');
const C=loadExport(null), M=C.model;
const p=M.blankProject();
const photoData = 'data:image/jpeg;base64,' + fs.readFileSync(require('path').join(__dirname, '..', 'assets/sri-lanka.jpg')).toString('base64');
const items=[
 {id:'act',type:'activity',title:'Séjour découverte',subtitle:'Du 15 au 20 février 2027',dateStart:'2027-02-15',dateEnd:'2027-02-20',description:'Voyage de découverte dans plusieurs villes, visites guidées et excursions.',highlights:'Découverte du patrimoine\nActivités de loisirs',pricing:{enabled:true,mode:'tranches',outside:'950',notes:'Supplément individuel : 75 €'},contacts:[{name:'Référent exemple',email:'contact@example.org'}],photos:[]},
 {id:'cal',type:'calendar',title:'Permanences CSE',calendar:{month:'2027-02',days:{'2027-02-01':'open','2027-02-02':'special','2027-02-03':'closed'},dayHours:{'2027-02-02':'9h–12h'},openHours:'13h–16h',service:'Permanences'},link:{type:'custom',url:'https://cethaleslasmassy.portailce.com/',label:'Accéder au CSE'}},
 {id:'pa',type:'partner',title:'Offre partenaire',subtitle:'Avantage réservé aux bénéficiaires',description:'Une offre privilégiée à découvrir, avec une réduction réservée aux bénéficiaires du CSE.',partner:{offer:'Remise exceptionnelle',amount:'−15 %',validUntil:'2027-03-31'},link:{type:'none'}},
 {id:'rule',type:'rules',title:'Modalités d’inscription',subtitle:'Informations importantes pour les bénéficiaires',description:'# Inscriptions\nLes inscriptions se font auprès du CSE.\n\n# Règlement\nLe paiement est demandé selon les modalités de chaque activité.'}
];
p.items=items.map(x=>M.normalizeItem(x));const issue=M.blankIssue('2027-02-01');issue.pages=[M.blankPage('cover')].concat(items.map(x=>M.blankPage('item',{itemId:x.id})));
issue.pages[0].opts.important={label:'Important',title:'Information du CSE',text:'Nouveau calendrier des permanences et activités pour le mois.'};issue.pages[0].opts.extraNotes=['Permanence exceptionnelle le mardi','Inscrivez-vous dès l’ouverture des activités'];
const entries=[];C.templates.renderIssue(p,issue).forEach(r=>r.slides.forEach(s=>entries.push({slide:s,title:r.page.kind})));
C.pptx.toBlob(entries,{title:'Exemples fictifs V9.3'}).then(res=>{fs.writeFileSync(process.argv[2]||'/mnt/data/CSE_Studio_V9_3_Exemple.pptx',res.buffer);console.log('Diapositives :',entries.length,'avertissements images :',res.warnings.length);}).catch(e=>{console.error(e);process.exit(1);});
