/* Dates : aucune erreur J−1 quel que soit le fuseau du poste ; semaines ISO ; formats français. */
'use strict';
const { spawnSync } = require('child_process');
const { assert, test, done } = require('./lib/assert-ext');
const D = require('../js/core/dates.js');

test('semaines ISO', () => {
  assert.deepEqual(D.isoWeek('2026-11-09'), { week: 46, year: 2026 });
  assert.deepEqual(D.isoWeek('2027-01-01'), { week: 53, year: 2026 });
  assert.deepEqual(D.isoWeek('2027-01-04'), { week: 1, year: 2027 });
  assert.equal(D.isoWeekMonday(46, 2026), '2026-11-09');
});
test('écarts et formats', () => {
  assert.equal(D.diffDays('2026-11-16', '2026-11-09'), 7);
  assert.equal(D.diffDays('2026-03-30', '2026-03-28'), 2); // passage à l'heure d'été
  assert.equal(D.addDays('2026-10-24', 2), '2026-10-26'); // passage à l'heure d'hiver
  assert.equal(D.fmtLong('2026-11-01'), '1er novembre 2026');
  assert.equal(D.fmtRange('2027-04-04', '2027-04-15'), 'Du 4 au 15 avril 2027');
  assert.equal(D.fmtRange('2026-12-30', '2027-01-02'), 'Du 30 décembre 2026 au 2 janvier 2027');
  assert.equal(D.countdown('2026-11-13', '2026-11-09'), 'J−4');
  assert.equal(D.countdown('2026-11-09', '2026-11-09'), 'Dernier jour');
  assert.equal(D.parse('2026-02-30'), null);
});
test('indépendance au fuseau horaire du poste', () => {
  const file = JSON.stringify(require.resolve('../js/core/dates.js'));
  const code = [
    'const D = require(' + file + ');',
    'console.log([',
    "  D.diffDays('2026-11-16', '2026-11-09'),",
    "  D.fmtLong('2026-11-09'),",
    "  D.isoWeek('2026-11-09').week,",
    "  D.weekday('2026-11-09'),",
    "  D.todayParis(new Date('2026-11-08T23:30:00Z'))",
    "].join('|'));"
  ].join('\n');
  const expected = '7|9 novembre 2026|46|1|2026-11-09';
  for (const tz of ['UTC', 'America/Los_Angeles', 'Pacific/Kiritimati', 'Europe/Paris']) {
    const r = spawnSync(process.execPath, ['-e', code], { encoding: 'utf8', env: Object.assign({}, process.env, { TZ: tz }) });
    assert.equal(r.stdout.trim(), expected, 'fuseau ' + tz + ' ' + r.stderr);
  }
});
done('dates (fuseaux UTC, Los Angeles, Kiritimati, Paris)');
