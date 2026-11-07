/* CSE Studio V9.5 — sécurisation du MEL hebdomadaire et édition durable. */
'use strict';
const { assert, test, done } = require('./lib/assert-ext');
const { load } = require('./lib/env');
const C = load();
const M = C.model, CO = C.compose;
const REF = '2026-11-09';
const OLD = '2026-08-01T10:00:00.000Z';
function activity(o) { return M.normalizeItem(Object.assign({ type:'activity',title:'Voyage',createdAt: OLD,dateStart:'2027-02-10',regEnd:'2026-11-13' },o||{})); }
function project(items) { const p = M.blankProject(); p.items = items; return p; }

test('V9.5 — déplacer une page adjacente vers le bas fonctionne, sans changer de rubrique', () => {
  const a = activity({title:'A',regEnd:'2026-12-10'}), b=activity({title:'B',regEnd:'2026-12-12'});
  const cal=M.normalizeItem({type:'calendar',title:'Permanence',calendar:{month:'2026-11'}});
  const p=project([a,b,cal]),is=M.blankIssue(REF);
  const pages=[M.blankPage('cover'),M.blankPage('item',{itemId:cal.id}),M.blankPage('item',{itemId:a.id}),M.blankPage('item',{itemId:b.id})];
  assert.equal(CO.moveWithinSection(pages,2,3,p,is),true);
  assert.deepEqual(pages.slice(2).map(x=>x.itemId),[b.id,a.id]);
  assert.equal(CO.moveWithinSection(pages,3,2,p,is),true);
  assert.deepEqual(pages.slice(2).map(x=>x.itemId),[a.id,b.id]);
  assert.equal(CO.moveWithinSection(pages,1,2,p,is),false);
  assert.equal(CO.moveWithinSection(pages,0,1,p,is),false);
});

test('V9.5 — sélection manuelle vide des nouveautés/dernières chances reste vide', () => {
  const p=project([activity({editorial:'new',regEnd:'2026-11-30'})]);
  const is=M.blankIssue(REF);
  const news=M.blankPage('news');news.opts.auto=false;news.opts.ids=[];
  assert.deepEqual(CO.selection(news,p,is),[]);
  const cover=M.blankPage('cover');cover.opts.newsAuto=false;cover.opts.newsIds=[];
  assert.deepEqual(CO.coverData(cover,p,is).news,[]);
  const last=M.blankPage('last');last.opts.auto=false;last.opts.ids=[];
  assert.deepEqual(CO.selection(last,p,is),[]);
});

test('V9.5 — « Complet » prime sur « Nouveauté », sans exposition en couverture', () => {
  const it=activity({editorial:'new',regStatus:'full',regEnd:'2026-12-20'});
  const p=project([it]),is=M.blankIssue(REF);
  assert.equal(CO.classify(it,REF,p.settings).rubric,'full');
  assert.equal(CO.coverData(M.blankPage('cover'),p,is).news.length,0);
});

test('V9.5 — une dernière chance forcée ne réactive pas une échéance passée', () => {
  const it=activity({regEnd:'2026-11-01',regStatus:'open',forceLast:true});
  const p=project([it]);
  const cls=CO.classify(it,REF,p.settings);
  assert.equal(cls.isLast,false);
  assert.ok(CO.checkItem(it,p,REF).some(x=>/statut/.test(x[1])));
});

test('V9.5 — les liens configurés non HTTP(S) sont neutralisés sans supprimer le portail officiel', () => {
  const it=activity({link:{type:'portal'}});
  assert.equal(CO.linkOf(it,{portalUrl:'javascript:alert(1)'}),M.PORTAL);
  assert.equal(CO.linkOf(activity({link:{type:'custom',url:'data:text/html,ok'}}),{portalUrl:M.PORTAL}), '');
  assert.equal(CO.linkOf(activity({link:{type:'custom',url:'https://example.org/activite'}}),{}),'https://example.org/activite');
});

test('V9.5 — le MEL édité reste structuré après actualisation sans perdre les modifications', () => {
  const cal=M.normalizeItem({type:'calendar',title:'Permanence'}), info=M.normalizeItem({type:'info',title:'Important'}),
    act=activity({title:'Voyage à venir',regEnd:'2026-12-20'}),rules=M.normalizeItem({type:'rules',title:'Règlement'});
  const p=project([cal,info,act,rules]),issue=M.blankIssue(REF);
  issue.pages=CO.autoCompose(p,issue);
  const page=issue.pages.find(x=>x.itemId===act.id);
  page.opts.useOverrides=true;page.opts.override={title:'Voyage pour le MEL du lundi'};
  page.included=false;
  const result=CO.refreshPreservingEdits(p,issue);
  assert.strictEqual(result.find(x=>x.id===page.id),page);
  assert.equal(result.find(x=>x.id===page.id).opts.override.title,'Voyage pour le MEL du lundi');
  assert.equal(result.find(x=>x.id===page.id).included,false);
  assert.equal(result[0].kind,'cover');
  assert.equal(result[1].itemId,cal.id);
  assert.equal(result[result.length-1].itemId,rules.id);
});

test('V9.5 — les tarifs conservent les dix tranches et le tarif extérieur sans changement de calcul', () => {
  const p=M.blankProject();
  const result=C.pricing.fromPricing({enabled:true,mode:'tranches',outside:2400},p.settings);
  assert.equal(result.rows.length,10);
  assert.equal(result.rows[0].price,720);
  assert.equal(result.rows[9].price,1800);
  assert.equal(result.outside,2400);
  const gb=new C.layout.Builder({});
  const size=gb.priceGridSize(result,465);
  assert.equal(size.rows,3);
  assert.equal(size.cols,4);
});

done('V9.5 — sécurisation des rubriques, sauvegardes, sélection et tarifs');
