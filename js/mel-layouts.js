/* Formes et mises en page communes à l'aperçu HTML et à l'export PPTX. Coordonnées 1200×675. */
(function(root){
'use strict';
const NAVY='#234583',BLUE='#3555A0',PURPLE='#6738D8',RED='#DD334C',GREEN='#238A58',PALE='#EDF4FE',INK='#1B2A43',MUTED='#52617A',ORANGE='#EF743B',WHITE='#FFFFFF';
const W=1200,H=675,BASE=182,FOOT=645;
const fmt=(d)=>{if(!d)return '';const x=new Date(d+'T12:00:00');return isNaN(x)?String(d):new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'long',year:'numeric'}).format(x)};
const money=n=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(Number(n)||0)+' €';
function el(kind,x,y,w,h,props={}){return {kind,x,y,w,h,...props};}
function clip(v,max=200){const s=String(v??'').trim();return s.length>max?s.slice(0,Math.max(0,max-1)).replace(/\s+\S*$/,'')+'…':s;}
function safeLink(s){try{const u=new URL(s);return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return '';}}
function sectionLink(slide,settings){if(slide.linkType==='none')return '';return safeLink(slide.linkType==='custom'?slide.linkCustom:(settings.cseUrl||''));}
function costs(slide,settings){if(!slide.priceEnabled)return [];const p=Number(slide.outsidePrice||0);if(slide.pricingMode==='manuel'){const vals=String(slide.manualPrices||'').replace(/€/g,'').split(/[;,\/|\s]+/).filter(Boolean).map(x=>Number(x.replace(',','.')));return vals.slice(0,10).map((n,i)=>['T'+(i+1),money(n)]);}if(slide.pricingMode==='part')return [['Bénéficiaire',money(p*(Number(slide.fixedPercent)||0)/100)],['Extérieur',money(p)]];if(slide.pricingMode==='fixe')return [['Bénéficiaire',money(slide.fixedPrice)],...(p>0?[['Extérieur',money(p)]]:[])];if(slide.pricingMode==='pourcentage')return [['Bénéficiaire',money(p*(1-(Number(slide.fixedPercent)||0)/100))],['Extérieur',money(p)]];return (settings.rates||[70,65,60,55,50,45,40,35,30,25]).map((rate,i)=>['T'+(i+1),money(p*(1-Number(rate)/100))]);}
function render(slide,settings,slides){
const E=[],s=slide||{},cfg=settings||{},other=slides||[];
const rect=(x,y,w,h,fill=WHITE,opts={})=>E.push(el('rect',x,y,w,h,{fill,...opts}));
const txt=(str,x,y,w,h,size=20,color=INK,opts={})=>{if(String(str??'').trim())E.push(el('text',x,y,w,h,{text:String(str),size,color,...opts}));};
const img=(src,x,y,w,h,opts={})=>{if(src)E.push(el('image',x,y,w,h,{src,...opts}));else{rect(x,y,w,h,opts.placeholderFill||'#E7F0FC',{radius:10});txt(opts.placeholder||'VISUEL À AJOUTER',x+10,y+h/2-15,w-20,30,16,'#7594BE',{bold:true,align:'center'});}};
const boxText=(title,body,x,y,w,h,fill=PALE)=>{rect(x,y,w,h,fill,{radius:9});txt(title,x+15,y+12,w-30,23,16,NAVY,{bold:true});txt(clip(body,260),x+15,y+40,w-30,h-52,15,INK,{top:true});};
const label=(str,x,y,w,color=NAVY)=>{rect(x,y,w,33,color,{radius:7});txt(str,x+7,y+3,w-14,27,16,WHITE,{bold:true,align:'center'});};
const meta=(k,v,x,y,w,size=14)=>{if(v){txt(k,x,y,w,19,size,NAVY,{bold:true});txt(v,x,y+20,w,42,size,INK,{top:true});}};
const bulletize=(t,max=560)=>clip(String(t||'').split(/\n+/).map(x=>x.trim()).filter(Boolean).map((x)=>'• '+x.replace(/^[-•]\s*/,'')).join('\n'),max);
const rawDate= s.date?(s.dateEnd&&s.dateEnd!==s.date?'Du '+fmt(s.date)+' au '+fmt(s.dateEnd):fmt(s.date)):'';
const prices=costs(s,cfg);const link=sectionLink(s,cfg),contact=clip((s.contact||'').replace(/\n/g,' · '),110),sidePhoto=s.image||s.image2||'';
const point=s.points?'⭐ '+String(s.points)+' points · '+({long:'Séjour long',short:'Séjour court',france:'Séjour France'}[s.counter]||'Compteur à préciser'):'';
function commonTitle(size=31){txt(clip(s.title||'Titre de la communication',88).toUpperCase(),35,192,1120,52,size,NAVY,{bold:true,align:'center'});if(s.subtitle)txt(clip(s.subtitle,98),45,241,1110,30,18,PURPLE,{bold:true,align:'center'});}
function footer(){rect(0,645,1200,30,BLUE);if(link&&s.kind!=='cover'){rect(962,606,206,31,PALE,{radius:6,stroke:'#CFDDF4'});txt(clip(s.linkLabel||'Plus d’infos',24),971,611,190,20,14,NAVY,{bold:true,align:'center',link});}else if(s.section==='Règlement'){txt('MODALITÉS CSE · À VÉRIFIER AVANT CHAQUE DIFFUSION',640,611,520,18,12,MUTED,{align:'right'});}if(contact&&!['cover','calendar'].includes(s.kind))txt('Contact : '+contact,42,613,870,22,13,PURPLE,{bold:true});}
function badge(){const flag=s.badge||(s.section==='Dernière semaine'?'last':s.section==='Nouveautés'?'new':'');if(flag==='last')label('DERNIÈRE CHANCE !',932,190,225,ORANGE);if(flag==='new')label('NOUVEAU !',1001,190,155,GREEN);}
function pricePanel(x,y,w,h,cols=2){if(!s.priceEnabled||!prices.length)return;rect(x,y,w,h,'#F3F0FF',{radius:8,stroke:'#E3D5FF'});txt('TARIFS CSE',x+12,y+7,w-24,22,14,PURPLE,{bold:true});if(prices.length>2){const n=Math.ceil(prices.length/cols),cell=(w-20)/cols;prices.forEach((p,i)=>{let col=Math.floor(i/n),row=i%n;txt(p[0]+' : '+p[1],x+13+col*cell,y+35+row*23,cell-8,20,13,BLUE,{bold:true});});}else prices.forEach((p,i)=>txt(p.join(' : '),x+13,y+37+i*23,w-26,20,15,BLUE,{bold:true}));if(s.outsidePrice&&prices.length>2&&h>=95)txt('EXT : '+money(s.outsidePrice),x+13,y+h-29,w-24,18,13,MUTED);}
function detailsAt(x,y,w,h,max=430){txt(clip((s.description||'')+(s.details?'\n\n'+s.details:''),max),x,y,w,h,16,INK,{top:true,lineHeight:1.24});}
function sidebarExtras(x,y,w){if(s.deadline)meta('DATE LIMITE',fmt(s.deadline),x,y,w,13);if(s.maxParticipants||s.minParticipants)meta('PARTICIPANTS',[s.minParticipants?'Min. '+s.minParticipants:'',s.maxParticipants?'Max. '+s.maxParticipants:''].filter(Boolean).join(' · '),x,y+71,w,13);if(point)txt(clip(point,70),x,y+153,w,43,13,PURPLE,{bold:true,top:true});if(s.carbon)txt('🌿 '+clip(s.carbon,27),x,y+201,w,22,12,GREEN,{bold:true});}
// Bandeau fourni par le CSE, identique à l'exemplaire source.
rect(0,0,1200,675,WHITE);img('assets/bandeau-cse.jpg',0,0,1200,176,{fit:'contain'});rect(0,175,1200,4,'#EAF0FA');
if(s.kind==='cover'){
 txt((cfg.title||'MEL DU CSE')+' – SEMAINE '+(cfg.week||'—'),48,192,1104,47,32,NAVY,{bold:true,align:'center'});
 rect(45,247,1110,85,'#E6F2FF',{radius:9});label('IMPORTANT',67,264,173,NAVY);txt(clip(s.highlight||'Information importante à communiquer aux bénéficiaires',190),266,264,866,54,17,NAVY,{bold:true,top:true});
 const alert=other.find(v=>v.id!==s.id&&v.included&&v.section==='Dernière semaine');
 rect(45,344,1110,65,'#FFF0E6',{radius:9});label('À NE PAS MANQUER',67,358,210,ORANGE);txt(clip(s.description||alert?.title||'Renseignez les échéances de cette semaine.',105),294,356,826,45,17,'#A64A20',{bold:true,top:true});
 label('LES NOUVEAUTÉS DE LA SEMAINE',328,422,544,GREEN);const news=other.filter(v=>v.id!==s.id&&v.included&&v.section==='Nouveautés').slice(0,3);
 for(let i=0;i<3;i++){const n=news[i],x=46+i*370;rect(x,469,357,100,WHITE,{radius:9,stroke:'#A6D9B6'});if(n?.image)img(n.image,x+8,477,83,83);else rect(x+8,477,83,83,'#E6F2E9',{radius:6});txt(clip(n?.category||'ACTIVITÉ',21),x+101,482,243,22,13,GREEN,{bold:true});txt(clip(n?.title||'À venir',54),x+101,511,243,43,16,NAVY,{bold:true});}
 txt(clip(s.details||'Informations et calendrier sur votre portail CSE.',170),50,582,1102,23,14,NAVY,{align:'center'});
 if(s.linkType!=='none'){rect(50,610,1100,30,'#DFECFF',{radius:5});txt(clip(s.linkLabel||'Consulter les activités sur le site CSE',100),55,615,1090,21,14,BLUE,{bold:true,align:'center',link:safeLink(cfg.planningUrl)||link});}
}
else if(s.kind==='calendar'){
 commonTitle(30);txt('OUVERTURES ET PERMANENCES',34,251,278,38,19,PURPLE,{bold:true,align:'center'});
 rect(54,304,246,238,'#E7F2FD',{radius:13});txt('CSE',73,343,210,68,53,NAVY,{bold:true,align:'center'});txt(clip(s.description||'Accueil et renseignements',95),77,427,198,62,17,NAVY,{bold:true,align:'center'});
 txt('Contact : '+(contact||'À renseigner'),51,551,270,35,13,PURPLE,{bold:true,align:'center'});
 const [year,month]=String(s.calendarMonth||'2026-11').split('-').map(Number);const d0=new Date(year||2026,(month||11)-1,1),monthname=d0.toLocaleDateString('fr-FR',{month:'long',year:'numeric'}).toUpperCase();
 const x=348,y=275,cw=86,ch=48,wk=5;rect(x,y,530,331,WHITE,{stroke:'#9FB6D9'});rect(x,y,530,47,PALE);txt(monthname,x+1,y+5,528,36,23,NAVY,{bold:true,align:'center'});
 for(let i=0;i<wk;i++){rect(x+i*106,y+47,106,31,'#DBE8F8');txt(['LUN','MAR','MER','JEU','VEN'][i],x+i*106,y+50,106,25,13,NAVY,{bold:true,align:'center'});}
 let start=new Date(year||2026,(month||11)-1,1);const minus=(start.getDay()+6)%7;start.setDate(1-minus);
 for(let j=0;j<30;j++){const d=new Date(start);d.setDate(start.getDate()+Math.floor(j/5)*7+(j%5));const xx=x+(j%5)*106,yy=y+78+Math.floor(j/5)*42;const key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'),st=s.scheduleDays?.[key]||'none';const current=d.getMonth()===(month||11)-1;rect(xx,yy,106,42,current?({open:'#98D16A',short:'#FFE365',closed:'#EF6364',none:'#F9FBFF'}[st]):'#F0F0F0',{stroke:'#C2CEDD'});if(current)txt(String(d.getDate()),xx,yy+8,106,25,16,INK,{bold:st!=='none',align:'center'});}
 rect(905,305,245,270,'#F6F8FF',{radius:10});txt('LÉGENDE',924,321,206,28,17,NAVY,{bold:true});for(const [i,col,st,lbl] of [[0,'#98D16A','open','Permanence'],[1,'#FFE365','short','Ouverture réduite'],[2,'#EF6364','closed','Fermé']]){rect(924,365+i*48,23,23,col);txt(lbl,955,365+i*48,175,26,14,INK);}
 txt(clip(s.openHours,35),920,521,213,26,13,BLUE,{bold:true});if(s.shortHours)txt(clip(s.shortHours,35),920,548,213,22,12,MUTED);
 txt(clip(s.details||'Les jours et horaires sont susceptibles d’évoluer.',142),360,617,515,17,11,MUTED);
 if(s.catalogueUrl){txt('CONSULTER LE CATALOGUE',40,610,280,25,14,BLUE,{bold:true,link:safeLink(s.catalogueUrl)});}
}
else if(s.kind==='information'){
 commonTitle(30);badge();
 if(sidePhoto){img(sidePhoto,37,280,263,285);rect(321,283,845,270,'#FFFFFF');txt(clip(s.description,680),333,286,824,195,19,INK,{top:true});if(s.highlight)boxText('À RETENIR',clip(s.highlight,225),329,494,817,100,'#FFF3E8');}
 else{rect(42,285,1115,276,'#F5F8FF',{radius:14});txt(clip(s.description,810),69,310,1063,198,20,INK,{top:true});if(s.highlight){rect(67,524,1067,62,'#E2F1FF',{radius:9});txt(clip(s.highlight,225),86,538,1023,35,17,BLUE,{bold:true,align:'center'});}}
 if(s.details)txt(clip(s.details,250),58,580,1075,40,14,RED,{top:true});
}
else if(s.kind==='activity'){
 commonTitle(29);badge();const left=220,center=702;
 txt(clip(s.category||'Activité',28),32,280,left,31,17,NAVY,{bold:true});img(s.image,32,316,left,151,{placeholder:'PHOTOGRAPHIE'});if(s.image2)img(s.image2,32,476,left,114);
 if(s.priceEnabled)pricePanel(275,516,660,103,5);
 txt(rawDate||clip(s.subtitle||'Dates à préciser',64),275,265,660,32,19,PURPLE,{bold:true});txt(clip(s.description,470),275,311,660,s.priceEnabled?169:198,17,INK,{top:true});if(s.details)txt(clip(s.details,s.priceEnabled?250:420),275,s.priceEnabled?481:518,660,s.priceEnabled?36:80,13,MUTED,{top:true});
 rect(967,276,193,305,'#F3F7FD',{radius:11});sidebarExtras(981,300,170);if(s.highlight)txt(clip(s.highlight,93),977,558,185,45,12,RED,{bold:true,top:true});else if(!s.priceEnabled&&s.age)txt(clip(s.age,50),980,575,167,22,13,ORANGE,{bold:true});if(s.priceEnabled&&s.priceNotes)txt(clip(s.priceNotes,64),985,581,160,21,11,MUTED);
}
else if(s.kind==='deadline'){
 commonTitle(28);badge();
 img(s.image,30,286,285,253,{placeholder:'VISUEL DE L’ACTIVITÉ'});
 txt(rawDate||clip(s.subtitle||'Date à préciser',80),347,273,791,31,19,PURPLE,{bold:true,align:'center'});
 txt(clip(s.description,400),345,326,787,112,18,INK,{top:true});if(s.details)txt(clip(s.details,260),345,441,784,72,14,MUTED,{top:true});
 if(s.deadline){rect(345,522,790,62,'#FFE9E2',{radius:10});txt('FIN DES INSCRIPTIONS : '+fmt(s.deadline).toUpperCase(),362,535,755,37,21,RED,{bold:true,align:'center'});}if(s.priceEnabled)pricePanel(30,546,285,80,5);
}
else if(s.kind==='immersive'){
 img(s.image,0,179,577,466,{placeholder:'PHOTO IMMERSIVE'});rect(575,179,625,466,WHITE);
 txt(clip(s.title||'Événement',95),607,212,551,82,29,INK,{bold:true,align:'center'});txt(rawDate||clip(s.subtitle,80),609,303,541,44,21,PURPLE,{bold:true,align:'center'});
 txt(clip(s.description,375),611,362,540,107,17,INK,{top:true,align:'center'});
 if(s.highlight)txt(clip(s.highlight,120),615,474,526,36,19,ORANGE,{bold:true,align:'center'});
 if(s.priceEnabled)pricePanel(615,526,533,77,5);if(s.deadline)txt('Date limite : '+fmt(s.deadline),614,604,347,25,13,RED,{bold:true});
}
else if(s.kind==='partner'){
 commonTitle(29);badge();
 rect(45,283,630,305,'#FFFFFF');txt(clip(s.description,500),62,298,608,154,22,INK,{top:true});
 if(s.highlight){rect(61,462,585,92,'#F0E9FF',{radius:11});txt(clip(s.highlight,160),75,474,558,70,23,PURPLE,{bold:true,align:'center'});}
 img(s.image,718,281,425,279,{placeholder:'LOGO / VISUEL PARTENAIRE'});
 if(s.code){label('CODE : '+clip(s.code,28),757,566,340,PURPLE);}if(s.deadline)txt('Offre valable jusqu’au '+fmt(s.deadline),56,573,650,27,15,RED,{bold:true});if(s.details)txt(clip(s.details,165),55,597,755,35,13,MUTED,{top:true});
}
else if(s.kind==='poster'){
 txt(clip(s.title||'Animation',95).toUpperCase(),32,190,1134,58,38,NAVY,{bold:true,align:'center'});
 txt(rawDate||clip(s.subtitle,100),38,253,1120,45,23,PURPLE,{bold:true,align:'center'});
 img(s.image,51,320,399,290,{placeholder:'VISUEL / AFFICHE'});
 txt(clip(s.description||'Une activité proposée par votre CSE',230),494,328,655,75,22,INK,{bold:true,align:'center'});
 txt(clip(s.details,500),505,428,636,174,20,BLUE,{align:'center',top:true});
}
else if(s.kind==='agenda'){
 commonTitle(30);
 txt(clip(s.subtitle||'PROGRAMME DES PROCHAINES ACTIVITÉS',85),40,247,1114,31,17,PURPLE,{bold:true,align:'center'});
 const rows=(Array.isArray(s.agendaRows)?s.agendaRows:[]).slice(0,9);
 if(!rows.length)txt('Ajoutez des dates dans le tableau de saisie ou importez-les depuis les activités enregistrées.',125,362,964,120,23,MUTED,{align:'center'});
 rows.forEach((r,i)=>{let y=286+i*36;rect(53,y,1096,32,i%2?'#F5F8FE':'#E9F1FC',{radius:3});txt(fmt(r.date)||'Date à définir',67,y+6,192,23,13,NAVY,{bold:true});txt(clip(r.title,64),270,y+5,602,25,16,INK,{bold:i<2});txt(clip(r.status||r.location,35),897,y+5,236,24,12,i<2?GREEN:MUTED,{align:'right'});});
 txt('PROGRAMMATION PRÉVISIONNELLE · les modalités pourront être ajustées.',68,612,1020,23,12,MUTED,{align:'center'});
}
else if(s.kind==='table'){
 commonTitle(29);txt(clip(s.subtitle||'DATES ET LIEUX',90),41,246,1115,33,18,PURPLE,{bold:true,align:'center'});
 const xx=[50,545,790,981], ww=[495,245,191,171];
 rect(50,288,1102,43,NAVY,{radius:5});for(let j=0;j<4;j++)txt(['VISITE / ACTIVITÉ','LIEU','TYPE','DATE'][j],xx[j]+10,295,ww[j]-18,29,15,WHITE,{bold:true});
 const rows=(Array.isArray(s.agendaRows)?s.agendaRows:[]).slice(0,7);
 rows.forEach((r,i)=>{const y=332+i*40;rect(50,y,1102,40,i%2?'#F4F7FE':'#EAF0FA',{stroke:'#D6E2F1'});const cell=[clip(r.title,56),clip(r.location,31),clip(r.status,24),fmt(r.date)];for(let j=0;j<4;j++)txt(cell[j],xx[j]+10,y+6,ww[j]-18,31,12,INK,{top:true});});
 if(!rows.length)txt('Renseignez les lignes du tableau de prévision.',90,388,1010,60,22,MUTED,{align:'center'});
 txt('Les inscriptions pour ces sorties peuvent ne pas être encore ouvertes.',100,618,1000,21,14,MUTED,{align:'center'});
}
else if(s.kind==='rules'){
 commonTitle(28);const content=String(s.description||'').split(/\n\n+/).filter(Boolean);const mid=Math.ceil(content.length/2),left=content.slice(0,mid).join('\n\n'),right=content.slice(mid).join('\n\n');
 if(s.highlight){rect(41,271,1117,66,'#FFF0F1',{radius:8});txt(clip(s.highlight,180),62,282,1074,41,22,RED,{bold:true,align:'center'});}
 const y=s.highlight?351:287;
 rect(44,y,540,FOOT-y-43,'#F4F8FF',{radius:10});rect(614,y,540,FOOT-y-43,'#F4F8FF',{radius:10});
 txt(clip(left,1050),65,y+20,494,FOOT-y-79,14,INK,{top:true});txt(clip(right,1050),638,y+20,492,FOOT-y-79,14,INK,{top:true});
}
else{commonTitle();detailsAt(50,300,1100,260);}
footer();return {width:W,height:H,items:E,url:link,costs:prices,template:s.kind};
}
root.MEL_LAYOUTS={render,costs,safeLink,sectionLink,clip,fmt,money};
})(window);
