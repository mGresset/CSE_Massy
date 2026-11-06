/* CSE Studio V8 — moteur de composition dynamique, commun à l'aperçu et au PPTX.
   Reprend le rendu V7 pour le calendrier de permanence (conservé). */
(function (root) {
'use strict';
const base=root.MEL_LAYOUTS;if(!base)throw Error('MEL_LAYOUTS absent');
const oldRender=base.render;
const C={navy:'#183D7D',blue:'#315CA5',purple:'#6139C5',green:'#197C61',lightGreen:'#E8F6EF',orange:'#E87929',amber:'#FFF0DC',red:'#C63B4B',coral:'#FAE9E7',ink:'#202B3C',muted:'#617086',light:'#F0F5FC',white:'#FFFFFF',border:'#DAE3F0',dark:'#112D60'};
const W=1200,H=675, TOP=179, FOOT=645;
const el=(kind,x,y,w,h,p={})=>({kind,x,y,w,h,...p});
const singleLine=s=>String(s??'').replace(/\s+/g,' ').trim();
const truncate=(v,len=240)=>{let s=String(v??'').trim();if(s.length<=len)return s;let z=s.slice(0,Math.max(0,len-1));return z.replace(/\s+\S*$/,'')+'…';};
const dateText=base.fmt;
function daysTo(deadline,start){if(!deadline||!start)return null;const a=Date.parse(deadline+'T12:00:00'),b=Date.parse(start+'T12:00:00');return Number.isFinite(a)&&Number.isFinite(b)?Math.round((a-b)/86400000):null;}
function choose(s,rows,ref,deadlineMode=false){const ids=Array.isArray(s.featureIds)?s.featureIds:[];let list=rows.filter(a=>a.id!==s.id&&a.included!==false&&a.title&& !['cover','newsgrid','lastboard','rules','calendar','agenda','table','information'].includes(a.kind));
  if(ids.length){const byId=new Map(list.map(x=>[String(x.id),x]));list=ids.map(id=>byId.get(String(id))).filter(Boolean);}
  else if(deadlineMode){list=list.filter(a=>a.deadline && daysTo(a.deadline,ref)!==null && daysTo(a.deadline,ref)>=0 && daysTo(a.deadline,ref)<=7).sort((a,b)=>a.deadline.localeCompare(b.deadline));}
  else list=list.filter(a=>a.section==='Nouveautés').sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999'));
  if(s.smartCategory&&s.smartCategory!=='Toutes')list=list.filter(x=>x.category===s.smartCategory);
  return list.slice(0,6);
}
function render(s,cfg,all){s=s||{};cfg=cfg||{};all=all||[];
if(s.kind==='calendar')return oldRender(s,cfg,all);
const E=[],warnings=[],density=s.density||'auto';const FONT_DELTA=density==='aere'?2:density==='compact'?-2:0;
const p=base.costs(s,cfg),url=base.sectionLink(s,cfg),priceOn=!!s.priceEnabled&&p.length>0;
const title=singleLine(s.title||'Titre à renseigner'),subtitle=singleLine(s.subtitle||''),contact=singleLine(s.contact||''),location=singleLine(s.location||'');
const duration=s.date?(s.dateEnd&&s.dateEnd!==s.date?'Du '+dateText(s.date)+' au '+dateText(s.dateEnd):dateText(s.date)):subtitle;
const point=s.points?`${s.points} POINTS · ${({long:'LONG SÉJOUR',short:'COURT SÉJOUR',france:'SÉJOUR FRANCE'})[s.counter]||'COMPTEUR À PRÉCISER'}`:'';
function rect(x,y,w,h,fill=C.white,radius=0,stroke){E.push(el('rect',x,y,w,h,{fill,radius,stroke}));}
function txt(value,x,y,w,h,size=19,color=C.ink,opts={}){if(!String(value??'').trim())return;E.push(el('text',x,y,w,h,{text:String(value),size,color,...opts}));}
function image(src,x,y,w,h,fit='cover'){if(src)E.push(el('image',x,y,w,h,{src,fit}));else{rect(x,y,w,h,'#EAF1F8',13);txt('AJOUTER UNE IMAGE',x+16,y+h/2-16,w-32,32,15,'#7189AC',{bold:true,align:'center'});}}
function pill(t,x,y,w,bg=C.navy,size=15){rect(x,y,w,31,bg,8);txt(t,x+7,y+2,w-14,26,size,C.white,{bold:true,align:'center'});}
function estLines(text,width,size){const chars=Math.max(8,Math.floor(width/(Math.max(1,size)*0.52)));let total=0;for(const raw of String(text||'').split('\n')){let line=0;for(const word of raw.split(/\s+/).filter(Boolean)){const n=word.length+1;if(line+n>chars){total++;line=n;}else line+=n;}total+=Math.max(1,Math.ceil(line/chars));}return total;}
function clipForLines(text,width,size,maxlines){const limit=Math.max(8,Math.floor(width/(size*0.52)));let out=[],line='',words=String(text||'').trim().replace(/\n+/g,' \n ').split(/\s+/);for(const word of words){if(word==='\n'){out.push(line);line='';continue;}const s=line?line+' '+word:word;if(s.length>limit&&line){out.push(line);line=word;}else line=s;if(out.length>=maxlines)break;}if(out.length<maxlines&&line)out.push(line);if(out.length>maxlines)out=out.slice(0,maxlines);let joined=out.join('\n');if(joined.replace(/\s/g,'').length<text.replace(/\s/g,'').length)joined=joined.replace(/[\s,.;:]*$/,'')+'…';return joined;}
function fit(t,x,y,w,h,requested=21,min=15,color=C.ink,opt={}){const original=String(t??'').trim();if(!original)return;const factor=1.24;let size=Math.max(min,requested+FONT_DELTA),maxlines=Math.max(1,Math.floor(h/(size*factor)));while(size>min&&estLines(original,w-6,size)>maxlines){size--;maxlines=Math.max(1,Math.floor(h/(size*factor)));}let out=original;if(estLines(original,w-6,size)>maxlines){out=clipForLines(original,w-6,size,maxlines);warnings.push('Texte abrégé dans « '+(opt.field||'contenu')+' » : prévoir une deuxième diapositive ou raccourcir le contenu.');}txt(out,x,y,w,h,size,color,{top:true,...opt});}
function topbar(section){rect(0,0,W,H,C.white);image('assets/bandeau-cse.jpg',0,0,1200,176,'contain');rect(0,176,1200,3,C.border);if(section){txt(section.toUpperCase(),44,188,700,23,13,C.blue,{bold:true});}}
function headline(main,{y=204,size=35,accent=C.navy,x=44,w=1112,h=66,align='left'}={}){fit(main,x,y,w,h,size,24,accent,{bold:true,field:'titre',align});}
function photoPanel(src,x,y,w,h){image(src,x,y,w,h);rect(x,y+h-5,w,5,C.blue);}
function footer(){rect(0,645,W,30,C.blue);if(url){rect(946,605,213,31,C.light,8);txt(truncate(s.linkLabel||'Accéder au CSE',21),958,610,189,21,14,C.blue,{bold:true,align:'center',link:url});}if(contact&&!['cover','newsgrid','lastboard','calendar'].includes(s.kind)){txt('CONTACT · '+truncate(contact,100),45,612,900,22,14,C.purple,{bold:true});}}
function metaChip(label,value,x,y,w,accent=C.blue,height=60){if(!value)return 0;rect(x,y,w,height,C.light,10);txt(label.toUpperCase(),x+12,y+6,w-24,16,11,C.muted,{bold:true});fit(value,x+12,y+23,w-24,Math.max(20,height-26),17,13,accent,{bold:true,field:label});return height;}
function priceBox(x,y,w,h){if(!priceOn)return;rect(x,y,w,h,'#F3EFFF',11);rect(x,y,6,h,C.purple);txt('TARIFS CSE',x+16,y+9,w-25,23,15,C.purple,{bold:true});const many=p.length>2,cols=many?(w>550?5:2):1,rows=Math.ceil(p.length/cols);const top=y+34,cellW=(w-28)/cols,cellH=Math.min(29,(h-39-(s.outsidePrice&&many?19:0))/rows);
  for(let i=0;i<p.length;i++){const col=many?i%cols:0,row=many?Math.floor(i/cols):i;const val=p[i][0]+'  '+p[i][1];fit(val,x+14+col*cellW,top+row*cellH,cellW-9,cellH,15,12,C.dark,{bold:true,field:'tarifs'});}
  if(s.outsidePrice&&many){txt('EXTÉRIEUR : '+base.money(s.outsidePrice),x+14,y+h-21,w-26,17,12,C.muted,{bold:true});}}
function descBox(x,y,w,h,str,req=21){fit(str,x,y,w,h,req,15,C.ink,{field:'description'});}
function extras(x,y,w,h){let bits=[];if(s.deadline)bits.push(['INSCRIPTIONS JUSQU’AU',dateText(s.deadline)]);if(s.minParticipants||s.maxParticipants)bits.push(['PARTICIPANTS',[s.minParticipants?'Min. '+s.minParticipants:'',s.maxParticipants?'Max. '+s.maxParticipants:''].filter(Boolean).join('  ·  ')]);if(point)bits.push(['COMPTEUR',point]);if(s.carbon)bits.push(['BILAN CARBONE',String(s.carbon)]);if(s.age)bits.push(['PUBLIC',s.age]);const gap=9,each=Math.min(67,(h-gap*Math.max(0,bits.length-1))/Math.max(1,bits.length));bits.forEach((b,i)=>metaChip(b[0],b[1],x,y+i*(each+gap),w,C.blue,each));}
function brandHeader(section,main,sub){topbar(section);headline(main,{y:209,size:35,h:53});if(sub)fit(sub,45,267,1110,34,21,17,C.purple,{bold:true,field:'sous-titre'});}
function urgencyTitle(deadline,width){const d=daysTo(deadline,cfg.newsletterDate);return d===0?'J−0':d!==null&&d>=0?'J−'+d:'URGENT';}
function listing(items,urgent){topbar(urgent?'DERNIÈRES CHANCES':'LES NOUVEAUTÉS');rect(0,180,W,80,urgent?C.dark:C.green);txt(urgent?'DERNIÈRE CHANCE !':'À LA UNE CETTE SEMAINE',44,195,1088,44,38,C.white,{bold:true});txt(urgent?'Les inscriptions se terminent bientôt':'Découvrez les dernières activités du CSE',50,232,1070,23,16,'#EAF6F2');
  const n=Math.max(1,Math.min(6,items.length||1));const cols=n===1?1:n<=2?2:n===3?3:n===4?2:3,rows=Math.ceil(n/cols),gx=18,gy=14,startX=44,startY=278,areaW=1112,areaH=317;const cw=(areaW-(cols-1)*gx)/cols,ch=(areaH-(rows-1)*gy)/rows;
  for(let i=0;i<n;i++){const a=items[i]||null,x=startX+(i%cols)*(cw+gx),y=startY+Math.floor(i/cols)*(ch+gy);rect(x,y,cw,ch,C.white,12,C.border);const below=(rows===1&&cols>=3),imgW=below?cw:(cols===1?ch*1.7:Math.min(cw*.40,ch*.93)),imgH=below?Math.min(95,ch*.52):ch;const photo=a?.image||a?.image2||'';if(photo)image(photo,x,y,imgW,imgH);else{rect(x,y,imgW,imgH,urgent?'#FBE2D7':'#D9F0E6',12);rect(x+8,y+8,Math.max(15,imgW-16),Math.max(16,imgH-16),urgent?'#F6D0C4':'#C0E6D5',9);txt(urgent?'!':'✦',x+15,y+Math.max(8,imgH/2-29),Math.max(25,imgW-30),58,47,urgent?'#C95343':'#358B70',{bold:true,align:'center'});} const textX=below?x+12:x+imgW+15;const textY=below?y+imgH+7:y+13;const textW=below?cw-24:cw-imgW-28;
   if(!a){fit('Sélectionner une activité dans le formulaire',textX,textY,textW,65,19,14,C.muted,{field:'activité'});continue;}
   const cat=truncate(a.category||'ACTIVITÉ',25);txt(cat.toUpperCase(),textX,textY,textW,21,13,urgent?C.red:C.green,{bold:true});const tH=below?45:ch-90;fit(a.title,textX,textY+26,textW,Math.max(38,tH),n<=2?24:20,17,C.dark,{bold:true,field:'titre activité'});
   const inf=urgent?(a.deadline?'FIN : '+dateText(a.deadline):'Date à confirmer'):(a.date?dateText(a.date):'À découvrir');const iby=below?y+ch-31:y+ch-39;rect(textX,iby,textW,26,urgent?C.coral:C.lightGreen,6);fit(inf,textX+7,iby+3,textW-14,21,15,12,urgent?C.red:C.green,{bold:true,field:'échéance'});
   if(urgent&&a.deadline){rect(x+8,y+8,72,28,C.red,7);txt(urgencyTitle(a.deadline,72),x+12,y+11,64,19,11,C.white,{bold:true,align:'center'});}
  }
  if(items.length>6)warnings.push('Plus de six activités : une deuxième page est nécessaire.');}
function cover(){topbar();txt((cfg.title||'MEL DU CSE').toUpperCase(),45,188,770,32,25,C.blue,{bold:true});txt('SEMAINE '+(cfg.week||'—'),812,185,339,37,26,C.navy,{bold:true,align:'right'});
 rect(45,237,1110,84,C.light,12);rect(45,237,13,84,C.blue);txt('À SAVOIR',73,247,188,22,14,C.blue,{bold:true});fit(s.highlight||'Une information importante à communiquer',73,270,1054,41,21,17,C.dark,{bold:true,field:'information importante'});
 const urgent=choose(s,all,cfg.newsletterDate,true)[0];rect(45,331,1110,82,C.amber,12);rect(45,331,13,82,C.orange);txt('⏱  À NE PAS MANQUER',73,343,365,25,16,C.red,{bold:true});fit(s.description||urgent?.title||'Découvrez les dates de clôture des inscriptions.',73,372,1040,34,20,16,C.dark,{bold:true,field:'alerte de couverture'});
 txt('LES NOUVEAUTÉS',45,426,700,32,25,C.green,{bold:true});const news=choose(s,all,cfg.newsletterDate,false).slice(0,4);const count=Math.max(1,news.length),gap=13,cw=(1110-(count-1)*gap)/count;
 for(let i=0;i<count;i++){const a=news[i],x=45+i*(cw+gap);rect(x,463,cw,130,C.lightGreen,10);if(a?.image)image(a.image,x+7,470,cw*.37,116);const tx=a?.image?x+cw*.39+10:x+13,tw=a?.image?cw*.58-14:cw-26;txt(truncate(a?.category||'ACTIVITÉ',19).toUpperCase(),tx,473,tw,21,12,C.green,{bold:true});fit(a?.title||'À venir',tx,501,tw,66,count<=2?22:18,15,C.dark,{bold:true,field:'nouveauté'});}
 if(s.details)fit(s.details,48,601,890,33,14,12,C.muted,{field:'information éditoriale'});
}
function activity(){brandHeader(s.category||'ACTIVITÉ',title,duration||s.subtitle);const hasImage=!!(s.image||s.image2);const hasAside=!!(s.deadline||s.minParticipants||s.maxParticipants||point||s.carbon||s.age);const x=hasImage?360:48,sidebar=hasAside?234:0,bodyW=1152-x-sidebar-(sidebar?18:0);if(hasImage)photoPanel(s.image||s.image2,45,315,288,281);
 let bodyTop=316; if(location){txt('LIEU',x,309,bodyW,18,13,C.blue,{bold:true});fit(location,x,330,bodyW,31,18,15,C.dark,{bold:true,field:'lieu'});bodyTop=368;}
 const bottom=priceOn?488:590;descBox(x,bodyTop,bodyW,bottom-bodyTop-7,([s.description,s.details].filter(Boolean).join('\n\n')),21);
 if(priceOn){const w=hasAside?782:1110;priceBox(45,500,w,98);}
 if(hasAside){rect(936,305,220,287,'#F5F8FC',12);extras(948,318,195,256);}
}
function deadline(){topbar('DERNIÈRE SEMAINE');rect(36,194,1128,77,C.dark,11);txt('DERNIÈRE CHANCE',55,201,760,55,40,C.white,{bold:true});pill(urgencyTitle(s.deadline),910,211,216,C.orange,16);
 const photo=!!(s.image||s.image2),x=photo?398:54,w=photo?745:1090;if(photo)photoPanel(s.image||s.image2,40,287,327,305);
 fit(title,x,290,w,68,32,24,C.dark,{bold:true,field:'titre'});
 const d=s.deadline?dateText(s.deadline).toUpperCase():'DATE À CONFIRMER';rect(x,364,w,53,C.coral,9);txt('FIN DES INSCRIPTIONS',x+14,372,w*.42,16,13,C.red,{bold:true});fit(d,x+14,391,w-28,23,19,15,C.red,{bold:true,field:'date limite'});
 if(duration)fit(duration,x,427,w,25,18,15,C.purple,{bold:true,field:'date activité'});
 if(priceOn){descBox(x,461,w,48,([s.description,s.details].filter(Boolean).join('\n\n')),19);priceBox(x,513,w,89);}else{descBox(x,467,w,130,([s.description,s.details].filter(Boolean).join('\n\n')),21);}
}
function immersive(){topbar(s.category||'ÉVÉNEMENT');const left=586;image(s.image,0,179,left,466);rect(left,179,614,466,C.white);rect(left,179,9,466,C.purple);fit(title,left+32,209,548,75,34,25,C.dark,{bold:true,field:'titre'});if(duration)fit(duration,left+32,292,548,37,20,16,C.purple,{bold:true,field:'date'});
 let infY=346;if(location){metaChip('Lieu',location,left+30,343,550);infY=409;}
 const priceH=priceOn?105:0;descBox(left+32,infY,548,583-infY-priceH,([s.description,s.details].filter(Boolean).join('\n\n')),20);
 if(priceOn)priceBox(left+32,522,540,93);
 if(s.deadline)txt('Inscription avant le '+dateText(s.deadline),left+32,614,460,21,14,C.red,{bold:true});}
function information(){brandHeader('INFORMATIONS CSE',title,subtitle);const hasImage=!!(s.image||s.image2),x=hasImage?350:50,w=hasImage?800:1100;if(hasImage)photoPanel(s.image||s.image2,45,311,268,284);
 let top=317,bottom=s.highlight?514:590;rect(x-12,310,w+24,bottom-top+18,C.light,12);descBox(x,top,w,bottom-top,([s.description,s.details].filter(Boolean).join('\n\n')),21);
 if(s.highlight){rect(x-12,527,w+24,64,C.amber,10);fit(s.highlight,x+6,538,w-12,44,19,15,C.red,{bold:true,field:'message important'});}}
function partner(){brandHeader('PARTENAIRES',title,subtitle);const imgX=730,imgW=423;image(s.image,imgX,304,imgW,285);rect(50,304,652,281,C.light,12);descBox(67,320,612,s.highlight?137:227,s.description,22);if(s.highlight){rect(66,470,619,94,'#EFE9FD',10);fit(s.highlight,80,483,587,67,22,16,C.purple,{bold:true,field:'offre partenaire'});}if(s.code)pill('CODE : '+truncate(s.code,22),803,576,310,C.purple,15);if(s.deadline)txt('JUSQU’AU '+dateText(s.deadline).toUpperCase(),56,583,659,24,15,C.red,{bold:true});}
function poster(){brandHeader('ANIMATIONS',title,duration||subtitle);const withImage=!!s.image;if(withImage)image(s.image,46,311,460,295);const x=withImage?539:54,w=withImage?604:1093;rect(x-14,308,w+17,295,C.light,12);descBox(x+7,322,w-24,112,s.description,23);fit(s.details,x+7,442,w-24,130,20,15,C.blue,{field:'programme'});}
function agenda(table){brandHeader('À VENIR',title,subtitle||'PROGRAMME DES PROCHAINES ACTIVITÉS');const rows=(Array.isArray(s.agendaRows)?s.agendaRows:[]).filter(r=>r.title).slice(0,table?7:9),count=Math.max(rows.length,1);const top=310,areaH=table?245:278,gap=6,rowH=Math.min(50,(areaH-gap*(count-1))/count);
 if(table){rect(47,304,1106,33,C.dark,6);let heads=[['ACTIVITÉ',58,415],['LIEU',500,267],['TYPE',779,183],['DATE',983,159]];heads.forEach(a=>txt(a[0],a[1],309,a[2],23,14,C.white,{bold:true}));}
 rows.forEach((r,i)=>{const y=(table?346:316)+i*(rowH+gap);rect(47,y,1106,rowH,i%2?'#F4F8FC':'#EAF1FA',7);rect(47,y,6,rowH,i%3===0?C.green:C.blue);if(table){fit(r.title,60,y+8,420,rowH-12,18,14,C.dark,{bold:true,field:'activité'});fit(r.location,500,y+8,261,rowH-12,15,12,C.muted,{field:'lieu'});fit(r.status,779,y+8,186,rowH-12,15,12,C.blue,{field:'type'});fit(dateText(r.date),981,y+8,156,rowH-12,14,12,C.purple,{bold:true,field:'date'});}else{txt(dateText(r.date)||'DATE À PRÉCISER',62,y+8,210,rowH-12,16,C.purple,{bold:true});fit(r.title,270,y+5,575,rowH-10,20,15,C.dark,{bold:true,field:'intitulé'});fit(r.status||r.location,866,y+7,269,rowH-12,15,12,C.green,{bold:true,field:'lieu'});}});
 if(!rows.length)fit('Ajoute des activités dans le tableau ou importe les dates depuis la bibliothèque.',95,390,1010,100,22,17,C.muted,{align:'center',field:'programme'});
}
function rules(){brandHeader('MODALITÉS CSE',title,subtitle);if(s.highlight){rect(49,307,1102,67,C.coral,11);fit(s.highlight,68,315,1060,51,22,17,C.red,{bold:true,field:'alerte règlement'});}
 const txtFull=String(s.description||'')+'\n\n'+String(s.details||'');const paras=txtFull.split(/\n\n+/).filter(Boolean);let c1=[],c2=[],n1=0,n2=0;for(const par of paras){if(n1<=n2){c1.push(par);n1+=par.length;}else{c2.push(par);n2+=par.length;}}const y=s.highlight?386:313;rect(49,y,534,606-y,C.light,12);rect(614,y,537,606-y,C.light,12);fit(c1.join('\n\n'),66,y+17,502,600-y-12,18,14,C.ink,{field:'règlement'});fit(c2.join('\n\n'),631,y+17,505,600-y-12,18,14,C.ink,{field:'règlement'});}
function bannerShot(){topbar();}
switch(s.kind){
case 'cover':cover();break;
case 'newsgrid':listing(choose(s,all,cfg.newsletterDate,false),false);break;
case 'lastboard':listing(choose(s,all,cfg.newsletterDate,true),true);break;
case 'information':information();break;
case 'activity':activity();break;
case 'deadline':deadline();break;
case 'immersive':immersive();break;
case 'partner':partner();break;
case 'poster':poster();break;
case 'agenda':agenda(false);break;
case 'table':agenda(true);break;
case 'rules':rules();break;
default:topbar();headline(title);descBox(53,316,1085,260,s.description,22);
}
footer();return {width:W,height:H,items:E,url,costs:p,template:s.kind,warnings:[...new Set(warnings)]};
}
base.render=render;base.daysTo=daysTo;base.featureSelection=choose;
})(window);
