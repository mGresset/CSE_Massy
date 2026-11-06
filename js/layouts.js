/* CSE Studio V6 : dispositions communes à l'aperçu HTML et au PowerPoint. */
(function(root){'use strict';
const PORTAL='https://cethaleslasmassy.portailce.com/';
const CHOICES=[
 {id:'classic',name:'Classique',use:'Fiche complète',help:'Description, photos, inscription et tarifs facultatifs en trois colonnes.'},
 {id:'hero',name:'Immersif',use:'Voyage et sortie',help:'Photographie dominante, titre valorisé et renseignements essentiels.'},
 {id:'info',name:'Informations',use:'Communication CSE',help:'Grande annonce et encart information, sans tarif obligatoire.'},
 {id:'flash',name:'Essentiel',use:'Message rapide',help:'Annonce courte et percutante pour une activité ou une actualité.'},
 {id:'upcoming',name:'Activités à venir',use:'Programme collectif',help:'Regroupe les prochaines activités validées et datées de la bibliothèque locale.'}
];
const safeUrl=s=>{try{const u=new URL(s);return ['http:','https:'].includes(u.protocol)&&!!u.hostname}catch{return false}};
const effectiveUrl=a=>a.linkType==='none'?'':a.linkType==='custom'?String(a.customUrl||'').trim():PORTAL;
function statusLabel(a){if(a.status!=='auto')return a.status||'À venir';const today=new Date().toLocaleDateString('sv-SE');if(a.registrationStart&&today<a.registrationStart)return 'À venir';if(a.registrationEnd&&today>a.registrationEnd)return 'Clôturé';if(a.registrationStart&&today>=a.registrationStart)return 'Inscriptions ouvertes';return 'À confirmer'}
const statusColors={'Inscriptions ouvertes':'#488837','À venir':'#5e7cb7','Complet':'#ae782b','Clôturé':'#7d8797','Annulé':'#b54356','À confirmer':'#778297'};
const short=s=>String(s??'').trim();
const cut=(s,n)=>short(s).length>n?short(s).slice(0,n-1)+'…':short(s);
const list=s=>short(s).split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
const contacts=a=>(Array.isArray(a.contacts)&&a.contacts.length?a.contacts:[{name:a.contact||'',email:a.contactEmail||''}]).map(x=>({name:short(x.name),email:short(x.email)})).filter(x=>x.name||x.email);
const contactLine=a=>contacts(a).map(c=>c.name||c.email).join(' · ');
const pointLine=a=>a.points!==''&&a.points!=null&&short(a.points)!==''?`${short(a.points)} point${Number(a.points)>1?'s':''} · ${({'long':'Séjour long','short':'Séjour court','france':'Séjour FRANCE'})[a.pointCounter]||'Compteur à préciser'}`:'';
function render(a,P,context={}){
 const out=[],withPrice=a.showPricing!==false&&short(a.outsidePrice)!=='';
 const prices=withPrice?P.compute(a.outsidePrice,a.pricingMode,a.rates,a.fixedRate,a.fixedEuro):[];
 const type=CHOICES.some(x=>x.id===a.template)?a.template:'classic';
 const navy='#172f77',purple='#6622d8',dark='#202e48',muted='#5d6e86',pale='#f3f6fc';
 const add=(t,x,y,w,h,props={})=>{if(w>0&&h>0)out.push({type:t,x,y,w,h,...props})};
 const bg=(x,y,w,h,fill='#fff',stroke='',radius=0)=>add('box',x,y,w,h,{fill,stroke,radius});
 const txt=(s,x,y,w,h,size=16,color=dark,bold=false,align='left',opts={})=>{if(short(s))add('text',x,y,w,h,{text:String(s),size,color,bold,align,...opts})};
 const pic=(which,x,y,w,h)=>add('image',x,y,w,h,{which});
 const line=(x,y,w)=>bg(x,y,w,2,'#dde5f2');
 const date=()=>P.dateRange(a.activityStart,a.activityEnd);
 function badge(x,y,w,h){const s=statusLabel(a);bg(x,y,w,h,statusColors[s]||'#8290a7','',8);txt(s.toUpperCase(),x+7,y+4,w-14,h-8,13,'#fff',true,'center')}
 function action(x,y,w,h,darkBtn=true){const url=effectiveUrl(a);if(!safeUrl(url))return;bg(x,y,w,h,darkBtn?navy:'#e5eefd',darkBtn?'':'#d4e0f0',8);add('link',x+8,y+3,w-16,h-6,{text:cut(a.ctaLabel||'Plus d’infos',28),url,size:15,color:darkBtn?'#fff':navy,bold:true,align:'center'})}
 function info(s,x,y,w,h,sz=13,color=muted){txt(cut(s,Math.ceil(w*h/190)),x,y,w,h,sz,color,false,'left',{top:true})}
 function bullets(raw,x,y,w,n=5,step=25){list(raw).slice(0,n).forEach((t,i)=>txt('• '+cut(t,w>460?95:51),x,y+i*step,w,step-3,14,dark,false,'left',{top:true}))}
 function pricePanel(x,y,w,h,compact=false){
  if(!withPrice)return;
  bg(x,y,w,h,'#f1f5fc','#dce5f2',10);
  txt(cut(a.priceLabel||'TARIFS CSE',41),x+13,y+10,w-26,23,compact?14:16,navy,true);
  if(a.pricingMode==='tranches'){
    if(compact){const narrow=w<290,cols=narrow?2:5;prices.forEach((r,i)=>{const column=i%cols,row=Math.floor(i/cols),tw=(w-26)/cols;txt(`${r.label} ${P.frMoney(r.price)}`,x+13+tw*column,y+33+row*(narrow?22:23),tw-3,19,narrow?12:11,navy,true)})}
    else{prices.forEach((r,i)=>{const column=i%2,row=Math.floor(i/2),tw=(w-35)/2;bg(x+12+column*(tw+10),y+43+row*25,tw,22,i%2?'#fff':'#e6eefe','',4);txt(r.label,x+18+column*(tw+10),y+47+row*25,30,15,12,navy,true);txt(P.frMoney(r.price),x+43+column*(tw+10),y+46+row*25,tw-33,17,12,navy,true,'right')})}
  }else {txt(P.frMoney(prices[0]?.price??0),x+13,y+40,w-27,40,27,navy,true);txt(a.pricingMode==='fixedEuro'?'Tarif unique':'Participation selon le taux choisi',x+13,y+80,w-26,20,11,muted)}
 }
 function metadata(x,y,w,h=65){
  const items=[a.location||a.venue,contactLine(a)?'Référents : '+contactLine(a):'',pointLine(a)];
  txt(items.filter(Boolean).join('   •   '),x,y,w,h,12,navy,true,'left',{top:true});
 }
 // Bandeau transmis par le CSE (format 1920 × 282).
 pic('banner',0,0,1200,176);bg(0,656,1200,19,'#354ba2');
 if(type==='classic'){
  txt(a.category||'ACTIVITÉ',25,190,221,27,18,navy,true);txt(cut(a.subtitle,52),26,221,218,30,12,muted);
  pic('primary',24,251,218,220);
  if(withPrice)pricePanel(23,485,220,156,true);
  else{bg(23,484,220,157,pale,'#dce5f2',8);txt('INFORMATIONS PRATIQUES',33,499,198,20,12,navy,true);info([a.location,a.venue,a.audience].filter(Boolean).join(' · '),34,527,196,56,14);info(pointLine(a),34,591,196,32,12,navy)}
  bg(253,191,2,452,'#e3e9f4');txt(cut(a.title||'TITRE DE L’ACTIVITÉ',84).toUpperCase(),271,188,702,55,28,dark,true,'center');
  txt(date(),272,245,701,37,23,purple,true,'center');info(a.summary,276,296,696,72,15,dark);
  txt('À DÉCOUVRIR',275,377,695,24,15,navy,true);bullets(a.highlights,276,404,694,6,27);
  if(a.included){txt('PRESTATIONS',275,564,694,20,14,navy,true);info(list(a.included).slice(0,2).join(' • '),276,586,685,38,12,dark)}
  info(a.administrative||a.warning,276,628,688,20,11,'#a14b59');
  bg(982,191,2,452,'#e3e9f4');badge(995,206,180,47);
  txt(a.registrationEnd?'Jusqu’au '+P.toFrDate(a.registrationEnd):'Inscriptions : voir conditions',997,276,177,56,13,navy,true,'center');
  txt([a.minimum&&`Min. ${a.minimum}`,a.maximum&&`Max. ${a.maximum}`].filter(Boolean).join(' · '),996,365,177,35,14,dark,true,'center');
  txt('CONTACTS',997,438,178,22,13,navy,true,'center');info(contactLine(a)||'Référent à préciser',995,464,182,63,13,dark);
  info(pointLine(a),997,541,180,38,12,navy);action(995,591,180,44,false);
 }
 if(type==='hero'){
  txt((a.category||'ACTIVITÉ').toUpperCase()+' · '+(a.location||'CSE'),29,188,600,28,15,navy,true);
  pic('primary',27,224,587,332);bg(27,502,587,54,'#172f77');txt(cut(a.subtitle||a.venue||a.location,70),43,510,552,42,20,'#fff',true);
  txt(cut(a.title||'TITRE DE L’ACTIVITÉ',100).toUpperCase(),641,199,527,112,35,dark,true,'left',{top:true});
  txt(date(),642,320,522,39,22,purple,true);info(a.summary,643,374,521,86,17,dark);
  txt('TEMPS FORTS',642,471,521,22,15,navy,true);bullets(a.highlights,643,498,524,3,25);
  if(withPrice)pricePanel(27,567,587,73,true);else metadata(28,583,580,45);
  badge(645,580,176,43);action(833,580,334,43);info([contactLine(a),pointLine(a)].filter(Boolean).join(' • '),646,629,518,22,11,muted);
 }
 if(type==='info'){
  bg(27,198,757,423,'#f0f5fe','#dde8f7',13);
  txt((a.category||'INFORMATIONS').toUpperCase(),47,217,702,28,16,navy,true);
  txt(cut(a.title||'INFORMATION CSE',94).toUpperCase(),47,258,697,111,38,dark,true,'left',{top:true});
  line(47,380,680);info(a.summary||a.administrative,49,398,697,118,20,dark);
  txt('À RETENIR',49,531,676,22,15,navy,true);bullets(a.highlights||a.included,49,557,693,2,25);
  pic('primary',804,198,369,252);badge(829,463,314,44);
  txt(a.activityStart?date():'Information du CSE',804,514,369,28,16,purple,true,'center');
  if(withPrice){pricePanel(802,544,372,69,true);info(contactLine(a)?'Référents : '+contactLine(a):'',49,627,720,20,12,navy)}
  else info(contactLine(a)?'Référents : '+contactLine(a):'Consultez les informations du CSE',809,556,363,44,13,navy);
  action(812,612,352,39);
 }
 if(type==='flash'){
  bg(27,194,653,369,pale,'',13);txt((a.category||'ACTIVITÉ').toUpperCase(),48,211,605,25,15,navy,true);
  txt(cut(a.title||'TITRE DE L’ACTIVITÉ',93).toUpperCase(),47,251,606,117,39,dark,true,'left',{top:true});
  txt(date(),47,379,614,44,22,purple,true);info(a.summary,48,445,606,91,17,dark);
  pic('primary',695,196,479,368);badge(884,576,286,42);
  if(withPrice)pricePanel(27,575,655,67,true);else metadata(35,591,638,47);
  action(886,623,284,31);info(contactLine(a),700,626,184,20,10,muted);
 }
 if(type==='upcoming'){
  const items=Array.isArray(context.upcomingItems)?context.upcomingItems.slice(0,8):[];
  txt(cut(a.title||'LES PROCHAINES ACTIVITÉS',95).toUpperCase(),34,191,1127,57,35,dark,true,'center');
  txt('AGENDA DU CSE · '+items.length+' ACTIVITÉ'+(items.length>1?'S':''),37,252,1125,30,16,purple,true,'center');
  if(!items.length){bg(42,318,1114,253,pale,'#dce5f2',14);txt('Aucune activité future validée dans cette bibliothèque.',68,382,1058,40,25,navy,true,'center');info('Enregistrez des activités avec date future, puis passez-les au statut « Validée pour diffusion ». Elles apparaîtront ici automatiquement.',95,443,1011,70,17,muted)}
  else items.forEach((r,i)=>{const col=i%2,row=Math.floor(i/2),x=38+col*571,y=304+row*84;
    bg(x,y,551,75,i%2?'#f6f8fd':'#eef3fb','#dae4f2',10);
    bg(x+10,y+11,104,52,'#dee9fb','',8);txt(P.toFrDate(r.activityStart)||'Date à venir',x+16,y+17,93,41,11,navy,true,'center');
    txt(cut(r.title||'Activité',52),x+127,y+9,407,27,18,dark,true);
    txt(cut([r.category,r.location||r.venue].filter(Boolean).join(' · '),75),x+127,y+39,405,22,13,muted);
  });
  info('Programmation susceptible d’évoluer. Consultez le portail CSE pour les modalités et inscriptions.',43,643,870,13,10,muted);
  action(951,612,220,39);
 }
 return {type,elements:out,rows:prices,status:statusLabel(a),url:effectiveUrl(a)};
}
const api={CHOICES,render,safeUrl,effectiveUrl,statusLabel,list,contactLine,pointLine};
if(typeof module!=='undefined'&&module.exports)module.exports=api;root.CSELayouts=api;
})(typeof window!=='undefined'?window:globalThis);
