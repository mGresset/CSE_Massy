/* CSE Studio V5 — publication Canva via une Supabase Edge Function facultative.
   Aucun secret Canva n'est stocké ici. Sans configuration, le site reste en mode PPTX manuel. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const TARGET_KEY='cse-studio-massy:v5:canva-target';
const DEFAULT_URL='https://canva.link/rewv8gx5iilr8kz';
const MIME='application/vnd.openxmlformats-officedocument.presentationml.presentation';
const controls={url:$('canvaTargetUrl'),designId:$('canvaTargetId'),save:$('canvaSaveTarget'),open:$('canvaOpenTarget'),openTop:$('canvaOpenHeader'),publish:$('publishCanva'),notice:$('canvaPublishNotice')};
if(Object.values(controls).some(x=>!x))return;
function notify(text,kind=''){controls.notice.textContent=text;controls.notice.className='canva-notice '+kind}
function properUrl(value){try{const url=new URL(value);return url.protocol==='https:'&&(/(^|\.)canva\.link$|(^|\.)canva\.com$/i.test(url.hostname))&&!url.username&&!url.password?url.href:''}catch{return ''}}
function properId(value){return /^[A-Za-z0-9_-]{8,80}$/.test(value)?value:''}
function extractId(url){const match=String(url).match(/canva\.com\/design\/([A-Za-z0-9_-]+)/i);return match?.[1]||''}
function settings(){return {link:properUrl(controls.url.value.trim()),id:properId(controls.designId.value.trim())}}
function applyLinks(){const cfg=settings();const url=cfg.link||DEFAULT_URL;controls.open.href=url;controls.openTop.href=url;controls.open.title='Ouvrir '+url;return cfg}
function load(){let cfg=null;try{cfg=JSON.parse(localStorage.getItem(TARGET_KEY)||'null')}catch{};controls.url.value=cfg?.link||DEFAULT_URL;controls.designId.value=cfg?.id||'';applyLinks()}
function save(){const cfg=settings();if(!cfg.link){notify('Utilise une URL Canva HTTPS valide : canva.link ou canva.com.','error');return}
 localStorage.setItem(TARGET_KEY,JSON.stringify(cfg));applyLinks();notify(cfg.id?'Destination enregistrée. Vérifie que l’ID est celui autorisé dans Supabase.':'Lien enregistré. Pour activer la publication automatique, renseigner également l’ID complet du design Canva.','success')}
async function call(ctx,mode,{body,method='GET',jobId}={}){
 const url=new URL(ctx.url+'/functions/v1/canva-publish');url.searchParams.set('mode',mode);if(jobId)url.searchParams.set('job_id',jobId);
 const opts={method,headers:{apikey:ctx.key,Authorization:'Bearer '+ctx.token,'X-CSE-Activity-Id':ctx.id,'X-CSE-Activity-Version':String(ctx.version),'X-Canva-Design-Id':settings().id}};
 if(body){opts.body=body;opts.headers['Content-Type']=body instanceof Blob?MIME:'application/json'}
 let resp;try{resp=await fetch(url,opts)}catch(err){throw Error('Fonction Supabase inaccessible. Vérifier son déploiement et la connexion réseau. '+err.message)}
 const txt=await resp.text();let data;try{data=JSON.parse(txt)}catch{data={message:txt.slice(0,250)}}
 if(!resp.ok)throw Error(data.message||data.error||'Erreur HTTP '+resp.status);
 return data;
}
function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
async function poll(ctx,mode,jobId){
 if(!/^[A-Za-z0-9_-]{6,128}$/.test(jobId||''))throw Error('Identifiant de tâche Canva invalide.');
 for(let i=0;i<60;i++){
   const response=await call(ctx,mode,{jobId});const job=response.job||{};
   if(job.status==='success')return job;
   if(job.status==='failed')throw Error('Échec Canva : '+(job.error?.message||job.error?.code||'tâche refusée'));
   if(!['in_progress','queued','pending'].includes(job.status))throw Error('Statut Canva inconnu : '+(job.status||'vide'));
   await wait(2500);
 }
 throw Error('La tâche Canva est toujours en cours. Ne relance pas immédiatement la publication : vérifie d’abord les pages du document cible.');
}
async function publish(){
 const btn=controls.publish;
 const cfg=settings();
 if(!cfg.link)return notify('Renseigne une URL Canva valide puis mémorise-la.','error');
 if(!cfg.id)return notify('Un lien de partage seul ne suffit pas : renseigne l’ID du design Canva (URL complète /design/ID/).','error');
 if(!window.CSECloudV4?.getPublishContext)return notify('L’espace partagé V4 n’est pas chargé. Configure Supabase et connecte un compte autorisé.','error');
 if(!window.CSEStudioV5Export)return notify('Générateur PowerPoint V5 non chargé. Actualise avec Ctrl+Maj+R.','error');
 let ctx;
 try{ctx=await window.CSECloudV4.getPublishContext()}catch(err){return notify(err.message,'error')}
 if(!confirm('Ajouter une nouvelle slide au Canva autorisé ?\n\nCette opération modifie la présentation du CSE et peut consommer des crédits d’API.'))return;
 btn.disabled=true;btn.textContent='Publication en cours…';
 try{
  notify('1/4 — Création du PowerPoint modifiable…');
  const report=await window.CSEStudioV5Export();
  if(report.warnings.length&&!confirm('Certaines images sont indisponibles. Publier tout de même ?\n'+report.warnings.slice(0,3).join('\n')))return notify('Publication annulée : vérifier les images avant diffusion.','error');
  if(report.blob.size>18*1024*1024)throw Error('Le PowerPoint dépasse 18 Mo. Réduire la taille des images.');
  notify('2/4 — Import du PowerPoint dans Canva…');
  const job1=await call(ctx,'import',{method:'POST',body:report.blob});
  if(!job1.job?.id)throw Error('Canva n’a pas retourné de numéro d’import.');
  const imported=job1.job.status==='success'?job1.job:await poll(ctx,'import-status',job1.job.id);
  const design=imported.result?.designs?.[0];
  if(!design?.id)throw Error('Canva n’a pas retourné de design importé.');
  notify('3/4 — Insertion de la nouvelle page dans le Canva cible…');
  const job2=await call(ctx,'merge',{method:'POST',body:JSON.stringify({source_design_id:design.id})});
  if(!job2.job?.id)throw Error('Canva n’a pas retourné de numéro de fusion.');
  const merged=job2.job.status==='success'?job2.job:await poll(ctx,'merge-status',job2.job.id);
  notify('✓ La diapositive a été ajoutée au Canva cible. Ouvre la présentation et vérifie son rendu avant publication aux bénéficiaires.','success');
  applyLinks();
 }catch(err){console.error('Publication Canva',err);notify('Publication non confirmée : '+err.message+'\nSi l’import a déjà eu lieu, vérifier la présentation avant de retenter.','error')}
 finally{btn.disabled=false;btn.textContent='➕ Ajouter la diapositive à Canva'}
}
controls.save.addEventListener('click',save);controls.publish.addEventListener('click',publish);
controls.url.addEventListener('input',()=>{const id=extractId(controls.url.value);if(id&&!controls.designId.value.trim())controls.designId.value=id;applyLinks()});
load();window.CSEStudioV5Canva={getSettings:settings,extractId,properUrl,properId};
})();
