/* Tests de parcours dans un VRAI navigateur (Edge ou Chrome, sans dépendance npm) + captures d'écran.
 * Usage : node tests/e2e/ui-check.js [dossier-captures] [chemin/vers/msedge.exe|chrome]
 * - sert le dépôt sous /CSE_Massy/ (comme GitHub Pages) sur un port local ;
 * - pilote le navigateur via le protocole DevTools (WebSocket natif de Node ≥ 22) ;
 * - mode démonstration (?demo=1) : données fictives, rien n'est enregistré dans le navigateur.
 * Vérifie : A05 duplication 46→47 + rapport, A03 personnalisation « cette semaine », A10 ordre éditorial,
 * D01 dates, D02 calendrier sans saut de défilement, C05 photo Web non importée signalée, contrôle final. */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os'), { spawn } = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'cse-ui-captures'));
const BROWSER = process.argv[3] || ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => fs.existsSync(p));
if (!BROWSER) { console.error('Navigateur introuvable : indiquer le chemin de msedge/chrome en 2e argument.'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (!u.startsWith('/CSE_Massy/')) { res.writeHead(404); return res.end(); }
  const f = path.join(ROOT, u.slice('/CSE_Massy/'.length) || 'index.html');
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
function check(name, ok, detail) { results.push({ name, ok: !!ok, detail }); console.log((ok ? '✓ ' : '✗ ') + name + (detail ? ' — ' + detail : '')); }

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port, dbg = 9300 + Math.floor(Math.random() * 500);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cse-e2e-'));
  const proc = spawn(BROWSER, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=' + dbg, '--user-data-dir=' + profile, '--window-size=1600,1000', 'about:blank'], { stdio: 'ignore' });
  let targets = null;
  for (let i = 0; i < 50 && !targets; i++) { try { targets = await (await fetch('http://127.0.0.1:' + dbg + '/json')).json(); } catch (e) { await sleep(200); } }
  const page = targets.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0; const pending = {};
  ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending[m.id]) { pending[m.id](m); delete pending[m.id]; } });
  const send = (method, params) => new Promise((resolve) => { const i = ++id; pending[i] = resolve; ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
  const evaluate = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: '(async () => {' + expr + '})()', awaitPromise: true, returnByValue: true });
    if (r.result && r.result.exceptionDetails) throw Error(r.result.exceptionDetails.exception ? r.result.exceptionDetails.exception.description : r.result.exceptionDetails.text);
    return r.result && r.result.result ? r.result.result.value : undefined;
  };
  const shot = async (name) => {
    const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(OUT, name), Buffer.from(r.result.data, 'base64'));
  };
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.enable'); await send('Runtime.enable');
  const base = 'http://127.0.0.1:' + port + '/CSE_Massy/index.html?demo=1';
  await send('Page.navigate', { url: base + '#/mels' });
  await sleep(2500);
  const errors = [];
  await evaluate("window.__errs = []; window.addEventListener('error', e => window.__errs.push(e.message)); window.addEventListener('unhandledrejection', e => window.__errs.push(String(e.reason && e.reason.message || e.reason)));");
  // Le téléchargement réel est remplacé par une inspection du fichier produit (aucun fichier écrit).
  await evaluate("CSE.ui.download = function (b, n) { window.__download = { name: n, size: b.size || 0, blob: b }; };");

  check('Mes MEL affiché', await evaluate("return /Mes MEL/.test(document.querySelector('h1').textContent) && document.querySelectorAll('.mel-row').length >= 1"));
  await shot('ui-01-mes-mel.png');

  // A05 : semaine suivante + rapport de différences
  await evaluate("var p = CSE.store.get(); window.__srcJson = JSON.stringify(p.issues[0]); CSE.app.duplicateIssueDialog(p.issues[0]); await new Promise(r => setTimeout(r, 300)); Array.from(document.querySelectorAll('dialog .btn')).find(b => /Créer le nouveau MEL/.test(b.textContent)).click();");
  await sleep(1500);
  const rep = await evaluate("var d = document.querySelector('dialog'); return d ? d.textContent : ''");
  check('A05 · rapport de différences affiché', /Rapport de différences/.test(rep) && /Conservées/.test(rep), (rep.match(/À vérifier \(\d+\)|Retirées[^(]*\(\d+\)|Nouvelles pages \(\d+\)/g) || []).join(' · '));
  await shot('ui-02-rapport-differences.png');
  await evaluate("document.querySelector('dialog .dlg-foot .btn').click();");
  await sleep(600);
  check('A05 · MEL source inchangé', await evaluate("var p = CSE.store.get(); return JSON.stringify(p.issues[0]) === window.__srcJson && p.issues.length === 2 && p.issues[1].week === p.issues[0].week + 1"));

  // A03 : personnalisation « cette semaine uniquement » depuis le compositeur
  await evaluate("var li = Array.from(document.querySelectorAll('.pg')).find(x => /Demandes de subvention/.test(x.querySelector('.txt b').textContent)); li.click();");
  await sleep(700);
  await evaluate("document.querySelector('.stage-col [data-field=\"titre\"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));");
  await sleep(400);
  check('Clic sur l’aperçu → champ du formulaire', await evaluate("return (document.activeElement.closest('[data-key]') || {dataset:{}}).dataset.key === 'title'"));
  await evaluate("document.querySelectorAll('.scope-switch button')[1].click(); await new Promise(r => setTimeout(r, 400)); var i = document.querySelector('.props-form [data-key=\"title\"] input'); i.focus(); i.value = 'Subventions : dernier délai le 30 novembre'; i.dispatchEvent(new Event('input', { bubbles: true }));");
  await sleep(900);
  const a03 = await evaluate("var p = CSE.store.get(), is = p.issues.find(x => x.id === p.activeIssueId), src = p.items.find(x => /Demandes de subvention/.test(x.title)); var pg = is.pages.find(x => x.itemId === src.id); return { lib: src.title, ov: pg.opts.override && pg.opts.override.title, prev: document.querySelector('.stage-col [data-field=\"titre\"]').textContent, chip: !!document.querySelector('.props-form [data-key=\"title\"] .ov-chip'), focus: document.activeElement.tagName };");
  check('A03 · titre propre à la semaine, fiche source intacte', a03.ov === 'Subventions : dernier délai le 30 novembre' && a03.lib === 'Demandes de subvention : date limite de dépôt' && a03.prev === a03.ov && a03.chip && a03.focus === 'INPUT', JSON.stringify(a03));
  await shot('ui-03-compositeur-cette-semaine.png');

  // A10 : le règlement ne peut pas être placé avant les ouvertures
  const a10 = await evaluate("var p = CSE.store.get(), is = p.issues.find(x => x.id === p.activeIssueId); var pages = is.pages; var r = pages.findIndex(x => (CSE.compose.findItem(p, x.itemId) || {}).type === 'rules'); var o = pages.findIndex(x => (CSE.compose.findItem(p, x.itemId) || {}).type === 'calendar'); return { moved: CSE.compose.moveWithinSection(pages, r, o, p, is), last: (CSE.compose.findItem(p, pages[pages.length - 1].itemId) || {}).type };");
  check('A10 · ordre éditorial préservé', a10.moved === false && a10.last === 'rules', JSON.stringify(a10));

  // Contrôle final
  await evaluate("Array.from(document.querySelectorAll('.page-head .btn')).find(b => /Contrôle final/.test(b.textContent)).click();");
  await sleep(1800);
  check('Contrôle final affiché', await evaluate("var d = document.querySelector('dialog'); return !!d && /diapositives/.test(d.textContent) && d.querySelectorAll('.final-cell').length > 10"));
  await shot('ui-04-controle-final.png');
  await evaluate("document.querySelector('dialog .dlg-head .btn').click();");
  await sleep(400);

  // C05 : photo Web non importée signalée dans l'éditeur ; export bloqué sans choix explicite
  await evaluate("var p = CSE.store.get(); var it = p.items.find(x => /Jura/.test(x.title)); it.photos = ['https://exemple.org/photo-externe.jpg'].concat(it.photos); location.hash = '#/fiche/' + it.id;");
  await sleep(1200);
  await evaluate("Array.from(document.querySelectorAll('.steps button')).find(b => /Visuels/.test(b.textContent)).click();");
  await sleep(700);
  const c05 = await evaluate("return { badge: (document.querySelector('.photo.bad .badge') || {}).textContent, stepErr: !!document.querySelector('.steps button.has-error'), warn: document.querySelector('.issues').textContent.includes('non importée') };");
  check('C05 · photo Web non importée signalée (badge, étape, contrôles)', /non import/i.test(c05.badge || '') && c05.stepErr && c05.warn, JSON.stringify(c05));
  await shot('ui-05-photos-etat.png');
  const blocked = await evaluate("window.__download = null; var o = CSE.ui.dialog; CSE.ui.dialog = function () { return Promise.resolve(false); }; var p = CSE.store.get(); await CSE.app.exportIssue(p.issues[0], null); CSE.ui.dialog = o; return window.__download === null;");
  check('C05 · export arrêté tant que la photo n’est pas corrigée', blocked);

  // D01 : date de fin préremplie / bornée
  await evaluate("location.hash = '#/fiche/nouvelle/activity';");
  await sleep(900);
  await evaluate("Array.from(document.querySelectorAll('.steps button')).find(b => /Dates/.test(b.textContent)).click(); await new Promise(r => setTimeout(r, 300)); var s = document.querySelector('[data-key=\"dateStart\"] input'); s.value = '2027-03-15'; s.dispatchEvent(new Event('input', { bubbles: true }));");
  await sleep(300);
  const d01 = await evaluate("var e = document.querySelector('[data-key=\"dateEnd\"] input'); var r1 = e.value; e.value = '2027-03-10'; e.dispatchEvent(new Event('input', { bubbles: true })); return { auto: r1, min: e.min, corrected: e.value };");
  check('D01 · fin = début, date antérieure refusée', d01.auto === '2027-03-15' && d01.min === '2027-03-15' && d01.corrected === '2027-03-15', JSON.stringify(d01));

  // D02 : clic sur des jours du calendrier sans saut de défilement
  await evaluate("var p = CSE.store.get(); var cal = p.items.find(x => x.type === 'calendar'); location.hash = '#/fiche/' + cal.id;");
  await sleep(1000);
  await evaluate("Array.from(document.querySelectorAll('.steps button')).find(b => /Calendrier/.test(b.textContent)).click();");
  await sleep(500);
  const d02 = await evaluate("var g = document.querySelector('.cal-editor'); g.scrollIntoView({ block: 'center' }); await new Promise(r => setTimeout(r, 300)); var y0 = window.scrollY; var btns = Array.from(g.querySelectorAll('button:not(.out)')); btns[3].click(); await new Promise(r => setTimeout(r, 400)); var y1 = window.scrollY; document.querySelectorAll('.cal-editor button:not(.out)')[5].click(); await new Promise(r => setTimeout(r, 400)); return { y0: Math.round(y0), y1: Math.round(y1), y2: Math.round(window.scrollY) };");
  check('D02 · aucun saut de défilement au clic sur les jours', Math.abs(d02.y1 - d02.y0) < 4 && Math.abs(d02.y2 - d02.y0) < 4, JSON.stringify(d02));
  await shot('ui-06-calendrier.png');

  const errs = await evaluate('return window.__errs');
  check('Aucune erreur JavaScript pendant les parcours', !errs.length, errs.join(' | '));
  fs.writeFileSync(path.join(OUT, 'ui-check.json'), JSON.stringify(results, null, 1));
  ws.close(); proc.kill(); server.close();
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* profil temporaire */ }
  const failed = results.filter((r) => !r.ok).length;
  console.log(failed ? failed + ' vérification(s) en échec sur ' + results.length : 'Parcours navigateur : ' + results.length + ' vérifications OK. Captures : ' + OUT);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
