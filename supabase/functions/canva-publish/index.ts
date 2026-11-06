/** CSE Studio — EXPÉRIMENTAL, NON BRANCHÉ SUR L'INTERFACE V9 ET NON DÉMONTRÉ.
 * Ébauche de fonction serveur (Supabase Edge Function) pour ajouter une diapositive à une présentation Canva :
 * import du PPTX (POST /v1/imports) puis insertion des pages (POST /v1/merges, type modify_existing_design,
 * opération insert_pages). Prérequis vérifiés dans la documentation Canva Connect (novembre 2026) :
 *  - l'API « merges » est en PRÉVERSION (une application publique l'utilisant ne passe pas la revue Canva) ;
 *  - authentification OAuth d'une « service app » (client_credentials, scopes service:*) avec crédits API de l'équipe ;
 *  - un lien de partage canva.link « modifiable » ne donne AUCUNE autorisation API.
 * Ne pas déployer sans accord du CSE, compte Canva habilité, tests sur un design de test et revue de sécurité.
 */
/** CSE Studio V5 — Canva publication, Supabase Edge Function.
 * Prerequisites: Supabase Auth + cse_members/cse_activities from V4;
 * Canva SERVICE app eligible and granted the required service scopes.
 * No Canva client credentials in GitHub Pages or the user's browser.
 * API merge endpoint is PREVIEW and may not be available for this team.
 */
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const CLIENT_ID = Deno.env.get('CANVA_CLIENT_ID') || '';
const CLIENT_SECRET = Deno.env.get('CANVA_CLIENT_SECRET') || '';
const TARGET_DESIGN_ID = Deno.env.get('CANVA_TARGET_DESIGN_ID') || '';
const ALLOWED_ORIGIN = Deno.env.get('CSE_ALLOWED_ORIGIN') || 'https://mgresset.github.io';
const API = 'https://api.canva.com/rest/v1';
const DESIGN_ID = /^[A-Za-z0-9_-]{8,80}$/;
const JOB_ID = /^[A-Za-z0-9_-]{6,128}$/;
const UUID = /^[0-9a-fA-F-]{36}$/;
const MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
const CORS = { 'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods':'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-cse-activity-id, x-cse-activity-version, x-canva-design-id',
  'Access-Control-Max-Age':'3600',
  'Vary':'Origin' };
function reply(body:unknown,status=200){ return new Response(JSON.stringify(body),{status,headers:{...CORS,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}}) }
class HttpError extends Error { constructor(public status:number,message:string){ super(message) } }
async function bodyJson(res:Response){const t=await res.text();try{return JSON.parse(t)}catch{return {message:t.slice(0,400)}}}
function base64Utf8(value:string){const bytes=new TextEncoder().encode(value);let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s)}
async function getUserRole(req:Request){
 const header=req.headers.get('authorization')||'';
 if(!header.startsWith('Bearer ')||!SUPABASE_URL||!SUPABASE_ANON_KEY)throw new HttpError(401,'Connexion Supabase obligatoire.');
 const headers={ apikey:SUPABASE_ANON_KEY, Authorization:header };
 const r=await fetch(SUPABASE_URL+'/auth/v1/user',{headers});
 if(!r.ok)throw new HttpError(401,'Session Supabase expirée ou invalide.');
 const user=await bodyJson(r);
 if(!user?.id||!UUID.test(user.id))throw new HttpError(401,'Compte utilisateur inconnu.');
 const u=new URL(SUPABASE_URL+'/rest/v1/cse_members');u.searchParams.set('select','role');u.searchParams.set('user_id','eq.'+user.id);
 const roles=await fetch(u,{headers});if(!roles.ok)throw new HttpError(403,'Impossible de vérifier les rôles CSE.');
 const data=await bodyJson(roles);const role=Array.isArray(data)?data[0]?.role:null;
 if(!['reviewer','admin'].includes(role))throw new HttpError(403,'Publication réservée aux relecteurs et administrateurs du CSE.');
 return {headers,user,role};
}
async function approvedActivity(req:Request,headers:Record<string,string>){
 const activityId=req.headers.get('x-cse-activity-id')||'';
 const version=req.headers.get('x-cse-activity-version')||'';
 if(!UUID.test(activityId)||!/^[1-9]\d*$/.test(version))throw new HttpError(400,'Identifiant et version de la fiche partagée requis.');
 const u=new URL(SUPABASE_URL+'/rest/v1/cse_activities');u.searchParams.set('select','id,title,version,editorial_status');u.searchParams.set('id','eq.'+activityId);u.searchParams.set('version','eq.'+version);u.searchParams.set('editorial_status','eq.approved');
 const r=await fetch(u,{headers});if(!r.ok)throw new HttpError(403,'Lecture de la fiche CSE refusée.');
 const rows=await bodyJson(r);if(!Array.isArray(rows)||rows.length!==1)throw new HttpError(409,'Fiche absente, non approuvée, ou modifiée depuis le chargement.');
 return rows[0];
}
async function canvaToken(){
 const r=await fetch(API+'/oauth/token',{method:'POST',headers:{
  Authorization:'Basic '+btoa(CLIENT_ID+':'+CLIENT_SECRET),'Content-Type':'application/x-www-form-urlencoded'
 },body:new URLSearchParams({grant_type:'client_credentials'})});
 const data=await bodyJson(r);if(!r.ok||!data.access_token)throw new HttpError(502,'Connexion à Canva refusée : '+(data.message||data.code||r.status));
 return data.access_token as string;
}
async function canvaRequest(token:string,endpoint:string,options:RequestInit={}){
 const r=await fetch(API+endpoint,{...options,headers:{Authorization:'Bearer '+token,...(options.headers||{})}});
 const data=await bodyJson(r);if(!r.ok)throw new HttpError(502,'Canva '+r.status+' : '+(data.message||data.code||'erreur API'));
 return data;
}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:CORS});
 const origin=req.headers.get('origin');if(origin&&origin!==ALLOWED_ORIGIN)return reply({message:'Origine non autorisée.'},403);
 if(!CLIENT_ID||!CLIENT_SECRET||!DESIGN_ID.test(TARGET_DESIGN_ID))return reply({message:'Intégration Canva non configurée : CLIENT_ID, CLIENT_SECRET ou TARGET_DESIGN_ID manquant.'},503);
 try{
  const {headers}=await getUserRole(req);
  const designId=req.headers.get('x-canva-design-id')||'';
  if(designId!==TARGET_DESIGN_ID)throw new HttpError(403,'Cette présentation Canva ne correspond pas à la destination autorisée. Contacter l’administrateur.');
  const activity=await approvedActivity(req,headers);
  const url=new URL(req.url),mode=url.searchParams.get('mode');
  if(mode==='health')return reply({configured:true,target:TARGET_DESIGN_ID,role:'publisher'});
  const token=await canvaToken();
  if(mode==='import'&&req.method==='POST'){
   if(req.headers.get('content-type')?.split(';')[0]!==MIME)throw new HttpError(415,'Fichier PowerPoint attendu.');
   const bytes=await req.arrayBuffer();if(!bytes.byteLength||bytes.byteLength>18*1024*1024)throw new HttpError(413,'Fichier trop volumineux (max. 18 Mo).');
   const title=String(activity.title||'Activité CSE').slice(0,50);
   return reply(await canvaRequest(token,'/imports',{method:'POST',headers:{'Content-Type':'application/octet-stream','Import-Metadata':JSON.stringify({title_base64:base64Utf8(title),mime_type:MIME})},body:bytes}));
  }
  if(mode==='import-status'&&req.method==='GET'){
   const jobId=url.searchParams.get('job_id')||'';if(!JOB_ID.test(jobId))throw new HttpError(400,'Identifiant de tâche invalide.');
   return reply(await canvaRequest(token,'/imports/'+encodeURIComponent(jobId)));
  }
  if(mode==='merge'&&req.method==='POST'){
   const body=await req.json().catch(()=>null);
   const sourceId=body?.source_design_id||'';
   if(!DESIGN_ID.test(sourceId))throw new HttpError(400,'Identifiant de la diapositive source invalide.');
   return reply(await canvaRequest(token,'/merges',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'modify_existing_design',design_id:TARGET_DESIGN_ID,operations:[{type:'insert_pages',source:{type:'design',design_id:sourceId}}]})}));
  }
  if(mode==='merge-status'&&req.method==='GET'){
   const jobId=url.searchParams.get('job_id')||'';if(!JOB_ID.test(jobId))throw new HttpError(400,'Identifiant de tâche invalide.');
   return reply(await canvaRequest(token,'/merges/'+encodeURIComponent(jobId)));
  }
  throw new HttpError(404,'Opération inconnue.');
 }catch(err){if(err instanceof HttpError)return reply({message:err.message},err.status);
  console.error('[CSE Canva] Erreur de publication',err instanceof Error?err.message:String(err));return reply({message:'Erreur de publication. Vérifier le journal de la fonction serveur.'},500)}
});
