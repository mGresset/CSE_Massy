/* Lance tous les tests : node tests/run.js  (chaque fichier dans son propre processus). */
'use strict';
const { spawnSync } = require('child_process'), fs = require('fs'), path = require('path');
const files = fs.readdirSync(__dirname).filter((f) => f.endsWith('.test.js')).sort();
let failed = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, ['--no-warnings', path.join(__dirname, f)], { encoding: 'utf8' });
  const ok = r.status === 0;
  if (!ok) failed++;
  process.stdout.write((ok ? '✓ ' : '✗ ') + f + '\n' + (r.stdout || '').replace(/^/gm, '    ') + (ok ? '' : (r.stderr || '').replace(/^/gm, '    ! ')) + '\n');
}
console.log(failed ? failed + ' fichier(s) en échec sur ' + files.length : 'Tous les tests passent (' + files.length + ' fichiers).');
process.exit(failed ? 1 : 0);
