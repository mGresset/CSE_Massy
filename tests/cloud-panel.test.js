/* V9.2 : les copies de conflit doivent rester visibles même hors connexion Supabase. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { assert, test, done } = require('./lib/assert-ext');
const { load, ROOT } = require('./lib/env');
const C = load();
const p = C.model.blankProject();
const i = C.model.blankIssue('2027-02-08');
i.title = 'MEL local à préserver';
i.cloudConflict = { localOnly: true, sourceId: 'issue:origine', savedAt: '2026-11-07T08:00:00Z' };
p.issues = [i];
p.cloud = { settingsBackups: [{ id: 'backup-1', sourceId: 'settings', savedAt: '2026-11-07T08:00:00Z', settings: { orgName: 'CSE à récupérer' }, categories: p.categories }] };
function h(tag, attrs, ...children) {
  const n = { tag, attrs: attrs || {}, children };
  n.appendChild = (value) => n.children.push(value);
  return n;
}
function flat(node) {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (!node) return '';
  return (node.children || []).map(flat).join(' ');
}
const ui = { h, field: (name, inp) => h('label', {}, name, inp), clear: n => { n.children = []; }, confirm: () => Promise.resolve(true), toast: () => {} };
const app = { p: () => p };
const store = { snapshot: () => {}, set: (newProject) => { Object.assign(p, C.model.normalizeProject(newProject)); } };
const root = { CSE: Object.assign(C, { app, ui, store }) };
const storage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const ctx = { window: root, localStorage: storage, sessionStorage: storage, URL, URLSearchParams, Date, console, fetch: () => Promise.reject(Error('Réseau interdit')) };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js/app/cloud.js'), 'utf8'), ctx, { filename: 'js/app/cloud.js' });
const panel = root.CSE.app.cloud.settingsPanel();
const txt = flat(panel);
test('les copies MEL sont visibles sans configuration de Supabase', () => {
  assert.ok(txt.includes('MEL locaux récupérés après conflit'));
  assert.ok(txt.includes('MEL local à préserver'));
});
test('les anciennes catégories/paramètres sont restaurables sans connexion', () => {
  assert.ok(txt.includes('Paramètres locaux récupérés après conflit'));
  assert.ok(txt.includes('Restaurer ici'));
});
done('V9.2 — panneaux de récupération hors ligne');
