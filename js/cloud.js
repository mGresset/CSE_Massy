/* CSE Studio V4 · Bibliothèque partagée facultative.
   La clé publishable est publique. L'autorisation repose sur la RLS PostgreSQL,
   et non sur les boutons de cette interface. Aucune clé service_role ici. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const editor=window.CSEStudioV4Editor;
if(!editor)return;
const CONFIG_KEY='cse-studio:v4:cloud-config',SESSION_KEY='cse-studio:v4:cloud-session';
const validUrl=url=>{try{const v=new URL(url);return v.protocol==='https:'&&v.username===''&&v.password===''&&!v.search&&!v.hash?v.origin:''}catch{return ''}};
function readJson(store,k,fallback){try{return JSON.parse(store.getItem(k)||'null')||fallback}catch{return fallback}}
let config=window.CSE_CLOUD_CONFIG||readJson(localStorage,CONFIG_KEY,null),session=readJson(sessionStorage,SESSION_KEY,null);
let user=null,role=null,items=[],loaded=null,changed=false;
const allowedEdit=()=>role==='editor'||role==='admin',allowedApprove=()=>role==='reviewer'||role==='admin';
const statuses={draft:'Brouillon',review:'À relire',approved:'Approuvée'};
const cloudError=(err)=>{const v=String(err?.message||err||'Erreur inconnue');return v.length>270?v.slice(0,270)+'…':v};
function notice(msg,error=false){$('cloudNotice').textContent=msg;$('cloudNotice').classList.toggle('error',error)}
function headers(auth=true){const h={'apikey':config.key,'Content-Type':'application/json'};if(auth&&session?.access_token)h.Authorization='Bearer '+session.access_token;return h}
async function response(req){const type=req.headers.get('content-type')||'';const raw=await req.text();let body=raw;if(type.includes('json')){try{body=raw?JSON.parse(raw):null}catch{body=raw}}if(!req.ok)throw Error(body&&typeof body==='object'?(body.message||body.error_description||body.error||body.hint||'Erreur '+req.status):'Erreur HTTP '+req.status);return body}
function setSession(s){session={access_token:s.access_token,refresh_token:s.refresh_token,expires_at:s.expires_at||Math.floor(Date.now()/1000)+(s.expires_in||3600)};sessionStorage.setItem(SESSION_KEY,JSON.stringify(session))}
async function refreshSession(){if(!session?.refresh_token)throw Error('Session expirée, reconnecte-toi.');const r=await fetch(config.url+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:headers(false),body:JSON.stringify({refresh_token:session.refresh_token})});const data=await response(r);setSession(data)}
async function api(path,options={}){if(!config)throw Error('Configurer Supabase.');if(!session?.access_token)throw Error('Connexion requise.');if((session.expires_at||0)<Math.floor(Date.now()/1000)+45)await refreshSession();const r=await fetch(config.url+path,{...options,headers:{...headers(),...(options.headers||{})}});return response(r)}
function view(){const configured=!!(config?.url&&config?.key);const connected=!!(user&&role);
$('cloudLogin').classList.toggle('hidden',!configured||connected);
$('cloudConnected').classList.toggle('hidden',!connected);
$('cloudBadge').textContent=connected?({editor:'Rédacteur',reviewer:'Relecteur',admin:'Administrateur'}[role]):configured?'À connecter':'Non configuré';
$('cloudBadge').classList.toggle('connected',connected);
$('cloudWho').textContent=connected?user.email+' · '+({editor:'Rédacteur',reviewer:'Relecteur',admin:'Administrateur'}[role]):'';
$('cloudSave').disabled=!allowedEdit();$('cloudSubmitReview').disabled=!allowedEdit()||!loaded;
$('cloudApprove').disabled=!allowedApprove()||!loaded;
$('cloudDelete').disabled=role!=='admin'||!loaded;
$('cloudBatch').disabled=!connected;
$('cloudLoaded').textContent=loaded?'Fiche partagée sélectionnée · version '+loaded.version+(changed?' · modifications locales non synchronisées':' · synchronisée'):'Aucune fiche partagée sélectionnée · Enregistrer en ligne crée une activité.';
}
function reset(){user=null;role=null;items=[];loaded=null;changed=false;renderList();view()}
function signOut(){session=null;sessionStorage.removeItem(SESSION_KEY);reset();notice('Déconnecté de l’espace partagé. Les fiches locales restent disponibles.')}
async function restore(){if(!session?.access_token||!config)return;
 try{
  if(session.expires_at<Math.floor(Date.now()/1000)+45)await refreshSession();
  const raw=await fetch(config.url+'/auth/v1/user',{headers:headers()});user=await response(raw);
  const rows=await api('/rest/v1/cse_members?select=role&user_id=eq.'+encodeURIComponent(user.id));
  role=Array.isArray(rows)?rows[0]?.role:null;
  if(!role){signOut();notice('Compte reconnu, mais non autorisé : faire ajouter ton identifiant dans cse_members par un administrateur.',true);return}
  await sync();notice('Espace partagé connecté : '+user.email+'.');
 }catch(e){signOut();notice('Connexion impossible : '+cloudError(e),true)}
 view();
}
async function signIn(){if(!config)return notice('Renseigne d’abord la configuration Supabase.',true);
 const email=$('cloudEmail').value.trim();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return notice('Adresse e-mail invalide.',true);
 const btn=$('cloudSignIn');btn.disabled=true;
 try{
  const redirect=location.origin+location.pathname;
  const r=await fetch(config.url+'/auth/v1/otp?redirect_to='+encodeURIComponent(redirect),{method:'POST',headers:headers(false),body:JSON.stringify({email,create_user:false})});
  await response(r);notice('Lien de connexion demandé. Vérifie ta boîte mail (et les indésirables), puis ouvre le lien sur cet appareil.');
 }catch(e){notice('Échec de l’envoi : '+cloudError(e),true)}finally{btn.disabled=false}
}
function fromHash(){const p=new URLSearchParams(location.hash.slice(1));if(p.has('access_token')&&p.has('refresh_token')){
 setSession({access_token:p.get('access_token'),refresh_token:p.get('refresh_token'),expires_in:Number(p.get('expires_in'))||3600});
 history.replaceState(null,'',location.pathname+location.search);notice('Lien de connexion reçu. Vérification des droits…');return true;
 }if(p.has('error_description')){notice('Authentification : '+p.get('error_description'),true);history.replaceState(null,'',location.pathname+location.search)}return false}
async function sync(){if(!role)return;
 const data=await api('/rest/v1/cse_activities?select=id,title,payload,editorial_status,version,updated_at,approved_at&order=updated_at.desc&limit=250');items=Array.isArray(data)?data:[];renderList();view();return items}
function renderList(){const root=$('cloudList');root.replaceChildren();const term=$('cloudSearch').value.trim().toLocaleLowerCase('fr');const matches=items.filter(r=>(r.title+' '+(r.payload?.location||'')).toLocaleLowerCase('fr').includes(term));
 if(!matches.length){const p=document.createElement('p');p.className='library-empty';p.textContent='Aucune fiche partagée à afficher.';root.append(p);return}
 matches.forEach(r=>{
 const card=document.createElement('div');card.className='cloud-item';
 const info=document.createElement('div');info.className='cloud-item-info';const title=document.createElement('strong');title.textContent=r.title;
 const desc=document.createElement('small');desc.textContent=(statuses[r.editorial_status]||r.editorial_status)+' · v'+r.version+' · '+new Date(r.updated_at).toLocaleDateString('fr-FR');info.append(title,desc);
 const open=document.createElement('button');open.type='button';open.textContent='Ouvrir';open.onclick=()=>{if(changed&&!confirm('Des modifications non synchronisées seront perdues. Continuer ?'))return;loaded={id:r.id,version:r.version};changed=false;const a={...r.payload,title:r.title,editorialStatus:r.editorial_status};editor.setActivity(a);changed=false;view();notice('Fiche partagée chargée. Les modifications doivent être enregistrées en ligne.')};card.append(info,open);root.append(card)
 })
}
async function optimizedImage(data){if(!/^data:image\/(png|jpeg|webp);base64,/i.test(data||''))return '';
 return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{
 try{let w=img.width,h=img.height;const max=1500,s=Math.min(1,max/Math.max(w,h));w=Math.max(1,Math.round(w*s));h=Math.max(1,Math.round(h*s));const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.drawImage(img,0,0,w,h);let v=canvas.toDataURL('image/jpeg',.78);if(v.length>650000)v=canvas.toDataURL('image/jpeg',.56);resolve(v)}catch(e){reject(e)}
 };img.onerror=()=>reject(Error('Photo non décodable.'));img.src=data})
}
async function prepare(a){const result=JSON.parse(JSON.stringify(a));for(const field of ['photoData','photo2Data'])if(result[field])result[field]=await optimizedImage(result[field]);return result}
async function saveCloud(){if(!allowedEdit())return notice('Seuls les rédacteurs et administrateurs peuvent enregistrer en ligne.',true);
 const current=editor.getActivity();if(!current.title.trim())return notice('Le titre est obligatoire.',true);
 const button=$('cloudSave');button.disabled=true;notice('Enregistrement sécurisé en cours…');
 try{
  const payload=await prepare(current);
  const status=current.editorialStatus==='approved'?'review':current.editorialStatus;
  const body=JSON.stringify({title:current.title,payload,editorial_status:status});
  let rows;
  if(loaded){rows=await api('/rest/v1/cse_activities?id=eq.'+encodeURIComponent(loaded.id)+'&version=eq.'+loaded.version+'&select=id,version,editorial_status',{method:'PATCH',headers:{Prefer:'return=representation'},body});
   if(!rows?.length)throw Error('Conflit de version : un autre bénévole a modifié la fiche. Synchronise et compare avant de réessayer.');}
  else{rows=await api('/rest/v1/cse_activities?select=id,version,editorial_status',{method:'POST',headers:{Prefer:'return=representation'},body})}
  const row=rows?.[0];if(!row)throw Error('Aucune activité enregistrée. Vérifier les permissions du compte.');
  loaded={id:row.id,version:row.version};changed=false;await sync();notice('Fiche enregistrée dans la bibliothèque partagée · version '+row.version+'.');
 }catch(e){notice('Enregistrement en ligne impossible : '+cloudError(e),true)}finally{view()}
}
async function changeStatus(status){if(!loaded)return notice('Ouvre une fiche partagée avant de modifier son statut.',true);
 if(changed)return notice('Enregistre d’abord tes modifications avant de modifier le statut en ligne.',true);
 if(status==='approved'&&!allowedApprove())return notice('Seul un relecteur ou un administrateur peut approuver.',true);
 if(status==='review'&&!allowedEdit()&&!allowedApprove())return notice('Rôle insuffisant.',true);
 if(status==='approved'&&editor.getPreflight().blocking.length)return notice('Corrige les champs obligatoires avant approbation.',true);
 try{
  const rows=await api('/rest/v1/cse_activities?id=eq.'+encodeURIComponent(loaded.id)+'&version=eq.'+loaded.version+'&select=id,version,editorial_status',{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({editorial_status:status})});
  if(!rows?.length)throw Error('Version modifiée par un autre bénévole. Synchronise.');
  loaded.version=rows[0].version;changed=false;await sync();
  const a=editor.getActivity();a.editorialStatus=rows[0].editorial_status;editor.setActivity(a);changed=false;
  notice(status==='approved'?'Activité approuvée dans l’espace partagé.':'Activité soumise à relecture en ligne.');
 }catch(e){notice('Validation impossible : '+cloudError(e),true)}finally{view()}
}
async function deleteCloud(){if(role!=='admin'||!loaded)return;
 if(!confirm('Supprimer définitivement cette activité de l’espace partagé ?'))return;
 try{
  const rows=await api('/rest/v1/cse_activities?id=eq.'+encodeURIComponent(loaded.id)+'&version=eq.'+loaded.version+'&select=id',{method:'DELETE',headers:{Prefer:'return=representation'}});
  if(!rows?.length)throw Error('Version modifiée ou suppression refusée.');loaded=null;changed=false;await sync();notice('Fiche supprimée de la bibliothèque partagée.');
 }catch(e){notice('Suppression impossible : '+cloudError(e),true)}finally{view()}
}
async function batchCloud(){try{
 const rows=(await sync()).filter(r=>r.editorial_status==='approved').map(r=>({...r.payload,title:r.title,editorialStatus:r.editorial_status}));
 if(!rows.length)throw Error('Aucune fiche approuvée en ligne.');
 await editor.exportCloudBatch(rows);
 }catch(e){notice('Export groupé impossible : '+cloudError(e),true)}
}
function applyConfig(){const url=validUrl($('cloudUrl').value.trim()),key=$('cloudKey').value.trim();if(!url||!key||/service_role|sb_secret_/i.test(key))return notice('URL HTTPS ou clé publique incorrecte. Ne jamais utiliser la clé service_role / sb_secret.',true);
 config={url,key};localStorage.setItem(CONFIG_KEY,JSON.stringify(config));signOut();view();notice('Configuration publique enregistrée sur ce navigateur. Connecte-toi avec un compte autorisé.');$('cloudSettings').open=false}
$('cloudApplyConfig').addEventListener('click',applyConfig);$('cloudSignIn').addEventListener('click',signIn);$('cloudSignOut').addEventListener('click',signOut);
$('cloudRefresh').addEventListener('click',()=>sync().then(()=>notice('Bibliothèque synchronisée.')).catch(e=>notice(cloudError(e),true)));
$('cloudSave').addEventListener('click',saveCloud);$('cloudSubmitReview').addEventListener('click',()=>changeStatus('review'));
$('cloudApprove').addEventListener('click',()=>changeStatus('approved'));$('cloudDelete').addEventListener('click',deleteCloud);
$('cloudBatch').addEventListener('click',batchCloud);$('cloudSearch').addEventListener('input',renderList);
window.addEventListener('beforeunload',e=>{if(changed&&loaded){e.preventDefault();e.returnValue=''}});
window.addEventListener('input',e=>{if(loaded&&(e.target?.closest('#activityForm')||e.target?.closest('#rateInputs'))){changed=true;view()}});
$('templateGallery').addEventListener('click',()=>{if(loaded){changed=true;view()}});
$('photoFile').addEventListener('change',()=>{if(loaded){changed=true;view()}});
$('photo2File').addEventListener('change',()=>{if(loaded){changed=true;view()}});
$('newActivity').addEventListener('click',()=>{loaded=null;changed=false;view()});
$('duplicateActivity').addEventListener('click',()=>{loaded=null;changed=false;view()});
$('activityLibrary').addEventListener('click',()=>{loaded=null;changed=false;view()});
$('importProject').addEventListener('change',()=>{loaded=null;changed=false;view()});
if(config?.url){$('cloudUrl').value=config.url;$('cloudKey').value=config.key}else{$('cloudSettings').open=true}
fromHash();view();restore();
window.CSECloudV4={getState:()=>({configured:!!config,connected:!!role,role,count:items.length,loaded:loaded?.id||null}),refresh:sync};
})();
