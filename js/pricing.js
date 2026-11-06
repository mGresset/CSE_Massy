/* CSE Studio · Calcul des tarifs, indépendant de l'interface et testable avec Node. */
(function(root){
'use strict';
const DEFAULT_RATES=[70,65,60,55,50,45,40,35,30,25];
function finite(v,fallback=0){const n=typeof v==='string'?Number(v.replace(',','.')):Number(v);return Number.isFinite(n)?n:fallback}
function boundedRate(v){return Math.min(100,Math.max(0,finite(v)))}
function euroRound(v){return Math.round((finite(v)+Number.EPSILON)*100)/100}
function compute(basePrice,mode='tranches',rates=DEFAULT_RATES,fixedRate=50,fixedEuro=0){
 const base=Math.max(0,finite(basePrice));
 if(mode==='tranches')return Array.from({length:10},(_,i)=>{
   const subsidy=boundedRate((rates||[])[i]??DEFAULT_RATES[i]);
   return {label:'T'+(i+1),subsidy,employeePercent:euroRound(100-subsidy),price:euroRound(base*(100-subsidy)/100)};
 });
 if(mode==='fixedSubsidy'){
   const subsidy=boundedRate(fixedRate);
   return [{label:'Tarif CSE',subsidy,employeePercent:euroRound(100-subsidy),price:euroRound(base*(100-subsidy)/100)}];
 }
 if(mode==='fixedEmployee'){
   const employeePercent=boundedRate(fixedRate);return [{label:'Tarif CSE',subsidy:euroRound(100-employeePercent),employeePercent,price:euroRound(base*employeePercent/100)}];
 }
 if(mode==='fixedEuro'){
   const price=Math.max(0,finite(fixedEuro));return [{label:'Tarif CSE',subsidy:base?euroRound(100*(1-price/base)):null,employeePercent:base?euroRound(100*price/base):null,price:euroRound(price)}];
 }
 throw new Error('Mode tarifaire inconnu : '+mode);
}
function frMoney(value){return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(finite(value))}
function toFrDate(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value||'')))return '';const[y,m,d]=value.split('-').map(Number);const date=new Date(y,m-1,d);if(date.getFullYear()!==y||date.getMonth()+1!==m||date.getDate()!==d)return '';return new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'long',year:'numeric'}).format(date)}
function dateRange(start,end){if(!start&&!end)return 'DATES À CONFIRMER';if(start&&!end)return 'LE '+toFrDate(start).toUpperCase();if(!start&&end)return 'JUSQU’AU '+toFrDate(end).toUpperCase();if(start===end)return 'LE '+toFrDate(start).toUpperCase();return 'DU '+toFrDate(start).replace(/\s\d{4}$/,'') .toUpperCase()+' AU '+toFrDate(end).toUpperCase()}
const api={DEFAULT_RATES,finite,boundedRate,euroRound,compute,frMoney,toFrDate,dateRange};
if(typeof module!=='undefined'&&module.exports)module.exports=api;root.CSEPricing=api;
})(typeof window!=='undefined'?window:globalThis);
