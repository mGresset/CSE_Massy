/* Sécurité et confidentialité du dépôt public :
 * - aucun secret (clé service_role, sb_secret, jetons, mots de passe) ;
 * - aucune donnée personnelle issue du MEL original (noms et e-mails vérifiés par empreinte SHA-256,
 *   pour ne pas republier ces noms dans le dépôt lui-même) ;
 * - aucun PDF ni page originale du MEL ; chargement des scripts dans le bon ordre. */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { assert, test, done } = require('./lib/assert-ext');
const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set(['.git', 'node_modules', '.claude']);
function walk(dir, out) {
  for (const f of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(f)) continue;
    const p = path.join(dir, f), st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}
const files = walk(ROOT, []);
const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/');
const textFiles = files.filter((f) => /\.(js|ts|html|css|md|sql|json|txt)$/i.test(f) && !/vendor[\\/]/.test(f) && !/bandeau-cse\.data\.js$/.test(f));

test('aucun secret dans le dépôt', () => {
  const patterns = [/sb_secret_[A-Za-z0-9]/, /service_role["']?\s*[:=]\s*["']ey/i, /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/, /sk_live_[A-Za-z0-9]/, /CANVA_CLIENT_SECRET\s*=\s*['"][^'"]+['"]/, /password\s*[:=]\s*['"][^'"]{4,}['"]/i];
  for (const f of textFiles) {
    const t = fs.readFileSync(f, 'utf8');
    for (const re of patterns) assert.ok(!re.test(t), 'motif sensible dans ' + rel(f) + ' : ' + re);
  }
  const cfg = fs.readFileSync(path.join(ROOT, 'js/cloud-config.js'), 'utf8');
  assert.ok(!/^\s*window\.CSE_CLOUD_CONFIG\s*=/m.test(cfg.replace(/\/\*[\s\S]*?\*\//g, '')), 'configuration Supabase non renseignée par défaut');
});
// Empreintes SHA-256 (16 premiers caractères) de noms et domaines présents dans le MEL original.
const FORBIDDEN = ['20afd97c4f7d9e0b', '57e802ce0d390286', '32164280165387d7', 'c17323fc0b1bab00', 'f97e60f560a2b7b7', '9dd6be8bfb76749c', '426020c254207ef8', '3c9d14b94696216d',
  '6fb2975495790f8a', 'a610497ec7e32139', '63056e87c05c9cd4', '92be785744962e23', 'a47c382f2b0d340c', '49eadf1543b29aa3', '5bbacce5128c5e01', '4da1d0315e4306c8',
  '8c0623d97ad35939', 'c365b661528506f7', 'b2078759ef8d147e', 'b6c6dfb7e6980f1a', '3da5bedb13483511', 'c7688e8e82461bce', 'd6e8d019789b7dff'];
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
test('aucun nom ni e-mail du MEL original dans le code, la démo ou la documentation', () => {
  const bad = new Set(FORBIDDEN);
  for (const f of textFiles.filter((x) => !/security\.test\.js$/.test(x))) {
    const t = fs.readFileSync(f, 'utf8').toLowerCase();
    for (const tok of t.split(/[^a-zà-ÿœ0-9@.\-]+/)) {
      if (!tok) continue;
      const parts = [tok, tok.split('@')[1] || '', tok.replace(/\.$/, '')];
      for (const x of parts) if (x && bad.has(sha(x))) assert.fail('donnée personnelle du MEL original dans ' + rel(f));
    }
  }
});
test('aucune copie du MEL original (PDF ou pages)', () => {
  assert.ok(!files.some((f) => /\.pdf$/i.test(f)), 'aucun PDF dans le dépôt');
  for (const f of files.filter((x) => /\.(jpe?g|png|webp)$/i.test(x))) {
    assert.ok(fs.statSync(f).size < 2.5 * 1024 * 1024, 'image volumineuse suspecte : ' + rel(f));
  }
  const demo = fs.readFileSync(path.join(ROOT, 'js/core/demo.js'), 'utf8');
  assert.ok(/@exemple\.org/.test(demo) && !/@(?!exemple\.org)[a-z0-9-]+\.[a-z]{2,}/i.test(demo), 'démo : adresses fictives uniquement');
});
test('pages publiées : scripts présents et dans le bon ordre', () => {
  for (const page of ['index.html', 'mel.html']) {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    const srcs = [...html.matchAll(/<script src="([^"?]+)/g)].map((m) => m[1]);
    for (const s of srcs) assert.ok(fs.existsSync(path.join(ROOT, s)), page + ' : ' + s + ' introuvable');
    const pos = (n) => srcs.indexOf(n);
    assert.ok(pos('vendor/jszip.min.js') < pos('vendor/pptxgen.min.js') && pos('vendor/pptxgen.min.js') < pos('js/export/pptx.js'), page + ' : JSZip → PptxGenJS → export');
    assert.ok(pos('js/app/main.js') === srcs.length - 1, page + ' : main.js en dernier');
    assert.ok(!/(src|href)="\//.test(html), page + ' : chemins relatifs (préfixe /CSE_Massy/ de GitHub Pages)');
  }
  assert.ok(fs.existsSync(path.join(ROOT, '.nojekyll')));
  assert.ok(fs.existsSync(path.join(ROOT, 'vendor/LICENSE-pptxgenjs.txt')) && fs.existsSync(path.join(ROOT, 'vendor/LICENSE-jszip.txt')));
});
test('aucune insertion HTML de données utilisateur dans l’interface', () => {
  for (const f of files.filter((x) => /js[\\/](app|engine)[\\/].*\.js$/.test(x))) {
    const t = fs.readFileSync(f, 'utf8');
    assert.ok(!/\.innerHTML\s*=/.test(t), 'innerHTML dans ' + rel(f));
  }
});
done('sécurité et confidentialité');
