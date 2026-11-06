/* CSE Studio V3 — même plan de mise en page pour l'aperçu et l'export PPTX. */
(function(root){'use strict';
const PORTAL='https://cethaleslasmassy.portailce.com/';
const CHOICES=[
 {id:'classic',name:'Classique',use:'Programmes détaillés',help:'Trois colonnes, avec programme central, tarifs à gauche et inscriptions à droite.'},
 {id:'hero',name:'Immersif',use:'Voyages et sorties',help:'Grande photographie et accroche mise en avant, idéal pour les activités visuelles.'},
 {id:'cards',name:'En cartes',use:'Événements et loisirs',help:'Composition en trois cartes : photos, détails de l’activité et tarifs.'},
 {id:'prices',name:'Tarifs en avant',use:'Offres et billetterie',help:'Barème T1 à T10 valorisé, avec un grand tableau lisible.'},
 {id:'agenda',name:'Programme',use:'Séjours et ateliers',help:'Déroulé de l’activité en grande colonne, photo et tarifs structurés.'},
 {id:'flash',name:'Essentiel',use:'Annonce rapide',help:'Message court, grande photo et informations clés : recommandé pour les offres simples.'}
];
function safeUrl(s){try{const u=new URL(s);return (u.protocol==='http:'||u.protocol==='https:')&&!!u.hostname}catch{return false}}
function effectiveUrl(a){return a.linkType==='none'?'':a.linkType==='custom'?String(a.customUrl||'').trim():PORTAL}
function statusLabel(a){if(a.status!=='auto')return a.status||'À venir';const date=new Date().toLocaleDateString('sv-SE');if(a.registrationStart&&date<a.registrationStart)return 'À venir';if(a.registrationEnd&&date>a.registrationEnd)return 'Clôturé';if(a.registrationStart&&date>=a.registrationStart)return 'Inscriptions ouvertes';return 'À confirmer'}
const statusColors={'Inscriptions ouvertes':'#4b892e','À venir':'#5d81bd','Complet':'#bd7e26','Clôturé':'#7d8797','Annulé':'#b54356','À confirmer':'#778297'};
const short=s=>String(s||'').trim();
const cut=(s,lim)=>short(s).length>lim?short(s).slice(0,lim-1)+'…':short(s);
const list=s=>short(s).split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
function render(a,P){
 const out=[];const rows=P.compute(a.outsidePrice,a.pricingMode,a.rates,a.fixedRate,a.fixedEuro);
 const type=['classic','hero','cards','prices','agenda','flash'].includes(a.template)?a.template:(a.template==='simple'?'hero':'classic');
 const color='#172f77', purple='#6622d8', dark='#1a2744', subtle='#5b6d8c', light='#f3f6fc';
 const add=(type,x,y,w,h,props={})=>out.push({type,x,y,w,h,...props});
 const bg=(x,y,w,h,fill='#fff',stroke='',radius=0)=>add('box',x,y,w,h,{fill,stroke,radius});
 const txt=(value,x,y,w,h,size=16,color=dark,bold=false,align='left',opts={})=>{if(short(value))add('text',x,y,w,h,{text:String(value),size,color,bold,align,...opts})};
 const pic=(which,x,y,w,h)=>add('image',x,y,w,h,{which,fill:'#eaf0f8'});
 const divider=(x,y,w,h)=>bg(x,y,w,h,'#dce5f1');
 function badge(x,y,w,h){const state=statusLabel(a);bg(x,y,w,h,statusColors[state]||'#7384a4','',8);txt(state.toUpperCase(),x+7,y+5,w-14,h-10,15,'#fff',true,'center')}
 function action(x,y,w,h,darkBtn=true){const url=effectiveUrl(a);if(!safeUrl(url))return;bg(x,y,w,h,darkBtn?color:'#e7eefe',darkBtn?'':'#ccd7eb',8);add('link',x+7,y+4,w-14,h-8,{text:cut(a.ctaLabel||'Plus d’infos',33),url,size:16,color:darkBtn?'#fff':color,bold:true,align:'center'})}
 function section(header,body,x,y,w,headerSz=15,bodySz=13,h=75,bodyColor=dark){if(!short(body))return;txt(header,x,y,w,21,headerSz,color,true);txt(body,x,y+22,w,h-22,bodySz,bodyColor,false,'left',{top:true})}
 function bulletSection(header,raw,x,y,w,n=5,step=22,size=14){const items=list(raw).slice(0,n);if(!items.length)return y;txt(header,x,y,w,22,15,color,true);y+=23;items.forEach(s=>{txt('• '+(w<400?cut(s,36):s),x,y,w,step-2,size,dark,false,'left',{top:true});y+=step});return y+4}
 function pricePanel(x,y,w,h,options={}){
   const {noBox=false,large=false,footer=true,compact=false}=options;
   if(!noBox)bg(x,y,w,h,'#f3f6fc','#dce4f2',12);
   const inset=large?20:12;const ix=x+inset,iw=w-2*inset;
   if(compact){
     txt(a.priceLabel||'TARIFS CSE',ix,y+5,iw*.67,20,14,color,true);
     if(short(a.outsidePrice)!=='')txt('Ext. '+P.frMoney(a.outsidePrice),ix+iw*.66,y+5,iw*.33,20,12,subtle,false,'right');
     if(a.pricingMode==='tranches')rows.forEach((r,i)=>{const cw=iw/5,c=i%5,rr=Math.floor(i/5);txt(r.label+' : '+P.frMoney(r.price),ix+c*cw,y+26+rr*19,cw-3,18,12,color,true)});
     else txt(P.frMoney(rows[0]?.price||0),ix,y+27,iw,28,24,color,true);
     return;
   }
   txt(a.priceLabel||'TARIFS BÉNÉFICIAIRES',ix,y+12,iw,23,large?19:15,color,true);
   if(short(a.outsidePrice)!=='')txt('Prix extérieur : '+P.frMoney(a.outsidePrice),ix,y+(large?42:36),iw,21,large?16:13,subtle,false);
   const startY=y+(large?78:60);
   if(a.pricingMode==='tranches'){
     const gap=large?12:7,half=(iw-gap)/2,step=large?35:25;
     rows.forEach((r,i)=>{const col=i%2,row=Math.floor(i/2),rx=ix+col*(half+gap),ry=startY+row*step;
       bg(rx,ry,half,large?30:21,i%2?'#fff':'#e8eefb','',4);
       txt(r.label,rx+5,ry+4,large?38:26,large?22:15,large?17:12,color,true);
       txt(P.frMoney(r.price),rx+(large?42:30),ry+4,half-(large?48:36),large?23:15,large?17:12,color,true,'right');
     });
   }else{
     txt(P.frMoney(rows[0]?.price??0),ix,startY,iw,47,large?36:31,color,true);
     const s=rows[0]?.subsidy;txt(s===null?'Tarif fixe':'Subvention CSE : '+P.finite(s)+' %',ix,startY+49,iw,22,14,subtle);
   }
   if(footer&&short(a.priceNotes)){txt(cut(a.priceNotes,140),ix,y+h-47,iw,40,large?13:11,subtle,false,'left',{top:true})}
 }
 function regText(){return a.registrationEnd?'Inscriptions jusqu’au '+P.toFrDate(a.registrationEnd):'Date limite d’inscription à confirmer'}
 function moreInfo(){return [a.venue||a.location,a.audience, a.points?('Points CSE : '+a.points):'',a.contact?('Contact : '+a.contact):''].filter(Boolean).join('  ·  ')}
 // Bandeau HD inchangé sur toutes les dispositions ; format original 1920×282, ratio préservé.
 pic('banner',0,0,1200,176);
 bg(0,656,1200,19,'#354ba2');
 if(type==='classic'){
   txt(a.category+(a.location?' · '+a.location:''),25,185,215,32,18,color,true);
   txt(a.subtitle,25,218,220,22,13,color,true);
   pic('primary',24,243,215,199);
   pricePanel(20,447,222,196,{footer:false});
   divider(252,190,2,455);
   txt((a.title||'TITRE DE L’ACTIVITÉ').toUpperCase(),270,186,705,48,30,dark,true,'center');
   txt(P.dateRange(a.activityStart,a.activityEnd),270,236,705,38,27,purple,true,'center');
   txt(a.summary,274,284,693,56,15,dark,false,'left',{top:true});
   let y=344;y=bulletSection('TEMPS FORTS',a.highlights,274,y,690,7,21,14);
   y=bulletSection('PRESTATIONS INCLUSES',a.included,274,Math.min(503,y+6),690,3,18,13);
   section('FORMALITÉS',a.administrative,274,Math.min(580,y+2),688,13,12,44);
   if(a.warning)txt('À NOTER : '+a.warning,274,602,680,28,11,'#b8324c',true);
   divider(980,190,2,455);
   badge(996,207,178,53);
   txt(regText(),997,286,174,53,15,color,true,'center');
   if(a.minimum||a.maximum){txt('PARTICIPANTS',1000,366,172,25,14,dark,true,'center');txt('Min. '+(a.minimum||'—')+'    Max. '+(a.maximum||'—'),995,395,183,33,14,dark,false,'center')}
   if(a.carbon){txt('Bilan carbone estimé',997,468,173,20,12,'#4b8f4f',false,'center');txt(a.carbon,997,490,173,24,14,'#328546',true,'center')}
   action(994,574,180,43,false);
   txt(moreInfo(),275,633,694,16,10,subtle);
 }
 if(type==='hero'){
   txt((a.category||'ACTIVITÉ').toUpperCase()+' · '+(a.location||'CSE MASSY'),28,186,545,24,14,color,true);
   pic('primary',27,214,560,342);
   bg(27,506,560,50,'#182e72');
   txt(a.subtitle||a.location||a.venue,40,517,530,33,21,'#fff',true);
   txt((a.title||'TITRE DE L’ACTIVITÉ').toUpperCase(),613,198,555,94,37,dark,true,'left',{top:true});
   txt(P.dateRange(a.activityStart,a.activityEnd),615,291,549,45,23,purple,true);
   txt(a.summary,614,339,546,77,17,dark,false,'left',{top:true});
   bulletSection('À DÉCOUVRIR',a.highlights,615,431,540,4,25,15);
   txt(a.administrative||a.warning,613,549,542,28,11,subtle);
   pricePanel(27,569,561,73,{compact:true,footer:false});
   // Le prix est résumé lorsque le panneau est compact.
   bg(28,626,559,16,'#f3f6fc');
   badge(611,585,183,43);action(806,585,353,43);
   txt(regText(),615,635,543,15,11,subtle);
 }
 if(type==='cards'){
   txt((a.title||'TITRE DE L’ACTIVITÉ').toUpperCase(),32,186,949,49,34,dark,true);
   txt(P.dateRange(a.activityStart,a.activityEnd),33,238,940,33,23,purple,true);
   badge(1000,201,177,54);
   bg(25,293,367,328,'#f1f5fb','#dce4f2',12);
   pic('primary',35,303,347,211);
   if(a.photo2Data){pic('secondary',35,523,163,85);bg(208,523,174,85,'#e7effa');txt(a.location||a.venue,217,540,154,57,14,color,true)}
   else {bg(35,524,347,84,'#e8eefb');txt(a.subtitle||a.location||a.venue||a.category,51,544,318,47,19,color,true)}
   bg(404,293,377,328,'#fff','#dce4f2',12);
   txt('LE PROGRAMME',424,311,336,28,17,color,true);
   txt(a.summary,424,342,331,74,15,dark,false,'left',{top:true});
   bulletSection('TEMPS FORTS',a.highlights,424,423,332,5,24,14);
   txt(cut(a.administrative,100),424,578,329,35,11,'#687a95');
   pricePanel(793,293,384,328,{large:false,footer:true});
   txt(regText(),31,629,730,17,12,color,true);
   action(967,622,208,31);
 }
 if(type==='prices'){
   txt((a.title||'TITRE DE L’ACTIVITÉ').toUpperCase(),29,188,939,53,32,dark,true);
   txt(P.dateRange(a.activityStart,a.activityEnd),31,246,940,40,23,purple,true);
   badge(996,206,180,51);
   pic('primary',27,301,344,261);
   txt(a.summary,28,576,341,57,13,dark,false,'left',{top:true});
   pricePanel(393,298,780,272,{large:true,footer:false});
   txt(regText(),399,586,526,29,16,color,true);
   txt(cut(a.conditions||a.administrative,150),399,616,535,26,11,subtle);
   action(961,590,210,47);
 }

 if(type==='agenda'){
   txt((a.title||'TITRE DE L’ACTIVITÉ').toUpperCase(),29,185,929,51,33,dark,true);
   txt(P.dateRange(a.activityStart,a.activityEnd),30,238,942,34,22,purple,true);
   badge(997,207,176,49);
   pic('primary',27,293,423,246);
   bg(27,550,424,90,'#eaf0fb','',9);
   txt(a.location||a.venue||a.category,43,563,392,26,18,color,true);
   txt(cut(a.summary,105),43,591,390,40,13,dark,false,'left',{top:true});
   bg(465,291,426,347,'#fff','#dce4f2',10);
   txt('LE PROGRAMME',483,307,394,27,18,color,true);
   let y=346;
   const agendaLines=list(a.highlights).slice(0,7);
   if(agendaLines.length){agendaLines.forEach((line,i)=>{bg(483,y+3,22,22,'#e6eefe','',6);txt(String(i+1),483,y+5,22,18,12,color,true,'center');txt(cut(line,66),515,y,356,44,14,dark,false,'left',{top:true});y+=41})}
   else txt(cut(a.summary||'Programme à confirmer',180),482,350,380,180,15,dark,false,'left',{top:true});
   pricePanel(903,292,271,286,{footer:false});
   txt(regText(),915,595,255,33,12,color,true,'center');
   action(902,544,272,45);
 }
 if(type==='flash'){
   bg(22,191,662,353,'#f2f5fc','',13);
   txt((a.category||'ACTIVITÉ').toUpperCase()+'   ·   '+(a.location||'MASSY'),40,212,600,30,15,color,true);
   txt((a.title||'TITRE DE L’ACTIVITÉ').toUpperCase(),38,257,632,116,42,dark,true,'left',{top:true});
   txt(P.dateRange(a.activityStart,a.activityEnd),42,378,602,54,24,purple,true);
   txt(cut(a.summary,270),43,452,614,73,17,dark,false,'left',{top:true});
   pic('primary',699,190,479,354);
   badge(911,554,265,45);
   pricePanel(24,559,665,79,{compact:true,footer:false});
   action(911,606,265,40);
   txt(regText(),702,619,205,26,12,color,true);
 }
 return {type,elements:out,rows,status:statusLabel(a),url:effectiveUrl(a)};
}
const api={CHOICES,render,safeUrl,effectiveUrl,statusLabel,list};
if(typeof module!=='undefined'&&module.exports)module.exports=api;root.CSELayouts=api;
})(typeof window!=='undefined'?window:globalThis);
