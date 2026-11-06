/* CSE Studio V6 — application autonome pour GitHub Pages (pas de backend). */
(()=>{'use strict';
const P=window.CSEPricing,L=window.CSELayouts;
if(!P||!L)throw Error('Modules CSEPricing / CSELayouts absents');
const $=id=>document.getElementById(id),euro=P.frMoney;
const KEYS={draft:'cse-studio-massy:v1:draft',activities:'cse-studio-massy:v1:activities',rates:'cse-studio-massy:v1:rates',categories:'cse-studio-massy:v6:categories'};
const FIELDS=['title','category','location','venue','activityStart','activityEnd','subtitle','summary','highlights','included','administrative','warning','priceLabel','outsidePrice','pricingMode','fixedRate','fixedEuro','priceNotes','conditions','registrationStart','registrationEnd','status','audience','minimum','maximum','points','pointCounter','carbon','photoUrl','linkType','customUrl','ctaLabel','internalReference','editorialStatus'];
const sample={title:'EXEMPLE ACTIVITÉ VOYAGE',category:'Voyages',template:'classic',location:'Sri Lanka',venue:'',activityStart:'2027-04-04',activityEnd:'2027-04-15',subtitle:'Vacances de printemps',summary:'Circuit découverte très varié des splendeurs et activités du centre du Sri Lanka, pendant les vacances scolaires de printemps.',highlights:'Temple d’or de DAMBULLA et site de SIGIRIYA.\nImmersion dans la vie rurale et rencontre avec les éléphants.\nDécouverte des sites de POLONNARUWA et RITIGALA.\nSafari en 4×4 dans la réserve naturelle de MINNERIYA.\nInitiation à l’ANGAMPORA et détente à PASSIKUDAH.',included:'Vol aller-retour pour Colombo avec escale.\nGuide local parlant français.\nHébergement en hôtels de catégorie supérieure.\nPension complète (hors boissons) et assurances.',administrative:'Passeport valable 6 mois après le retour + ETA (e-visa).',warning:'Séjour non adapté aux PMR ni aux très jeunes enfants.',priceLabel:'Tarif chambre double',outsidePrice:'2400',pricingMode:'tranches',showPricing:true,fixedRate:'50',fixedEuro:'',priceNotes:'',conditions:'Réductions non cumulables. Consulter les conditions d’application du CSE.',registrationStart:'',registrationEnd:'2026-12-03',status:'Inscriptions ouvertes',audience:'Bénéficiaires du CSE',minimum:'31',maximum:'40',points:'24',pointCounter:'long',carbon:'3029 kg CO₂e',contact:'Référent CSE',contactEmail:'',contacts:[{name:'Référent CSE',email:''}],internalReference:'',editorialStatus:'draft',photoUrl:'',photoData:'',photo2Data:'',linkType:'cse',customUrl:'',ctaLabel:'Plus d’infos',rates:[...P.DEFAULT_RATES]};
function read(key,fallback){try{const v=localStorage.getItem(key);return v?JSON.parse(v):fallback}catch{return fallback}}
const DEFAULT_CATEGORIES=['Informations','Voyages','Week-ends','Animations','Sorties culturelles','Musiques','Œnologie','Sport','Randonnées','Sports mécaniques','Parapentes','Couture','Dessins','La Ruche'];
function tidyCategories(values){const result=[];if(!Array.isArray(values))values=DEFAULT_CATEGORIES;for(const item of values){const name=String(item||'').trim().replace(/\s+/g,' ').slice(0,45);if(name&&!result.some(x=>x.toLocaleLowerCase('fr')===name.toLocaleLowerCase('fr')))result.push(name)}return result.sort((a,b)=>a==='Informations'?-1:b==='Informations'?1:DEFAULT_CATEGORIES.indexOf(a)>=0&&DEFAULT_CATEGORIES.indexOf(b)>=0?DEFAULT_CATEGORIES.indexOf(a)-DEFAULT_CATEGORIES.indexOf(b):DEFAULT_CATEGORIES.includes(a)?-1:DEFAULT_CATEGORIES.includes(b)?1:a.localeCompare(b,'fr'))}
let categories=tidyCategories(read(KEYS.categories,DEFAULT_CATEGORIES));
function renderCategoryOptions(){const select=$('category'),value=activity.category;select.replaceChildren();for(const name of categories){const opt=document.createElement('option');opt.value=name;opt.textContent=name;select.append(opt)}if(value&&!categories.includes(value)){const opt=document.createElement('option');opt.value=value;opt.textContent=value+' (catégorie ancienne)';select.append(opt)}select.value=value||categories[0]||'';}
function saveCategories(){return store(KEYS.categories,categories)}
function addCategory(){const name=$('newCategory').value.trim().replace(/\s+/g,' ').slice(0,45);if(!name)return notify('Renseigne un nom de catégorie.',true);const existing=categories.find(x=>x.toLocaleLowerCase('fr')===name.toLocaleLowerCase('fr'));if(existing){activity.category=existing;renderCategoryOptions();notify('Cette catégorie existe déjà.');return}categories=tidyCategories([...categories,name]);saveCategories();activity.category=name;renderCategoryOptions();$('newCategory').value='';revokeApproval();render();dirty();notify('Catégorie « '+name+' » ajoutée et enregistrée.')}
function deleteCategory(){const name=activity.category;if(!categories.includes(name))return notify('Catégorie non enregistrée.',true);const used=Object.values(activities).filter(a=>a.category===name).length;if(used)return notify('Impossible de supprimer « '+name+' » : '+used+' activité(s) sauvegardée(s) utilisent cette catégorie. Modifie-les d’abord.',true);if(!confirm('Supprimer la catégorie « '+name+' » du catalogue ?'))return;categories=categories.filter(x=>x!==name);saveCategories();activity.category=categories[0]||'';renderCategoryOptions();revokeApproval();render();dirty();notify('Catégorie supprimée.')}
function renderContacts(){const root=$('contactsList');root.replaceChildren();activity.contacts.forEach((item,i)=>{const row=document.createElement('div');row.className='contact-row';for(const field of ['name','email']){const group=document.createElement('div');group.className='field';const label=document.createElement('label');label.textContent=field==='name'?'Nom du référent '+(i+1):'E-mail (facultatif)';const input=document.createElement('input');input.type=field==='email'?'email':'text';input.maxLength=field==='email'?130:80;input.value=item[field]||'';input.placeholder=field==='name'?'Prénom Nom':'adresse@exemple.fr';input.setAttribute('aria-label',label.textContent);input.addEventListener('input',()=>{activity.contacts[i][field]=input.value;syncLegacyContact();revokeApproval();renderPreflight();drawPreview();dirty()});group.append(label,input);row.append(group)}const remove=document.createElement('button');remove.type='button';remove.textContent='Retirer';remove.setAttribute('aria-label','Retirer le contact '+(i+1));remove.onclick=()=>{activity.contacts.splice(i,1);syncLegacyContact();renderContacts();revokeApproval();render();dirty()};row.append(remove);root.append(row)})}
function syncLegacyContact(){activity.contact=activity.contacts[0]?.name||'';activity.contactEmail=activity.contacts[0]?.email||''}
function revokeApproval(){if(activity.editorialStatus==='approved'){activity.editorialStatus='review';$('editorialStatus').value='review'}}
function futureActivities(){const today=new Date().toLocaleDateString('sv-SE');return Object.values(activities).filter(a=>a&&a.editorialStatus==='approved'&&a.activityStart&&a.activityStart>=today&&a.status!=='Annulé').sort((a,b)=>a.activityStart.localeCompare(b.activityStart)||String(a.title||'').localeCompare(String(b.title||''),'fr')).slice(0,8)}
function renderLayout(a){return L.render(a,P,{upcomingItems:futureActivities()})}
let defaultRates=read(KEYS.rates,[...P.DEFAULT_RATES]);if(!Array.isArray(defaultRates)||defaultRates.length!==10)defaultRates=[...P.DEFAULT_RATES];defaultRates=defaultRates.map(P.boundedRate);
const EMPTY_BASE={...sample,title:'',category:'Informations',template:'classic',location:'',venue:'',activityStart:'',activityEnd:'',subtitle:'',summary:'',highlights:'',included:'',administrative:'',warning:'',outsidePrice:'',showPricing:false,priceLabel:'Tarif bénéficiaire',priceNotes:'',conditions:'',registrationStart:'',registrationEnd:'',status:'auto',audience:'',minimum:'',maximum:'',points:'',pointCounter:'',carbon:'',contact:'',contactEmail:'',contacts:[],photoData:'',photo2Data:'',photoUrl:'',internalReference:'',editorialStatus:'draft',linkType:'cse',customUrl:'',ctaLabel:'Plus d’infos'};
function normalize(source){const v=source&&typeof source==='object'?source:{};const a={...EMPTY_BASE};for(const k of FIELDS)a[k]=v[k]??EMPTY_BASE[k];a.template=({detail:'classic',simple:'hero',cards:'classic',prices:'classic',agenda:'classic'}[v.template]||v.template||EMPTY_BASE.template);if(!L.CHOICES.some(c=>c.id===a.template))a.template='classic';a.showPricing=v.showPricing===undefined?String(v.outsidePrice??EMPTY_BASE.outsidePrice).trim()!=='' : v.showPricing!==false;a.rates=Array.from({length:10},(_,i)=>P.boundedRate(v.rates?.[i]??defaultRates[i]));a.photoData=/^data:image\/(png|jpeg|webp);base64,/i.test(String(v.photoData||''))?v.photoData:'';a.photo2Data=/^data:image\/(png|jpeg|webp);base64,/i.test(String(v.photo2Data||''))?v.photo2Data:'';a.editorialStatus=['draft','review','approved'].includes(v.editorialStatus)?v.editorialStatus:'draft';a.internalReference=String(v.internalReference||'').slice(0,50);a.contacts=Array.isArray(v.contacts)?v.contacts.slice(0,15).map(c=>({name:String(c?.name||'').slice(0,80),email:String(c?.email||'').slice(0,130)})):(v.contact||v.contactEmail?[{name:String(v.contact||''),email:String(v.contactEmail||'')}]:[]);a.contact=a.contacts[0]?.name||'';a.contactEmail=a.contacts[0]?.email||'';a.points=String(v.points??EMPTY_BASE.points).replace(/\s*points?\s*/gi,'').trim();a.pointCounter=['long','short','france'].includes(v.pointCounter)?v.pointCounter:(a.points?'long':'');return a}
function blank(){return normalize({...EMPTY_BASE,contacts:[],rates:defaultRates})}
let activities=read(KEYS.activities,{});if(!activities||typeof activities!=='object'||Array.isArray(activities))activities={};
let activity=normalize(read(KEYS.draft,null)||sample),activeId=null;
const demoPhoto=a=>/sri.?lanka/i.test(a.title||'')&&a.category==='Voyages';
function photoSource(a,which){if(which==='banner')return 'assets/bandeau-cse.jpg';if(which==='secondary')return a.photo2Data||a.photoData||a.photoUrl||(demoPhoto(a)?'assets/sri-lanka.jpg':'');return a.photoData||a.photoUrl||(demoPhoto(a)?'assets/sri-lanka.jpg':'')}
function notify(message,error=false){const n=$('toast');n.textContent=message;n.style.background=error?'#a5364b':'#234282';n.style.display='block';clearTimeout(notify.timer);notify.timer=setTimeout(()=>n.style.display='none',5500)}
function fileName(s){return String(s||'activite').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'_').slice(0,65)}
function store(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch{notify('Stockage plein : exportez la fiche JSON et réduisez la taille des images.',true);return false}}
function dirty(){store(KEYS.draft,activity);$('saveState').textContent='● Brouillon local'}
function download(content,mime,name){const u=URL.createObjectURL(new Blob([content],{type:mime}));const a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500)}
function renderGallery(){const root=$('templateGallery');root.innerHTML='';L.CHOICES.forEach(choice=>{const b=document.createElement('button');b.type='button';b.className='template-option';b.dataset.t=choice.id;b.setAttribute('aria-pressed',String(activity.template===choice.id));b.innerHTML='<span class="mini-slide"><span class="mini-banner"></span><span class="mini-content"><span></span><span></span><span></span><span></span></span></span><span class="template-name"></span><span class="template-use"></span>';b.querySelector('.template-name').textContent=choice.name;b.querySelector('.template-use').textContent=choice.use;b.addEventListener('click',()=>{activity.template=choice.id;if(choice.id==='upcoming'&&!activity.title.trim())activity.title='Programme des futures activités';if(choice.id==='info'&&activity.category==='Voyages')activity.category='Informations';if(activity.editorialStatus==='approved'){activity.editorialStatus='review';$('editorialStatus').value='review'}renderGallery();renderCategoryOptions();$('title').value=activity.title;drawPreview();renderPreflight();dirty()});root.append(b)});$('templateHelp').textContent=L.CHOICES.find(c=>c.id===activity.template)?.help||''}
function renderForm(){for(const k of FIELDS){const el=$(k);if(el)el.value=activity[k]??''}$('showPricing').checked=activity.showPricing;renderCategoryOptions();renderContacts();renderRates();renderGallery();renderDynamic()}
function renderRates(){const root=$('rateInputs');root.innerHTML='';activity.rates.forEach((r,i)=>{const lab=document.createElement('label');lab.textContent='T'+(i+1)+' · %';const input=document.createElement('input');input.type='number';input.min='0';input.max='100';input.step='0.5';input.value=r;input.setAttribute('aria-label','Subvention T'+(i+1));input.addEventListener('input',()=>{activity.rates[i]=P.boundedRate(input.value);renderPricing();drawPreview();dirty()});lab.append(input);root.append(lab)})}
function renderDynamic(){$('pricingFields').classList.toggle('hidden',!activity.showPricing);$('showPricing').checked=activity.showPricing;const fixed=activity.pricingMode!=='tranches';$('fixedRow').classList.toggle('hidden',!fixed);$('trancheConfig').classList.toggle('hidden',fixed);$('fixedRateField').classList.toggle('hidden',activity.pricingMode==='fixedEuro');$('fixedEuroField').classList.toggle('hidden',activity.pricingMode!=='fixedEuro');$('fixedRateLabel').textContent=activity.pricingMode==='fixedEmployee'?'Participation salarié (%)':'Subvention CSE (%)';$('customLinkField').classList.toggle('hidden',activity.linkType!=='custom');const u=L.effectiveUrl(activity);$('effectiveLink').textContent=u?(L.safeUrl(u)?'↗ '+u:'Lien invalide : renseigner une adresse HTTP(S) complète'):'Aucun lien sur la diapositive';$('photoIndicator').textContent=activity.photoData?'Photo importée ✓':activity.photoUrl?'Photo distante : '+activity.photoUrl:demoPhoto(activity)?'Photo Sri Lanka de démonstration':'Aucune photo : un cadre neutre apparaîtra';$('photo2Indicator').textContent=activity.photo2Data?'Deuxième photo importée ✓':'Facultatif, principalement utilisé dans le modèle « En cartes ».'}
function renderPricing(){if(!activity.showPricing){$('pricingTable').replaceChildren();return}const rows=P.compute(activity.outsidePrice,activity.pricingMode,activity.rates,activity.fixedRate,activity.fixedEuro);const el=$('pricingTable');el.innerHTML='';const table=document.createElement('table'),thead=document.createElement('thead'),head=document.createElement('tr');['Tranche','Subvention CSE','Prix bénéficiaire'].forEach(x=>{const th=document.createElement('th');th.textContent=x;head.append(th)});thead.append(head);table.append(thead);const body=document.createElement('tbody');rows.forEach(r=>{const tr=document.createElement('tr');[r.label,r.subsidy===null?'—':r.subsidy+' %',euro(r.price)].forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.append(td)});body.append(tr)});table.append(body);el.append(table)}
let lastLayout=null;
function drawPreview(){lastLayout=renderLayout(activity);const slide=$('slide');slide.innerHTML='';for(const el of lastLayout.elements){let dom;if(el.type==='image'){const url=photoSource(activity,el.which);if(!url){dom=document.createElement('div');dom.textContent=el.which==='banner'?'BANDEAU CSE':'PHOTO À AJOUTER';dom.style.background='#e9eff9';dom.style.color='#73809c';dom.style.display='grid';dom.style.placeItems='center';dom.style.fontSize='17px';dom.style.fontWeight='bold'}else{dom=document.createElement('img');dom.alt=el.which==='banner'?'Bandeau CSE':'Photo activité';dom.classList.add('slide-photo');dom.src=url;dom.onerror=()=>{dom.removeAttribute('src');dom.style.background='#edf1f8';dom.alt='Image indisponible';dom.title='Image inaccessible : choisissez un fichier local'}}}
 else if(el.type==='box'){dom=document.createElement('div');dom.style.background=el.fill||'white';if(el.stroke)dom.style.border='1px solid '+el.stroke;dom.style.borderRadius=(el.radius||0)+'px'}
 else {dom=document.createElement(el.type==='link'?'a':'div');dom.classList.add('slide-text');dom.textContent=el.text||'';dom.style.fontSize=(el.size||15)+'px';dom.style.fontWeight=el.bold?'800':'400';dom.style.color=el.color||'#152642';dom.style.textAlign=el.align||'left';dom.style.lineHeight=el.top?'1.23':'1.15';if(el.type==='link'){dom.classList.add('slide-cta');dom.href=el.url;dom.target='_blank';dom.rel='noopener noreferrer'}}
 dom.classList.add('slide-el');dom.style.left=el.x+'px';dom.style.top=el.y+'px';dom.style.width=el.w+'px';dom.style.height=el.h+'px';slide.append(dom)}renderWarnings();fitSlide()}
function fitSlide(){const w=$('slideMount').clientWidth;if(w)$('slide').style.transform='scale('+(w/1200)+')'}
function renderWarnings(){const list=[];const a=activity;if(!a.title.trim())list.push('Le titre est obligatoire pour l’export.');if(a.showPricing&&a.outsidePrice==='')list.push('Tarifs activés : renseigner le prix extérieur.');if(a.activityStart&&a.activityEnd&&a.activityStart>a.activityEnd)list.push('La fin de l’activité précède son début.');if(a.registrationStart&&a.registrationEnd&&a.registrationStart>a.registrationEnd)list.push('La clôture des inscriptions précède leur ouverture.');if(a.minimum&&a.maximum&&Number(a.minimum)>Number(a.maximum))list.push('Maximum de participants inférieur au minimum.');if(a.linkType==='custom'&&a.customUrl&&!L.safeUrl(a.customUrl))list.push('Le lien personnalisé n’est pas une URL valide.');if(a.showPricing&&a.pricingMode==='fixedEuro'&&P.finite(a.fixedEuro)>P.finite(a.outsidePrice))list.push('Tarif bénéficiaire supérieur au prix extérieur.');if(L.list(a.highlights).length>(a.template==='hero'?3:a.template==='info'?2:6))list.push('Programme long pour ce modèle : vérifier l’aperçu et le PPTX.');if(a.template==='upcoming'&&!futureActivities().length)list.push('Programme : aucune activité future validée enregistrée dans ce navigateur.');if(a.summary.length>380)list.push('Description longue : risque de manque de lisibilité.');if(!['info','upcoming'].includes(a.template)&&!a.photoData&&!a.photoUrl&&!demoPhoto(a))list.push('Aucune image ajoutée : un emplacement photo neutre sera utilisé.');const box=$('warnings');box.innerHTML='';const e=document.createElement('div');e.className=list.length?'warn':'valid';e.textContent=list.length?'À vérifier : '+list.join(' · '):'✓ Aucune incohérence détectée. Relisez la slide avant publication.';box.append(e)}
function render(){renderDynamic();renderPricing();drawPreview();renderPreflight()}

const editorialNames={draft:'Brouillon',review:'À relire',approved:'Validée'};
function preflight(a=activity){
 const title=String(a.title||'').trim(),outside=!a.showPricing||(a.outsidePrice!==''&&Number.isFinite(Number(a.outsidePrice))&&Number(a.outsidePrice)>=0);
 const hasDate=Boolean(a.activityStart)||['info','upcoming'].includes(a.template),datesOk=!(a.activityStart&&a.activityEnd&&a.activityStart>a.activityEnd);
 const regOk=!(a.registrationStart&&a.registrationEnd&&a.registrationStart>a.registrationEnd);
 const participantsOk=!(a.minimum&&a.maximum&&Number(a.minimum)>Number(a.maximum));
 const linkOk=a.linkType!=='custom'||!String(a.customUrl||'').trim()||L.safeUrl(a.customUrl);
 const checks=[
   {name:'Titre de l’activité',ok:!!title,severe:true},
   {name:'Date de l’activité',ok:hasDate&&datesOk,severe:!datesOk},
   {name:'Prix extérieur / tarif',ok:outside,severe:true},
   {name:'Cohérence des inscriptions',ok:regOk,severe:true},
   {name:'Participants min. / max.',ok:participantsOk,severe:true},
   {name:'Lien personnalisé valide',ok:linkOk,severe:true},
   {name:'Photo de l’activité',ok:['info','upcoming'].includes(a.template)||!!(a.photoData||a.photoUrl||demoPhoto(a)),severe:false},
   {name:'Compteur de points',ok:!a.points||(['long','short','france'].includes(a.pointCounter)&&Number(a.points)>=0),severe:!!a.points},
   {name:'Programme des futures activités',ok:a.template!=='upcoming'||futureActivities().length>0,severe:a.template==='upcoming'},
   {name:'Description à relire',ok:!!String(a.summary||'').trim(),severe:false},
 ];
 return {checks,blocking:checks.filter(c=>!c.ok&&c.severe),complete:checks.filter(c=>c.ok).length};
}
function renderPreflight(){const target=$('preflightChecks');if(!target)return;const p=preflight(activity);target.innerHTML='';p.checks.forEach(check=>{const row=document.createElement('div');row.className='check-item '+(check.ok?'ok':check.severe?'bad':'warn');row.textContent=(check.ok?'✓ ':check.severe?'✕ ':'! ')+check.name;target.append(row)});const status=activity.editorialStatus||'draft';const badge=$('reviewBadge');badge.textContent=editorialNames[status]||'Brouillon';badge.className='review-badge '+status;$('markApproved').disabled=!!p.blocking.length;$('markApproved').title=p.blocking.length?'Renseigner les éléments obligatoires avant validation':''}
function setEditorial(status){if(status==='approved'&&preflight().blocking.length){notify('Corrige les points bloquants avant de valider cette activité.',true);$('preflightChecks').scrollIntoView({behavior:'smooth',block:'center'});return}activity.editorialStatus=status;$('editorialStatus').value=status;renderPreflight();dirty();saveActivity()}

function saveActivity(){if(!activity.title.trim()){notify('Le titre de l’activité est obligatoire.',true);$('title').focus();return}activeId ||= 'act-'+Date.now()+'-'+Math.random().toString(36).slice(2,6);activities[activeId]={...activity,updatedAt:new Date().toISOString()};if(store(KEYS.activities,activities)){$('saveState').textContent='● Activité enregistrée';renderLibrary();notify('Activité enregistrée sur ce navigateur.')}}
function renderLibrary(){
 const root=$('activityLibrary');root.innerHTML='';const filter=$('librarySearch').value.toLocaleLowerCase('fr');const statusFilter=$('libraryFilter')?.value||'all';
 const keys=Object.keys(activities).filter(k=>{
  const a=activities[k];return String(a?.title||'').toLocaleLowerCase('fr').includes(filter)&&(statusFilter==='all'||(a.editorialStatus||'draft')===statusFilter)
 }).sort((x,y)=>String(activities[y]?.updatedAt||'').localeCompare(String(activities[x]?.updatedAt||'')));
 $('libraryCount').textContent=Object.keys(activities).length;
 if(!keys.length){const e=document.createElement('p');e.className='library-empty';e.textContent='Aucune activité correspondante.';root.append(e);return}
 keys.forEach(id=>{
  const row=document.createElement('div');row.className='library-row';
  const title=document.createElement('strong');title.textContent=activities[id].title||'Activité';title.title=title.textContent;row.append(title);
  const tag=document.createElement('span');tag.className='editorial-label '+(activities[id].editorialStatus||'draft');tag.textContent=editorialNames[activities[id].editorialStatus]||'Brouillon';row.append(tag);
  const open=document.createElement('button');open.type='button';open.textContent='Ouvrir';open.onclick=()=>{activity=normalize(activities[id]);activeId=id;renderForm();render();dirty();$('saveState').textContent='● Activité enregistrée'};
  const del=document.createElement('button');del.type='button';del.textContent='Suppr.';del.className='delete';del.onclick=()=>{if(confirm('Supprimer « '+activities[id].title+' » de ce navigateur ?')){delete activities[id];if(activeId===id)activeId=null;store(KEYS.activities,activities);renderLibrary()}};
  row.append(open,del);root.append(row);
 });
}
function exportJSON(){download(JSON.stringify({schema:'cse-studio:2',date:new Date().toISOString(),activity},null,2),'application/json','CSE_'+fileName(activity.title)+'.json');notify('Fiche JSON téléchargée.')}
function csvEscape(s){return '"'+String(s??'').replaceAll('"','""')+'"'}
function exportCSV(){const vals={TARIFS_ACTIFS:activity.showPricing?'Oui':'Non',COMPTEUR_POINTS:activity.pointCounter,REFERENTS:L.contactLine(activity),TEMPLATE:activity.template,TITRE:activity.title,CATEGORIE:activity.category,SOUS_TITRE:activity.subtitle,VILLE:activity.location,LIEU:activity.venue,DATE:P.dateRange(activity.activityStart,activity.activityEnd),DESCRIPTION:activity.summary,TEMPS_FORTS:L.list(activity.highlights).join(' • '),PRESTATIONS:L.list(activity.included).join(' • '),FORMALITES:activity.administrative,AVERTISSEMENT:activity.warning,STATUT:L.statusLabel(activity),FIN_INSCRIPTIONS:P.toFrDate(activity.registrationEnd),PRIX_EXTERIEUR:activity.showPricing?euro(activity.outsidePrice):'',CONDITIONS:activity.conditions,CONTACT:activity.contact,POINTS:activity.points,MINIMUM:activity.minimum,MAXIMUM:activity.maximum,LIEN:L.effectiveUrl(activity),CTA:activity.ctaLabel};const rows=P.compute(activity.outsidePrice,activity.pricingMode,activity.rates,activity.fixedRate,activity.fixedEuro);for(let i=0;i<10;i++)vals['T'+(i+1)]=activity.showPricing&&activity.pricingMode==='tranches'?euro(rows[i].price):'';vals.PRIX_UNIQUE=activity.showPricing&&activity.pricingMode!=='tranches'?euro(rows[0].price):'';const keys=Object.keys(vals);download('\ufeff'+keys.map(csvEscape).join(';')+'\r\n'+keys.map(k=>csvEscape(vals[k])).join(';')+'\r\n','text/csv;charset=utf-8','CSE_'+fileName(activity.title)+'.csv');notify('CSV généré.')}
function readPhoto(file,which){if(!file)return;if(file.size>4*1024*1024)return notify('La photo dépasse 4 Mo. Réduisez sa taille avant import.',true);if(!/^image\/(png|jpeg|webp)$/.test(file.type))return notify('Utilisez une image JPG, PNG ou WebP.',true);const r=new FileReader();r.onload=()=>{activity[which]=r.result;if(activity.editorialStatus==='approved'){activity.editorialStatus='review';$('editorialStatus').value='review'}if(which==='photoData'){activity.photoUrl='';$('photoUrl').value=''}render();dirty();notify('Photo importée avec succès')};r.onerror=()=>notify('Impossible de lire la photo',true);r.readAsDataURL(file)}
async function fetchImage(src){if(!src)return null;if(/^data:image\//.test(src))return src;const resp=await fetch(src,{cache:'no-store'});if(!resp.ok)throw Error('HTTP '+resp.status+' : '+src);const blob=await resp.blob();if(!blob.type.startsWith('image/'))throw Error('Format non image');return await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob)})}
async function imageCropPng(data,targetW,targetH){return await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{try{const c=document.createElement('canvas');c.width=Math.ceil(targetW*2);c.height=Math.ceil(targetH*2);const ctx=c.getContext('2d');const scale=Math.max(c.width/im.naturalWidth,c.height/im.naturalHeight);const w=im.naturalWidth*scale,h=im.naturalHeight*scale;ctx.drawImage(im,(c.width-w)/2,(c.height-h)/2,w,h);resolve(c.toDataURL('image/png'))}catch(e){reject(e)}};im.onerror=()=>reject(Error('Décodage image impossible'));im.src=data})}
async function imageContainPng(data,targetW,targetH){return await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{try{const c=document.createElement('canvas');c.width=Math.ceil(targetW*2);c.height=Math.ceil(targetH*2);const ctx=c.getContext('2d');const w=c.width,h=c.height;ctx.drawImage(im,0,0,w,h);resolve(c.toDataURL('image/png'))}catch(e){reject(e)}};im.onerror=()=>reject(Error('Décodage impossible'));im.src=data})}
async function loadPicture(which,cache,warnings,a=activity){if(which in cache)return cache[which];const source=photoSource(a,which);const options=which==='banner'?[source,'bandeau-cse.jpg']:which==='primary'?[source]:which==='secondary'?[source,photoSource(a,'primary')]:[];for(const item of [...new Set(options.filter(Boolean))]){try{const data=await fetchImage(item);return cache[which]=data}catch(err){console.warn('[CSE Studio V4]',err);warnings.push('Image inaccessible : '+which)}}return cache[which]=null}
function pptColor(v){const s=String(v||'FFFFFF').replace(/^#/,'');const c=/^[0-9a-f]{3}$/i.test(s)?s.split('').map(x=>x+x).join(''):s;return /^[0-9a-f]{6}$/i.test(c)?c.toUpperCase():'FFFFFF'}
async function appendPowerPointSlide(pptx,a,warnings){
 const slide=pptx.addSlide();slide.background={color:'FFFFFF'};
 const Sh=pptx.ShapeType,inch=n=>n/90,cache={};const layout=renderLayout(a);
 const needed=[...new Set(layout.elements.filter(x=>x.type==='image').map(x=>x.which))];
 await Promise.all(needed.map(which=>loadPicture(which,cache,warnings,a)));
 for(const item of layout.elements){
  const g={x:inch(item.x),y:inch(item.y),w:inch(item.w),h:inch(item.h)};
  if(item.type==='box'){
   const sh=item.radius?Sh.roundRect:Sh.rect;
   slide.addShape(sh,{...g,rectRadius:item.radius?0.12:undefined,line:{color:pptColor(item.stroke||item.fill||'#fff'),transparency:item.stroke?0:100,width:item.stroke?.8:0},fill:{color:pptColor(item.fill||'#fff')}});continue;
  }
  if(item.type==='image'){
   if(cache[item.which]){try{
    const data=item.which==='banner'?await imageContainPng(cache[item.which],item.w,item.h):await imageCropPng(cache[item.which],item.w,item.h);
    slide.addImage({data,...g})
   }catch(err){warnings.push('Image non décodable : '+item.which);slide.addShape(Sh.rect,{...g,line:{color:'E0E8F5'},fill:{color:'EDF2FA'}})}}
   else{slide.addShape(Sh.rect,{...g,line:{color:'E0E8F5'},fill:{color:'EDF2FA'}});slide.addText(item.which==='banner'?'BANDEAU CSE':'PHOTO À AJOUTER',{...g,fontFace:'Arial',fontSize:12,color:'6A7D99',bold:true,align:'center',valign:'mid',margin:0})}
   continue;
  }
  const options={...g,margin:0,fontFace:'Arial',fontSize:Math.max(6,(item.size||15)*0.75),bold:!!item.bold,color:pptColor(item.color||'#172948'),align:item.align||'left',valign:item.top?'top':'mid',fit:'shrink',breakLine:false};
  if(item.type==='link')options.hyperlink={url:item.url};
  slide.addText(String(item.text||''),options);
 }
 return layout;
}
async function exportPPTX(){
 if(!activity.title.trim()){notify('Renseignez le titre avant l’export.',true);$('title').focus();return}
 const buttons=[$('exportPptx'),$('exportPptxBottom')];buttons.forEach(b=>b.disabled=true);$('exportPptx').textContent='Export en cours…';
 try{
  const Ctor=window.PptxGenJS;if(!Ctor)throw Error('Module PowerPoint non chargé : vérifier le dossier vendor.');
  const pptx=new Ctor();pptx.layout='LAYOUT_WIDE';pptx.author='CSE Thales LAS Massy';pptx.subject='Activité CSE Studio V4';pptx.title=activity.title;pptx.lang='fr-FR';
  const warnings=[];const lay=await appendPowerPointSlide(pptx,activity,warnings);
  await pptx.writeFile({fileName:'CSE_V4_'+fileName(activity.title)+'_'+lay.type+'.pptx'});
  notify('PowerPoint généré · '+(L.CHOICES.find(x=>x.id===lay.type)?.name||lay.type)+(warnings.length?' (images à contrôler)':''));
 }catch(err){console.error(err);notify('Export PowerPoint impossible : '+err.message,true)}
 finally{buttons.forEach(b=>b.disabled=false);$('exportPptx').textContent='↓ Exporter PowerPoint'}
}
async function exportAllPptx(){
 const candidates=Object.values(activities).filter(a=>a?.editorialStatus==='approved'&&a.title&&preflight(a).blocking.length===0).sort((a,b)=>(a.title||'').localeCompare(b.title||'','fr'));
 if(!candidates.length){notify('Aucune activité validée dans la bibliothèque. Enregistre et valide au moins une fiche.',true);return}
 if(candidates.length>25){notify('Export groupé limité à 25 activités. Exporte les activités supplémentaires individuellement ou répartis-les dans plusieurs bibliothèques.',true);return}
 const btn=$('exportAllPptx');btn.disabled=true;btn.textContent='Création du dossier…';
 try{
  const Ctor=window.PptxGenJS;if(!Ctor)throw Error('Module PowerPoint non chargé.');
  const pptx=new Ctor();pptx.layout='LAYOUT_WIDE';pptx.author='CSE Thales LAS Massy';pptx.subject='Activités validées CSE Studio V4';pptx.title='Activités du CSE';pptx.lang='fr-FR';
  const warnings=[];for(const a of candidates)await appendPowerPointSlide(pptx,normalize(a),warnings);
  await pptx.writeFile({fileName:'CSE_V4_Lot_'+candidates.length+'_activites.pptx'});
  notify(candidates.length+' diapositives réunies dans un PowerPoint'+(warnings.length?' · vérifier les images':''));
 }catch(err){console.error(err);notify('Export groupé impossible : '+err.message,true)}
 finally{btn.disabled=false;btn.textContent='↓ PPTX groupé · Activités validées'}
}
function exportLibraryJSON(){
 const rows=Object.values(activities);
 download(JSON.stringify({schema:'cse-studio:3-library',exportedAt:new Date().toISOString(),categories,activities:rows},null,2),'application/json','CSE_Studio_Bibliotheque_'+new Date().toISOString().slice(0,10)+'.json');
 notify(rows.length+' fiches sauvegardées au format JSON.');
}
function importLibraryJSON(file){if(!file)return;if(file.size>15*1024*1024){notify('Fichier trop volumineux (max. 15 Mo).',true);return}
 const reader=new FileReader();reader.onload=()=>{try{
  const obj=JSON.parse(reader.result);if(obj.schema!=='cse-studio:3-library'||!Array.isArray(obj.activities)||obj.activities.length>200)throw Error('Format de bibliothèque invalide.');
  const next={...activities};if(Array.isArray(obj.categories)){categories=tidyCategories([...categories,...obj.categories]);saveCategories();renderCategoryOptions()}for(const row of obj.activities){if(!row||typeof row!=='object'||Array.isArray(row))continue;const a=normalize(row);if(!a.title)continue;const id='act-import-'+Date.now()+'-'+Math.random().toString(36).slice(2,9);next[id]={...a,updatedAt:new Date().toISOString()}}
  if(store(KEYS.activities,next)){activities=next;renderLibrary();render();notify('Bibliothèque importée : '+obj.activities.length+' entrées proposées.')}else notify('Import annulé : espace de stockage insuffisant.',true)
 }catch(err){notify('Import impossible : '+err.message,true)}};
 reader.onerror=()=>notify('Fichier illisible.',true);reader.readAsText(file);
}
function copyImagePrompt(){
 const a=activity;const prompt=['Créer une photographie professionnelle pour une diapositive de communication du CSE Thales LAS Massy.','Sujet : '+(a.title||'activité du CSE')+'.','Catégorie : '+(a.category||'loisirs')+'.','Lieu : '+(a.location||a.venue||'à préciser')+'.','Ambiance : lumineuse, réaliste, accueillante et de qualité éditoriale.','Format paysage 16:9. Aucun texte, logo, badge, encadrement ni filigrane dans l’image.','Description de l’activité : '+String(a.summary||'').slice(0,450)].join('\n');
 if(navigator.clipboard?.writeText){navigator.clipboard.writeText(prompt).then(()=>notify('Brief d’image copié. À coller dans l’outil IA de ton choix.')).catch(()=>fallbackCopy(prompt))}
 else fallbackCopy(prompt);
}
function fallbackCopy(value){const area=document.createElement('textarea');area.value=value;document.body.append(area);area.select();const ok=document.execCommand('copy');area.remove();notify(ok?'Brief d’image copié.':'Impossible de copier le brief automatiquement.',!ok)}

for(const k of FIELDS){const el=$(k);if(!el)continue;el.addEventListener('input',()=>{activity[k]=el.value;if(k==='editorialStatus'&&el.value==='approved'&&preflight().blocking.length){activity.editorialStatus='review';el.value='review';notify('Complète les points obligatoires avant validation.',true)}if(k!=='editorialStatus'&&activity.editorialStatus==='approved'){activity.editorialStatus='review';$('editorialStatus').value='review'}if(k==='photoUrl'&&el.value)activity.photoData='';render();dirty()})}
$('addCategory').addEventListener('click',addCategory);$('deleteCategory').addEventListener('click',deleteCategory);$('newCategory').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addCategory()}});$('addContact').addEventListener('click',()=>{if(activity.contacts.length>=15)return notify('15 contacts maximum.',true);activity.contacts.push({name:'',email:''});renderContacts();revokeApproval();render();dirty()});$('showPricing').addEventListener('change',e=>{activity.showPricing=e.target.checked;revokeApproval();render();dirty()});
$('newActivity').addEventListener('click',()=>{activity=blank();activeId=null;renderForm();render();dirty();notify('Nouvelle fiche créée')});$('saveActivity').addEventListener('click',saveActivity);$('duplicateActivity').addEventListener('click',()=>{activity={...activity,title:(activity.title||'Activité')+' (copie)',rates:[...activity.rates],contacts:activity.contacts.map(c=>({...c}))};activeId=null;renderForm();render();dirty();notify('Activité dupliquée')});$('saveRates').addEventListener('click',()=>{defaultRates=[...activity.rates];store(KEYS.rates,defaultRates);notify('Barème enregistré comme valeur par défaut')});$('librarySearch').addEventListener('input',renderLibrary);$('exportProject').addEventListener('click',exportJSON);$('importProject').addEventListener('change',e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const o=JSON.parse(r.result);const a=o.activity||o;if(!a||typeof a!=='object'||Array.isArray(a))throw Error('Fiche invalide');activity=normalize(a);activeId=null;renderForm();render();dirty();notify('Fiche importée')}catch(err){notify('JSON invalide : '+err.message,true)}};r.readAsText(f);e.target.value=''});$('photoFile').addEventListener('change',e=>readPhoto(e.target.files?.[0],'photoData'));$('photo2File').addEventListener('change',e=>readPhoto(e.target.files?.[0],'photo2Data'));$('exportCSV').addEventListener('click',exportCSV);$('exportPptx').addEventListener('click',exportPPTX);$('exportPptxBottom').addEventListener('click',exportPPTX);$('printSlide').addEventListener('click',()=>window.print());$('activityForm').addEventListener('submit',e=>e.preventDefault());window.addEventListener('resize',fitSlide);if(window.ResizeObserver)new ResizeObserver(fitSlide).observe($('slideMount'));
$('markReview').addEventListener('click',()=>setEditorial('review'));
$('markApproved').addEventListener('click',()=>setEditorial('approved'));
$('libraryFilter').addEventListener('change',renderLibrary);
$('exportLibraryJSON').addEventListener('click',exportLibraryJSON);
$('importLibraryJSON').addEventListener('change',e=>{importLibraryJSON(e.target.files?.[0]);e.target.value=''});
$('exportAllPptx').addEventListener('click',exportAllPptx);
$('copyImagePrompt').addEventListener('click',copyImagePrompt);

renderForm();renderLibrary();render();window.CSEStudioV6={getCategories:()=>[...categories],getFutureActivities:()=>futureActivities().map(a=>({...a}))};window.CSEStudioV3={getActivity:()=>JSON.parse(JSON.stringify(activity)),getPrices:()=>P.compute(activity.outsidePrice,activity.pricingMode,activity.rates,activity.fixedRate,activity.fixedEuro),getLayout:()=>renderLayout(activity),getPreflight:()=>preflight(),getLibrary:()=>JSON.parse(JSON.stringify(activities)),exportPPTX,exportAllPptx};window.CSEStudioV4Editor={
 getActivity:()=>JSON.parse(JSON.stringify(activity)),
 setActivity:raw=>{activity=normalize(raw);activeId=null;renderForm();render();dirty();notify('Fiche partagée chargée dans l’éditeur.');},
 getPreflight:()=>preflight(activity),
 exportCloudBatch:async rows=>{
  const candidates=rows.filter(a=>a&&a.editorialStatus==='approved'&&preflight(a).blocking.length===0);
  if(!candidates.length)throw Error('Aucune activité en ligne approuvée et complète.');
  if(candidates.length>25)throw Error('25 diapositives maximum par export.');
  const Ctor=window.PptxGenJS;if(!Ctor)throw Error('Module PowerPoint absent.');
  const pptx=new Ctor();pptx.layout='LAYOUT_WIDE';pptx.author='CSE Thales LAS Massy';pptx.title='Activités approuvées · espace partagé';pptx.lang='fr-FR';
  const warnings=[];for(const a of candidates)await appendPowerPointSlide(pptx,normalize(a),warnings);
  await pptx.writeFile({fileName:'CSE_V4_Activites_Partagees_'+candidates.length+'.pptx'});
  notify(candidates.length+' diapositives approuvées exportées'+(warnings.length?' · contrôler les visuels':''));
 }
};
window.CSEStudioV5Export=async function(){
 const report=preflight(activity);if(report.blocking.length)throw Error('Fiche incomplète : corriger les points bloquants avant publication.');
 const Ctor=window.PptxGenJS;if(!Ctor)throw Error('Module PowerPoint manquant.');
 const pptx=new Ctor();pptx.layout='LAYOUT_WIDE';pptx.author='CSE Thales LAS Massy';pptx.title=activity.title;pptx.lang='fr-FR';
 const warnings=[];await appendPowerPointSlide(pptx,activity,warnings);
 const bytes=await pptx.write({outputType:'blob'});
 return {blob:bytes instanceof Blob?bytes:new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.presentationml.presentation'}),warnings};
};
window.CSEStudioV4=window.CSEStudioV4Editor;window.CSEStudioV2=window.CSEStudioV3;
})();
