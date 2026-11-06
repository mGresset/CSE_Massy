/* CSE Studio · application 100 % statique · pour GitHub Pages. */
(()=>{'use strict';
const P=window.CSEPricing;
const PORTAL_URL='https://cethaleslasmassy.portailce.com/';
const CANVA_URL='https://canva.link/rewv8gx5iilr8kz';
const STORAGE_ACTIVITIES='cse-studio-massy:v1:activities';
const STORAGE_DRAFT='cse-studio-massy:v1:draft';
const STORAGE_RATES='cse-studio-massy:v1:rates';
const FORM_FIELDS=['title','category','template','location','venue','activityStart','activityEnd','subtitle','summary','highlights','included','administrative','warning','priceLabel','outsidePrice','pricingMode','fixedRate','fixedEuro','priceNotes','conditions','registrationStart','registrationEnd','status','audience','minimum','maximum','points','carbon','contact','contactEmail','photoUrl','linkType','customUrl','ctaLabel'];
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lines=s=>String(s||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
const fileBase=s=>String(s||'activite').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'_').slice(0,70);
const sample={
 title:'CIRCUIT SRI LANKA AUTHENTICITÉ', category:'Voyages', template:'detail',location:'Sri Lanka',venue:'',activityStart:'2027-04-04',activityEnd:'2027-04-15',subtitle:'Vacances de printemps',
 summary:'Circuit découverte très varié des splendeurs et activités du centre du Sri Lanka, pendant les vacances scolaires de printemps.',
 highlights:'Visites du temple d’or de DAMBULLA et du site de SIGIRIYA.\nImmersion dans la vie rurale et rencontre avec les éléphants.\nSites archéologiques de POLONNARUWA et RITIGALA.\nParcours en 4×4 dans la réserve naturelle et safari à MINNERIYA.\nInitiation à ANGAMPORA chez le Maître SUMEDA.\nDétente à PASSIKUDAH, plage et massage ayurvédique.',
 included:'Vol aller-retour pour Colombo avec escale.\nGuide local parlant français durant le circuit.\nHôtels de catégorie supérieure.\nPension complète (hors boissons) et assurances.',
 administrative:'Passeport valable 6 mois après le retour + ETA (e-visa).',warning:'Séjour non adapté aux PMR ni aux très jeunes enfants.',
 priceLabel:'Tarif de base chambre double',outsidePrice:'2400',pricingMode:'tranches',fixedRate:'50',fixedEuro:'',priceNotes:'',
 conditions:'Réductions non cumulables. Bien lire les conditions d’application sur le site du CSE.',
 registrationStart:'',registrationEnd:'2026-12-03',status:'Inscriptions ouvertes',audience:'Bénéficiaires du CSE',minimum:'31',maximum:'40',points:'24 points',carbon:'3029 kg CO2e',contact:'Sylvie Casassus-Builhé',contactEmail:'',
 photoUrl:'',photoData:'',linkType:'cse',customUrl:'',ctaLabel:'Plus d’infos',rates:[...P.DEFAULT_RATES]
};
function makeBlank(){return {...sample,title:'',location:'',venue:'',activityStart:'',activityEnd:'',subtitle:'',summary:'',highlights:'',included:'',administrative:'',warning:'',outsidePrice:'',priceLabel:'Tarif bénéficiaire',priceNotes:'',conditions:'',registrationStart:'',registrationEnd:'',status:'À venir',minimum:'',maximum:'',points:'',carbon:'',contact:'',contactEmail:'',photoUrl:'',photoData:'',rates:[...defaultRates]}}
function clean(value){const obj={...sample,...Object.fromEntries(FORM_FIELDS.map(k=>[k,value?.[k]??sample[k]]))};obj.rates=Array.from({length:10},(_,i)=>P.boundedRate(value?.rates?.[i]??defaultRates[i]));obj.photoData=typeof value?.photoData==='string'&&/^data:image\/(png|jpeg|webp);base64,/.test(value.photoData)?value.photoData:'';return obj}
function readJSON(key,fallback){try{const s=localStorage.getItem(key);return s?JSON.parse(s):fallback}catch{return fallback}}
let defaultRates=readJSON(STORAGE_RATES,[...P.DEFAULT_RATES]);
if(!Array.isArray(defaultRates)||defaultRates.length!==10)defaultRates=[...P.DEFAULT_RATES];
defaultRates=defaultRates.map(P.boundedRate);
let activities=readJSON(STORAGE_ACTIVITIES,{});
if(!activities||Array.isArray(activities)||typeof activities!=='object')activities={};
let draft=readJSON(STORAGE_DRAFT,null);
let activity=clean(draft||sample),activeId=null,dirty=true;
function notify(s,isError=false){const e=$('toast');e.textContent=s;e.style.background=isError?'#a52c42':'#173875';e.style.display='block';clearTimeout(notify._t);notify._t=setTimeout(()=>{e.style.display='none'},4200)}
function saveDraft(){try{localStorage.setItem(STORAGE_DRAFT,JSON.stringify(activity))}catch{ /* localStorage image can be too large */ }}
function setDirty(){dirty=true;$('saveState').textContent='● Brouillon local';saveDraft()}
function effectiveUrl(){if(activity.linkType==='none')return '';if(activity.linkType==='cse')return PORTAL_URL;return String(activity.customUrl||'').trim()}
function safeUrl(u){try{const x=new URL(u);return /^https?:$/.test(x.protocol)&&!!x.hostname}catch{return false}}
function pricing(){return P.compute(activity.outsidePrice,activity.pricingMode,activity.rates,activity.fixedRate,activity.fixedEuro)}
function renderForm(){for(const key of FORM_FIELDS)$(key).value=activity[key]??'';drawRates();renderDynamicFields()}
function drawRates(){const e=$('rateInputs');e.innerHTML='';activity.rates.forEach((value,i)=>{const el=document.createElement('label');el.className='rate-cell';el.innerHTML=`T${i+1} · CSE %<input aria-label="Subvention T${i+1}" type="number" min="0" max="100" step="0.5" value="${P.boundedRate(value)}" data-rate="${i}">`;e.appendChild(el)});e.querySelectorAll('[data-rate]').forEach(input=>input.addEventListener('input',()=>{activity.rates[Number(input.dataset.rate)]=P.boundedRate(input.value);render();setDirty()}))}
function renderDynamicFields(){let m=activity.pricingMode;$('trancheConfig').classList.toggle('hidden',m!=='tranches');$('fixedRateRow').classList.toggle('hidden',m==='tranches');$('fixedRate').parentElement.classList.toggle('hidden',m==='fixedEuro');$('fixedEuroField').classList.toggle('hidden',m!=='fixedEuro');$('fixedRateLabel').textContent=m==='fixedEmployee'?'Part du salarié (%)':'Subvention du CSE (%)';$('customLinkField').classList.toggle('hidden',activity.linkType!=='custom');const u=effectiveUrl();$('effectiveLink').textContent=!u?'Aucun lien':safeUrl(u)?'🔗 '+u:'⚠ URL personnalisée invalide (https://...)';}
function renderPrices(){const rows=pricing();const container=$('pricingTable');container.innerHTML='<table><thead><tr><th>Tarif</th><th>Subvention CSE</th><th>Prix salarié</th></tr></thead><tbody>'+rows.map(row=>`<tr><td>${esc(row.label)}</td><td>${row.subsidy===null?'—':row.subsidy+' %'}</td><td>${esc(P.frMoney(row.price))}</td></tr>`).join('')+'</tbody></table>';
 const box=$('pPriceRows');box.innerHTML='';for(const row of rows){const cell=document.createElement('div');cell.textContent=(activity.pricingMode==='tranches'?row.label+' : ':'Tarif CSE : ')+P.frMoney(row.price);box.appendChild(cell)}
 $('pPriceLabel').textContent=activity.priceLabel||'Tarif bénéficiaire';$('pOutside').textContent=activity.outsidePrice!==''?'Ext. : '+P.frMoney(activity.outsidePrice):'';
 $('pPriceNotes').textContent=activity.priceNotes||'';$('pConditions').textContent=activity.conditions||'';
}
function render(){renderDynamicFields();renderPrices();
 $('slide').classList.toggle('simple',activity.template==='simple');
 $('pCategory').textContent=(activity.category||'Activité')+(activity.location?' · '+activity.location:'');
 $('pSubtitle').textContent=activity.subtitle||'';
 $('pPhoto').src=activity.photoData||activity.photoUrl||'assets/sri-lanka.jpg';
 $('pTitle').textContent=activity.title||'NOM DE L’ACTIVITÉ';
 $('pDate').textContent=P.dateRange(activity.activityStart,activity.activityEnd);
 $('pSummary').textContent=activity.summary||'';
 const high=lines(activity.highlights),inc=lines(activity.included);
 $('pHighlightsBlock').classList.toggle('hidden',!high.length);
 $('pIncludedBlock').classList.toggle('hidden',!inc.length);
 $('pHighlights').innerHTML=high.map(s=>`<li>${esc(s)}</li>`).join('');
 $('pIncluded').innerHTML=inc.map(s=>`<li>${esc(s)}</li>`).join('');
 $('pAdministrative').textContent=activity.administrative?'Formalités : '+activity.administrative:'';
 $('pWarning').textContent=activity.warning||'';
 $('pRegistration').innerHTML='Date limite d’inscription : <b>'+esc(P.toFrDate(activity.registrationEnd)||'À confirmer')+'</b>';
 $('pPoints').textContent='Valeur en points : '+(activity.points||'—');
 $('pContact').innerHTML='Contact : <i>'+esc(activity.contact||'CSE')+'</i>';
 $('pStatus').textContent=activity.status||'À venir';
 const colors={'Complet':'#c57932','Annulé':'#b63b48','Clôturé':'#748093','À venir':'#5d85c0','Inscriptions ouvertes':'#80b139'};
 $('pStatus').style.backgroundColor=colors[activity.status]||'#80b139';
 $('pParticipants').innerHTML=(activity.minimum||activity.maximum)?'<strong>Nombre de participants :</strong><br>Minimum '+esc(activity.minimum||'—')+'<br>Maximum <span class="max">'+esc(activity.maximum||'—')+'</span>':'';
 $('pCarbon').innerHTML=activity.carbon?'Bilan carbone estimé<br><strong>🍃 '+esc(activity.carbon)+'</strong>':'';
 const l=effectiveUrl(),a=$('pLink');a.classList.toggle('is-hidden',!safeUrl(l));if(safeUrl(l))a.href=l;else a.removeAttribute('href');$('pLinkLabel').textContent=activity.ctaLabel||'Plus d’infos';
 makeWarnings();fitSlide();
}
function makeWarnings(){const issues=[];
 const title=activity.title.trim();if(!title)issues.push('Complétez le nom de l’activité avant l’export.');
 if(activity.activityStart&&activity.activityEnd&&activity.activityEnd<activity.activityStart)issues.push('La date de fin précède la date de début.');
 if(activity.registrationStart&&activity.registrationEnd&&activity.registrationEnd<activity.registrationStart)issues.push('La clôture des inscriptions précède leur ouverture.');
 if(activity.minimum!==''&&activity.maximum!==''&&Number(activity.maximum)<Number(activity.minimum))issues.push('Le maximum de participants est inférieur au minimum.');
 if(activity.pricingMode==='fixedEuro'&&P.finite(activity.fixedEuro)>P.finite(activity.outsidePrice))issues.push('Le tarif fixe salarié dépasse le prix extérieur : vérifiez le montant.');
 if(!safeUrl(effectiveUrl())&&activity.linkType!=='none')issues.push('Le lien choisi est invalide : le bouton sera absent.');
 if(lines(activity.highlights).length>8)issues.push('Plus de 8 temps forts : le contenu risque de déborder.');
 if(lines(activity.included).length>6)issues.push('Plus de 6 prestations incluses : vérifiez la lisibilité.');
 if(activity.summary.length>350)issues.push('Le résumé est long pour une seule slide.');
 $('warnings').innerHTML=issues.length?issues.map(s=>`<div class="warning-item">⚠ ${esc(s)}</div>`).join(''):'<span class="good-item">✓ Aperçu prêt pour vérification avant export.</span>';
 requestAnimationFrame(()=>{const middle=$('pWarning').getBoundingClientRect().bottom,info=$('pRegistration').getBoundingClientRect().top;if(middle&&info&&middle>info-3){const el=document.createElement('div');el.className='warning-item critical';el.textContent='⚠ Risque de chevauchement des textes : raccourcissez la description ou sélectionnez la disposition épurée.';$('warnings').appendChild(el)}});
}
function fitSlide(){const w=$('slideMount').clientWidth;if(w>0)$('slide').style.transform='scale('+(w/1200)+')'}
function storeActivities(){try{localStorage.setItem(STORAGE_ACTIVITIES,JSON.stringify(activities));return true}catch{notify('Stockage local plein : exportez un JSON et réduisez la taille des images.',true);return false}}
function saveActivity(){if(!activity.title.trim()){notify('Saisissez d’abord le titre de l’activité.',true);$('title').focus();return}if(!activeId)activeId='act-'+Date.now()+'-'+Math.random().toString(36).slice(2,6);activities[activeId]={...activity,updatedAt:new Date().toISOString()};if(storeActivities()){dirty=false;$('saveState').textContent='● Activité enregistrée';renderLibrary();notify('Activité enregistrée sur cet appareil.')}}
function renderLibrary(){const root=$('activityLibrary'),ids=Object.keys(activities).sort((a,b)=>String(activities[b]?.updatedAt||'').localeCompare(String(activities[a]?.updatedAt||'')));$('libraryCount').textContent=String(ids.length);root.innerHTML='';if(!ids.length){root.innerHTML='<p class="library-empty">Aucune activité enregistrée pour le moment.</p>';return}for(const id of ids){const o=activities[id];const row=document.createElement('div');row.className='library-item';const title=document.createElement('span');title.textContent=o.title||'Activité';title.title=title.textContent;row.appendChild(title);const open=document.createElement('button');open.type='button';open.textContent='Ouvrir';open.addEventListener('click',()=>{activeId=id;activity=clean(activities[id]);renderForm();render();saveDraft();dirty=false;$('saveState').textContent='● Activité enregistrée'});row.appendChild(open);const del=document.createElement('button');del.type='button';del.textContent='Suppr.';del.className='delete';del.addEventListener('click',()=>{if(confirm('Supprimer « '+o.title+' » du navigateur ?')){delete activities[id];if(activeId===id)activeId=null;storeActivities();renderLibrary()}});row.appendChild(del);root.appendChild(row)}}
function download(text,type,name){const blob=new Blob([text],{type}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000)}
function exportProject(){download(JSON.stringify({schema:'cse-studio:1',exportDate:new Date().toISOString(),activity},null,2),'application/json','CSE_'+fileBase(activity.title)+'.json');notify('Fiche JSON téléchargée. Elle peut être importée par un autre bénévole.')}
function csvCell(x){return '"'+String(x??'').replaceAll('"','""')+'"'}
function exportCSV(){const p=pricing();const fields={TITRE:activity.title,CATEGORIE:activity.category,LIEU:activity.location,ETABLISSEMENT:activity.venue,DATE_ACTIVITE:P.dateRange(activity.activityStart,activity.activityEnd),ACCROCHE:activity.summary,TEMPS_FORTS:lines(activity.highlights).join(' • '),PRESTATIONS:lines(activity.included).join(' • '),FORMALITES:activity.administrative,ATTENTION:activity.warning,STATUT:activity.status,OUVERTURE_INSCRIPTIONS:P.toFrDate(activity.registrationStart),FIN_INSCRIPTIONS:P.toFrDate(activity.registrationEnd),PRIX_EXTERIEUR:P.frMoney(activity.outsidePrice),LIBELLE_TARIF:activity.priceLabel,CONDITIONS:activity.conditions,POINTS:activity.points,CONTACT:activity.contact,MINIMUM:activity.minimum,MAXIMUM:activity.maximum,BILAN_CARBONE:activity.carbon,LIEN:effectiveUrl(),LIBELLE_BOUTON:activity.ctaLabel};
 for(let i=0;i<10;i++)fields['T'+(i+1)]=p[i]?.price!==undefined&&activity.pricingMode==='tranches'?P.frMoney(p[i].price):'';
 fields.PRIX_UNIQUE=activity.pricingMode!=='tranches'?(p[0]?P.frMoney(p[0].price):''):'';
 const keys=Object.keys(fields),csv='\ufeff'+keys.map(csvCell).join(';')+'\r\n'+keys.map(k=>csvCell(fields[k])).join(';')+'\r\n';download(csv,'text/csv;charset=utf-8','CSE_'+fileBase(activity.title)+'.csv');notify('CSV exporté. Associez les colonnes aux champs de votre modèle Canva.')}
function asData(url){if(String(url||'').startsWith('data:image/'))return Promise.resolve(url);return fetch(url).then(r=>{if(!r.ok)throw Error('Image inaccessible');return r.blob()}).then(blob=>new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=reject;fr.readAsDataURL(blob)}))}
// A Canva-importable PPTX with editable shapes/text fields and a functioning hyperlink.
async function exportPPTX(){const button=$('exportPptx');if(!activity.title.trim()){notify('Le titre de l’activité est requis.',true);$('title').focus();return}button.disabled=true;$('exportPptxBottom').disabled=true;button.textContent='Création...';
 try{
 const PPTX=window.PptxGenJS;if(!PPTX)throw Error('Bibliothèque PowerPoint non chargée');const pptx=new PPTX();pptx.layout='LAYOUT_WIDE';pptx.author='CSE Thales LAS Massy';pptx.subject='Diapositive d’activité';pptx.title=activity.title;pptx.lang='fr-FR';
 const s=pptx.addSlide();s.background={color:'FFFFFF'};const Sh=pptx.ShapeType;
 const px=x=>x/90;
 function t(value,x,y,w,h,opts={}){s.addText(String(value??''),{x:px(x),y:px(y),w:px(w),h:px(h),margin:0,fontFace:'Arial',fontSize:11,breakLine:false,fit:'shrink',color:'111111',valign:'mid',...opts})}
 function rect(x,y,w,h,color){s.addShape(Sh.rect,{x:px(x),y:px(y),w:px(w),h:px(h),line:{color},fill:{color}})}
 let banner=await asData('assets/bandeau-cse.jpg');s.addImage({data:banner,x:px(10),y:px(7),w:px(1180),h:px(171)});rect(10,644,1180,31,'3648A0');
 t(activity.category+(activity.location?' · '+activity.location:''),29,182,195,35,{fontSize:13.5,color:'153C9B',bold:true});t(activity.subtitle,29,217,195,22,{fontSize:10.5,bold:true,color:'123F9E'});
 let photo;try{photo=await asData(activity.photoData||activity.photoUrl||'assets/sri-lanka.jpg')}catch(e){photo=await asData('assets/sri-lanka.jpg');notify('Image externe inaccessible pour l’export, visuel modèle utilisé.',true)}
 s.addImage({data:photo,x:px(41),y:px(240),w:px(156),h:px(activity.template==='simple'?215:195),sizingCrop:true});
 const priceY=activity.template==='simple'?464:438;
 t(activity.priceLabel||'Tarif CSE',29,priceY,197,23,{fontSize:10.4,bold:true});
 const rows=pricing();if(activity.pricingMode==='tranches')rows.forEach((r,i)=>{const col=i%2,row=Math.floor(i/2);t(r.label+' : '+P.frMoney(r.price),29+col*101,priceY+25+row*17,98,17,{fontSize:8.8,bold:true,color:'14409C'})});else{t(P.frMoney(rows[0]?.price??0),29,priceY+25,190,26,{fontSize:17,bold:true,color:'15419A'});const rate=rows[0]?.subsidy;t(rate===null?'':('Subvention CSE : '+rate+' %'),29,priceY+55,190,21,{fontSize:9.3,color:'14409C'})}
 t(activity.outsidePrice!==''?'Ext. : '+P.frMoney(activity.outsidePrice):'',29,priceY+(activity.pricingMode==='tranches'?113:83),190,18,{fontSize:9.7,bold:true,color:'14409C'});
 t(activity.priceNotes,29,priceY+(activity.pricingMode==='tranches'?131:104),195,32,{fontSize:8.0,color:'164396',valign:'top'});
 t(activity.conditions,29,priceY+(activity.pricingMode==='tranches'?164:140),196,40,{fontSize:8.0,color:'164396',valign:'top'});
 t(activity.title.toUpperCase(),244,188,710,46,{fontSize:22,bold:true,align:'center',underline:{color:'111111'}});
 t(P.dateRange(activity.activityStart,activity.activityEnd),241,235,713,42,{fontSize:21.4,bold:true,align:'center',color:'6923E8'});
 let y=285;t(activity.summary,243,y,704,39,{fontSize:activity.template==='simple'?12:10.3,valign:'top'});y+=activity.template==='simple'?55:40;
 function listBlock(header,items,max,fontSz,lineH){if(!items.length)return;t(header,243,y,704,18,{fontSize:10.4,bold:true,underline:{color:'111111'}});y+=18;for(const item of items.slice(0,max)){t('• '+item,253,y,695,lineH,{fontSize:fontSz,valign:'mid'});y+=lineH}y+=4}
 listBlock('Temps forts :',lines(activity.highlights),activity.template==='simple'?5:7,activity.template==='simple'?11.2:9.5,activity.template==='simple'?21:17);
 listBlock('Prestations incluses :',lines(activity.included),activity.template==='simple'?3:5,activity.template==='simple'?10.8:9.3,activity.template==='simple'?20:17);
 if(y<574&&activity.administrative){t('Formalités : '+activity.administrative,243,y,704,27,{fontSize:9.2,bold:true,valign:'top'});y+=29}
 if(y<603&&activity.warning){t(activity.warning,243,y,704,28,{fontSize:9.7,color:'DE2633',bold:true,valign:'top'})}
 const footY=608;rect(450,footY-2,505,36,'FFFFFF');t('Date limite d’inscription : '+(P.toFrDate(activity.registrationEnd)||'À confirmer'),454,footY,500,12,{fontSize:9.3,bold:true});t('Valeur en points : '+(activity.points||'—')+'     Contact : '+(activity.contact||'CSE'),454,footY+16,500,16,{fontSize:9.3,bold:true,color:'6534B0'});
 const state=activity.status||'À venir';const color={'À venir':'5D85C0','Inscriptions ouvertes':'80B139','Complet':'C57932','Clôturé':'748093','Annulé':'B63B48'}[state]||'80B139';s.addShape(Sh.roundRect,{x:px(1010),y:px(211),w:px(156),h:px(60),rectRadius:.15,rotate:5,line:{color:'93A468',width:1},fill:{color}});t(state.toUpperCase(),1011,220,152,43,{fontSize:11.4,bold:true,color:'FFFFFF',align:'center'});
 if(activity.minimum||activity.maximum){t('Nombre de participants :',974,380,203,21,{fontSize:11.3,bold:true,align:'center'});t('Minimum '+(activity.minimum||'—')+'\nMaximum '+(activity.maximum||'—'),980,406,196,48,{fontSize:11.5,align:'center'})}
 if(activity.carbon){t('Bilan carbone estimé',979,470,194,20,{fontSize:10,color:'559B2C',align:'center'});t('🍃 '+activity.carbon,979,494,194,24,{fontSize:11.2,color:'4C8D27',bold:true,align:'center'})}
 const u=effectiveUrl();if(safeUrl(u)){
 s.addShape(Sh.roundRect,{x:px(971),y:px(580),w:px(203),h:px(42),rectRadius:.08,fill:{color:'EFF4FC'},line:{color:'B6CAE9'},hyperlink:{url:u}});
 t(activity.ctaLabel||'Plus d’infos',974,586,197,29,{fontSize:12.3,color:'174295',bold:true,align:'center',hyperlink:{url:u}});
 }
 await pptx.writeFile({fileName:'CSE_'+fileBase(activity.title)+'.pptx'});notify('PowerPoint généré. Vous pouvez l’importer dans vos planches Canva.');
 }catch(e){console.error(e);notify('Export PowerPoint impossible : '+e.message,true)}finally{button.disabled=false;$('exportPptxBottom').disabled=false;button.textContent='↓ Générer PPTX'}
}
// Events
for(const key of FORM_FIELDS){$(key).addEventListener('input',()=>{activity[key]=$(key).value;if(key==='photoUrl'&&activity.photoUrl)activity.photoData='';render();setDirty()})}
$('photoFile').addEventListener('change',e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>4*1024*1024){notify('Image trop lourde (> 4 Mo) : compressez-la avant import.',true);return}if(!/^image\/(png|jpeg|webp)$/.test(f.type)){notify('Format non pris en charge : utilisez PNG, JPEG ou WebP.',true);return}const fr=new FileReader();fr.onload=()=>{activity.photoData=fr.result;activity.photoUrl='';$('photoUrl').value='';render();setDirty();notify('Photo ajoutée à la fiche')};fr.readAsDataURL(f)});
$('pPhoto').addEventListener('error',()=>{$('pPhoto').src='assets/sri-lanka.jpg'});
$('saveActivity').addEventListener('click',saveActivity);
$('newActivity').addEventListener('click',()=>{activity=makeBlank();activeId=null;renderForm();render();setDirty();notify('Nouvelle activité créée')});
$('duplicateActivity').addEventListener('click',()=>{activity={...activity,title:activity.title+' (copie)',rates:[...activity.rates]};activeId=null;renderForm();render();setDirty();notify('Activité dupliquée')});
$('saveRates').addEventListener('click',()=>{defaultRates=[...activity.rates];try{localStorage.setItem(STORAGE_RATES,JSON.stringify(defaultRates));notify('Nouveau barème enregistré pour les prochaines activités.')}catch{notify('Stockage local indisponible',true)}});
$('exportProject').addEventListener('click',exportProject);
$('importProject').addEventListener('change',e=>{const f=e.target.files?.[0];if(!f)return;const reader=new FileReader();reader.onload=()=>{try{const d=JSON.parse(reader.result);const v=d.activity||d;if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Fiche invalide');activity=clean(v);activeId=null;renderForm();render();setDirty();notify('Fiche importée depuis JSON')}catch(err){notify('Fichier JSON invalide : '+err.message,true)}};reader.readAsText(f)});
$('exportCSV').addEventListener('click',exportCSV);
$('exportPptx').addEventListener('click',exportPPTX);$('exportPptxBottom').addEventListener('click',exportPPTX);
$('printSlide').addEventListener('click',()=>window.print());
$('activityForm').addEventListener('submit',e=>e.preventDefault());
window.addEventListener('resize',fitSlide);if(window.ResizeObserver)new ResizeObserver(fitSlide).observe($('slideMount'));
renderForm();renderLibrary();render();
window.CSEStudio={getActivity:()=>structuredClone(activity),getPricing:pricing,getPortalUrl:()=>PORTAL_URL,getCanvaUrl:()=>CANVA_URL};
})();
