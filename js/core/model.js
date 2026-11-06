/* CSE Studio V9 · Modèle de données unifié.
 * - Une « fiche » (item) est saisie une seule fois dans la bibliothèque : activité, information,
 *   offre partenaire, calendrier de permanences, règlement ou page permanente.
 * - Un « MEL » (issue) référence les fiches par identifiant : aucune recopie, donc une fiche
 *   modifiée est à jour dans tous les MEL qui l'utilisent.
 * Toutes les fonctions normalize*() sont tolérantes : champs inconnus conservés, types corrigés. */
(function (root, factory) {
  'use strict';
  var mod = factory(root.CSE || {});
  root.CSE = root.CSE || {};
  root.CSE.model = mod;
  if (typeof module === 'object' && module.exports) module.exports = mod;
})(typeof window !== 'undefined' ? window : globalThis, function (CSE) {
  'use strict';
  var SCHEMA = 'cse-studio:v9';
  var PORTAL = 'https://cethaleslasmassy.portailce.com/';
  var CANVA = 'https://canva.link/rewv8gx5iilr8kz';

  var DEFAULT_CATEGORY_NAMES = ['Informations', 'Voyages', 'Week-ends', 'Sorties culturelles', 'Animations', 'Musique', 'Œnologie', 'Randonnées',
    'Sport', 'Sports mécaniques', 'Parapente', 'Couture', 'Dessin', 'La Ruche'];
  var PALETTE = ['#2F5DA8', '#1B7F79', '#7A4FD6', '#C2185B', '#E07A1F', '#8E44AD', '#8B1E3F', '#2E7D32', '#1565C0', '#C62828', '#00838F', '#AD1457', '#6D4C41', '#F9A825'];

  var TYPES = [
    { id: 'activity', label: 'Activité', hint: 'Voyage, week-end, sortie, spectacle, atelier, animation, sport…' },
    { id: 'info', label: 'Information', hint: 'Message administratif, rappel, procédure. Ni date ni tarif obligatoires.' },
    { id: 'partner', label: 'Offre partenaire', hint: 'Enseigne, offre, remise, code promo, échéance, lien.' },
    { id: 'calendar', label: 'Calendrier de permanences', hint: 'Permanences CSE, prêt de matériel… calendrier mensuel coloré.' },
    { id: 'page', label: 'Page permanente', hint: 'Ludothèque, service permanent : texte, visuel et lien réutilisés chaque semaine.' },
    { id: 'rules', label: 'Règlement / modalités', hint: 'Modalités d’inscription et règlement, toujours placés en fin de MEL.' }
  ];
  var EDITORIAL = [
    { id: 'auto', label: 'Automatique (selon les dates)' },
    { id: 'new', label: 'Nouveauté' },
    { id: 'ongoing', label: 'En cours' },
    { id: 'upcoming', label: 'À venir (programme)' },
    { id: 'permanent', label: 'Permanent' }
  ];
  var REG_STATUS = [
    { id: 'auto', label: 'Automatique (selon les dates d’inscription)' },
    { id: 'open', label: 'Inscriptions ouvertes' },
    { id: 'soon', label: 'Inscriptions prochainement' },
    { id: 'full', label: 'Complet' },
    { id: 'closed', label: 'Inscriptions closes' },
    { id: 'cancelled', label: 'Annulé' }
  ];
  var COUNTERS = [
    { id: '', label: 'Aucun compteur' },
    { id: 'long', label: 'Séjour long' },
    { id: 'short', label: 'Séjour court' },
    { id: 'france', label: 'Séjour FRANCE' }
  ];
  var DENSITIES = [
    { id: 'auto', label: 'Automatique' },
    { id: 'airy', label: 'Aéré' },
    { id: 'compact', label: 'Compact' }
  ];
  var DEFAULT_STATUSES = [
    { key: 'open', label: 'Permanence 13h–16h', color: '#8BC34A' },
    { key: 'short', label: 'Ouverture 14h30–16h', color: '#FFE45C' },
    { key: 'closed', label: 'Fermé', color: '#E5484D' }
  ];

  function uid(prefix) { return (prefix || 'id') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }
  function str(v, max) { var s = v === undefined || v === null ? '' : String(v); return max ? s.slice(0, max) : s; }
  function oneOf(v, list, def) { return list.some(function (x) { return (x.id !== undefined ? x.id : x) === v; }) ? v : def; }
  function bool(v) { return v === true || v === 'true' || v === 1; }
  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function slug(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/œ/g, 'oe').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'cat';
  }

  /* ---------- Catégories ---------- */
  function defaultCategories(names) {
    return (names || DEFAULT_CATEGORY_NAMES).map(function (n, i) { return { id: 'cat-' + slug(n), name: n, color: PALETTE[i % PALETTE.length] }; });
  }
  /** Normalise la liste : identifiants uniques, noms non vides, « Informations » toujours en premier. */
  function normalizeCategories(list) {
    var out = [], seenId = {}, seenName = {};
    (Array.isArray(list) ? list : []).forEach(function (c, i) {
      var o = typeof c === 'string' ? { name: c } : (isObj(c) ? c : null);
      if (!o) return;
      var name = str(o.name).trim().replace(/\s+/g, ' ').slice(0, 45);
      if (!name || seenName[name.toLocaleLowerCase('fr')]) return;
      var id = str(o.id).trim() || 'cat-' + slug(name);
      while (seenId[id]) id = id + '-' + (i + 1);
      seenId[id] = 1; seenName[name.toLocaleLowerCase('fr')] = 1;
      out.push({ id: id, name: name, color: /^#[0-9a-f]{6}$/i.test(o.color || '') ? o.color.toUpperCase() : PALETTE[out.length % PALETTE.length] });
    });
    if (!out.length) out = defaultCategories();
    var info = out.findIndex(function (c) { return c.name.toLocaleLowerCase('fr') === 'informations'; });
    if (info > 0) out.unshift(out.splice(info, 1)[0]);
    if (info < 0) out.unshift({ id: 'cat-informations', name: 'Informations', color: PALETTE[0] });
    return out;
  }

  /* ---------- Paramètres du CSE ---------- */
  function defaultSettings() {
    return {
      orgName: 'CSE THALES LAS MASSY',
      melTitle: 'MEL DU CSE',
      portalUrl: PORTAL,
      canvaUrl: CANVA,
      planningUrl: '',
      planningLabel: 'Vue d’ensemble des activités du CSE : consultez le portail',
      footerNote: '',
      pricingModule: true,
      rates: [70, 65, 60, 55, 50, 45, 40, 35, 30, 25],
      rounding: { step: 'unit', mode: 'nearest' },
      newDays: 7,
      lastDays: 7,
      defaultDensity: 'auto',
      numbering: false,
      qrCodes: false,
      referents: [],
      mentions: { calendar: '* Jours et horaires susceptibles de changer en fonction de l’actualité.', upcoming: 'Programmation prévisionnelle : les dates et modalités peuvent évoluer.' }
    };
  }
  function normalizeSettings(s) {
    var d = defaultSettings(), o = isObj(s) ? s : {};
    var out = Object.assign({}, d, o);
    out.rates = Array.from({ length: 10 }, function (_, i) {
      var v = Array.isArray(o.rates) ? Number(o.rates[i]) : NaN;
      return Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : d.rates[i];
    });
    out.rounding = Object.assign({}, d.rounding, isObj(o.rounding) ? o.rounding : {});
    out.rounding.step = oneOf(out.rounding.step, ['cent', 'half', 'unit', 'five'], 'unit');
    out.rounding.mode = oneOf(out.rounding.mode, ['nearest', 'down', 'up'], 'nearest');
    out.pricingModule = o.pricingModule === undefined ? true : bool(o.pricingModule);
    out.numbering = bool(o.numbering);
    out.qrCodes = bool(o.qrCodes);
    out.newDays = clampInt(o.newDays, 0, 90, d.newDays);
    out.lastDays = clampInt(o.lastDays, 1, 31, d.lastDays);
    out.defaultDensity = oneOf(o.defaultDensity, DENSITIES, 'auto');
    out.referents = normalizeContacts(o.referents);
    out.mentions = Object.assign({}, d.mentions, isObj(o.mentions) ? o.mentions : {});
    ['orgName', 'melTitle', 'portalUrl', 'canvaUrl', 'planningUrl', 'planningLabel', 'footerNote'].forEach(function (k) { out[k] = str(out[k], 400); });
    return out;
  }
  function clampInt(v, a, b, def) { var n = parseInt(v, 10); return Number.isFinite(n) ? Math.min(b, Math.max(a, n)) : def; }

  function normalizeContacts(list) {
    return (Array.isArray(list) ? list : []).slice(0, 20).map(function (c) {
      c = isObj(c) ? c : { name: str(c) };
      return { name: str(c.name, 90).trim(), email: str(c.email, 140).trim(), phone: str(c.phone, 40).trim(), role: str(c.role, 80).trim() };
    }).filter(function (c) { return c.name || c.email || c.phone; });
  }

  /* ---------- Fiches ---------- */
  function blankItem(type) {
    var now = new Date().toISOString();
    return {
      id: uid('fiche'), type: oneOf(type, TYPES, 'activity'),
      title: '', subtitle: '', categoryId: type === 'info' || type === 'rules' || type === 'calendar' || type === 'page' ? 'cat-informations' : '',
      editorial: 'auto', regStatus: 'auto', forceLast: false, excludeLast: false,
      summary: '', description: '', program: '', highlights: '',
      location: '', address: '',
      dateStart: '', dateEnd: '', timeStart: '', timeEnd: '',
      regStart: '', regEnd: '', regInfo: '',
      contacts: [], audience: '', minAge: '', minPart: '', maxPart: '',
      notes: '', conditions: '', transport: '', lodging: '', carbon: '',
      photos: [],
      pricing: { enabled: false, mode: 'tranches', outside: '', percent: '', fixed: '', manual: [], overrides: {}, label: '', notes: '' },
      points: { value: '', counter: '' },
      link: { type: 'portal', url: '', label: 'Plus d’infos' },
      partner: { offer: '', amount: '', code: '', validUntil: '' },
      calendar: { month: '', days: {}, statuses: DEFAULT_STATUSES.map(function (s) { return Object.assign({}, s); }), service: '', hours: '', catalogUrl: '', catalogLabel: 'Catalogue', note: '' },
      template: 'auto', density: 'auto',
      archived: false, editorialStatus: 'draft',
      createdAt: now, updatedAt: now, version: 1
    };
  }
  var TEXT_FIELDS = { title: 160, subtitle: 200, summary: 1200, description: 6000, program: 4000, highlights: 2000, location: 200, address: 300,
    regInfo: 1500, audience: 200, notes: 1500, conditions: 1500, transport: 600, lodging: 600, carbon: 80, minAge: 40, minPart: 10, maxPart: 10,
    timeStart: 10, timeEnd: 10 };
  var DATE_FIELDS = ['dateStart', 'dateEnd', 'regStart', 'regEnd'];

  function normalizeItem(raw) {
    var o = isObj(raw) ? raw : {};
    var b = blankItem(o.type);
    var it = Object.assign({}, b, o);
    it.id = str(o.id).trim() || b.id;
    it.type = oneOf(o.type, TYPES, 'activity');
    Object.keys(TEXT_FIELDS).forEach(function (k) { it[k] = str(it[k], TEXT_FIELDS[k]); });
    DATE_FIELDS.forEach(function (k) { it[k] = /^\d{4}-\d{2}-\d{2}$/.test(str(o[k])) ? o[k] : ''; });
    it.categoryId = str(o.categoryId).trim() || b.categoryId;
    it.editorial = oneOf(o.editorial, EDITORIAL, 'auto');
    it.regStatus = oneOf(o.regStatus, REG_STATUS, 'auto');
    it.forceLast = bool(o.forceLast); it.excludeLast = bool(o.excludeLast);
    it.contacts = normalizeContacts(o.contacts);
    it.photos = (Array.isArray(o.photos) ? o.photos : []).map(function (p) { return str(p).trim(); }).filter(Boolean).slice(0, 6);
    var pr = isObj(o.pricing) ? o.pricing : {};
    it.pricing = Object.assign({}, b.pricing, pr);
    it.pricing.enabled = bool(pr.enabled);
    it.pricing.mode = oneOf(pr.mode, ['tranches', 'manual', 'subsidy', 'participation', 'fixed', 'single'], 'tranches');
    ['outside', 'percent', 'fixed', 'label', 'notes'].forEach(function (k) { it.pricing[k] = str(it.pricing[k], k === 'notes' ? 400 : 120); });
    it.pricing.manual = (Array.isArray(pr.manual) ? pr.manual : []).slice(0, 10).map(function (v) { return str(v, 12); });
    it.pricing.overrides = isObj(pr.overrides) ? pr.overrides : {};
    var pt = isObj(o.points) ? o.points : {};
    it.points = { value: str(pt.value, 10).replace(/[^\d.,]/g, ''), counter: oneOf(pt.counter, COUNTERS, '') };
    var ln = isObj(o.link) ? o.link : {};
    it.link = { type: oneOf(ln.type, ['portal', 'custom', 'none'], 'portal'), url: str(ln.url, 600).trim(), label: str(ln.label === undefined ? 'Plus d’infos' : ln.label, 60) };
    var pa = isObj(o.partner) ? o.partner : {};
    it.partner = { offer: str(pa.offer, 300), amount: str(pa.amount, 40), code: str(pa.code, 60), validUntil: /^\d{4}-\d{2}-\d{2}$/.test(str(pa.validUntil)) ? pa.validUntil : '' };
    var ca = isObj(o.calendar) ? o.calendar : {};
    it.calendar = Object.assign({}, b.calendar, ca);
    it.calendar.month = /^\d{4}-\d{2}$/.test(str(ca.month)) ? ca.month : '';
    it.calendar.days = isObj(ca.days) ? Object.keys(ca.days).reduce(function (acc, k) { if (/^\d{4}-\d{2}-\d{2}$/.test(k) && ca.days[k] && ca.days[k] !== 'none') acc[k] = str(ca.days[k], 20); return acc; }, {}) : {};
    it.calendar.statuses = (Array.isArray(ca.statuses) && ca.statuses.length ? ca.statuses : DEFAULT_STATUSES).slice(0, 6).map(function (s, i) {
      return { key: str(s.key).trim() || 'st' + i, label: str(s.label, 80), color: /^#[0-9a-f]{6}$/i.test(s.color || '') ? s.color : DEFAULT_STATUSES[i % 3].color };
    });
    ['service', 'hours', 'catalogUrl', 'catalogLabel', 'note'].forEach(function (k) { it.calendar[k] = str(it.calendar[k], 400); });
    it.template = str(o.template || 'auto', 40);
    it.density = oneOf(o.density, DENSITIES, 'auto');
    it.archived = bool(o.archived);
    it.editorialStatus = oneOf(o.editorialStatus, ['draft', 'review', 'approved'], 'draft');
    it.createdAt = str(o.createdAt) || b.createdAt;
    it.updatedAt = str(o.updatedAt) || it.createdAt;
    it.version = clampInt(o.version, 1, 1e9, 1);
    return it;
  }

  /* ---------- MEL ---------- */
  var PAGE_KINDS = ['cover', 'item', 'news', 'last', 'upcoming'];
  function blankPage(kind, extra) {
    var p = { id: uid('page'), kind: oneOf(kind, PAGE_KINDS, 'item'), itemId: '', template: 'auto', density: 'auto', included: true, split: false, opts: {} };
    if (p.kind === 'cover') p.opts = { important: { label: 'Important', title: '', text: '' }, mustSee: { auto: true, text: '' }, newsAuto: true, newsIds: [], editorial: '', showPlanning: true };
    if (p.kind === 'news') p.opts = { auto: true, ids: [], categoryId: '', title: 'Les nouveautés de la semaine', subtitle: '' };
    if (p.kind === 'last') p.opts = { auto: true, ids: [], categoryId: '', title: 'Dernière chance !', subtitle: '' };
    if (p.kind === 'upcoming') p.opts = { style: 'list', auto: true, categoryId: '', from: '', to: '', rows: [], title: 'Programme des prochaines activités', subtitle: '', note: '' };
    return Object.assign(p, extra || {});
  }
  function normalizePage(raw) {
    var o = isObj(raw) ? raw : {};
    var b = blankPage(o.kind);
    var p = Object.assign({}, b, o);
    p.id = str(o.id).trim() || b.id;
    p.kind = b.kind;
    p.itemId = str(o.itemId);
    p.template = str(o.template || 'auto', 40);
    p.density = oneOf(o.density, DENSITIES, 'auto');
    p.included = o.included !== false;
    p.split = bool(o.split);
    p.opts = Object.assign({}, b.opts, isObj(o.opts) ? o.opts : {});
    if (Array.isArray(p.opts.ids)) p.opts.ids = p.opts.ids.map(String).slice(0, 6);
    if (Array.isArray(p.opts.newsIds)) p.opts.newsIds = p.opts.newsIds.map(String).slice(0, 4);
    if (Array.isArray(p.opts.rows)) p.opts.rows = p.opts.rows.slice(0, 60).map(function (r) { r = isObj(r) ? r : {}; return { date: str(r.date, 10), title: str(r.title, 160), location: str(r.location, 120), type: str(r.type || r.status, 80) }; });
    return p;
  }
  function blankIssue(refDate) {
    var D = CSE.dates;
    var ref = refDate || (D ? D.todayParis() : new Date().toISOString().slice(0, 10));
    var wk = D ? D.isoWeek(ref) : { week: 1, year: 2026 };
    var now = new Date().toISOString();
    return { id: uid('mel'), refDate: ref, week: wk.week, year: wk.year, title: '', numbering: false, status: 'draft', pages: [], createdAt: now, updatedAt: now, version: 1 };
  }
  function normalizeIssue(raw) {
    var o = isObj(raw) ? raw : {};
    var b = blankIssue(/^\d{4}-\d{2}-\d{2}$/.test(str(o.refDate)) ? o.refDate : '');
    var is = Object.assign({}, b, o);
    is.id = str(o.id).trim() || b.id;
    is.refDate = /^\d{4}-\d{2}-\d{2}$/.test(str(o.refDate)) ? o.refDate : b.refDate;
    is.week = clampInt(o.week, 1, 53, b.week);
    is.year = clampInt(o.year, 2000, 2100, b.year);
    is.title = str(o.title, 120);
    is.numbering = bool(o.numbering);
    is.pages = (Array.isArray(o.pages) ? o.pages : []).slice(0, 300).map(normalizePage);
    is.version = clampInt(o.version, 1, 1e9, 1);
    return is;
  }

  /* ---------- Projet complet ---------- */
  function blankProject() {
    return { schema: SCHEMA, settings: defaultSettings(), categories: defaultCategories(), items: [], issues: [], activeIssueId: '' };
  }
  function normalizeProject(raw) {
    var o = isObj(raw) ? raw : {};
    var p = { schema: SCHEMA };
    p.settings = normalizeSettings(o.settings);
    p.categories = normalizeCategories(o.categories);
    var seen = {};
    p.items = (Array.isArray(o.items) ? o.items : []).map(normalizeItem).filter(function (it) { if (seen[it.id]) { it.id = uid('fiche'); } seen[it.id] = 1; return true; });
    p.issues = (Array.isArray(o.issues) ? o.issues : []).map(normalizeIssue);
    p.activeIssueId = str(o.activeIssueId);
    if (o.legacy) p.legacy = o.legacy;
    if (isObj(o.migration)) p.migration = o.migration;
    if (isObj(o.cloud)) p.cloud = o.cloud;
    p.trash = (Array.isArray(o.trash) ? o.trash : []).filter(function (t) { return isObj(t) && isObj(t.item); }).map(function (t) { return { at: str(t.at), item: normalizeItem(t.item) }; });
    // Catégories référencées mais absentes : recréées pour ne rien perdre.
    p.items.forEach(function (it) {
      if (it.categoryId && !p.categories.some(function (c) { return c.id === it.categoryId; })) {
        p.categories.push({ id: it.categoryId, name: it.categoryId.replace(/^cat-/, '').replace(/-/g, ' ').replace(/^./, function (c) { return c.toUpperCase(); }), color: PALETTE[p.categories.length % PALETTE.length] });
      }
    });
    return p;
  }

  function categoryOf(project, item) {
    var id = item && item.categoryId;
    return (project.categories || []).find(function (c) { return c.id === id; }) || null;
  }
  function categoryName(project, item) { var c = categoryOf(project, item); return c ? c.name : ''; }

  return {
    SCHEMA: SCHEMA, PORTAL: PORTAL, CANVA: CANVA, DEFAULT_CATEGORY_NAMES: DEFAULT_CATEGORY_NAMES, PALETTE: PALETTE, TYPES: TYPES, EDITORIAL: EDITORIAL,
    REG_STATUS: REG_STATUS, COUNTERS: COUNTERS, DENSITIES: DENSITIES, DEFAULT_STATUSES: DEFAULT_STATUSES, PAGE_KINDS: PAGE_KINDS,
    uid: uid, slug: slug, defaultCategories: defaultCategories, normalizeCategories: normalizeCategories, defaultSettings: defaultSettings,
    normalizeSettings: normalizeSettings, normalizeContacts: normalizeContacts, blankItem: blankItem, normalizeItem: normalizeItem,
    blankPage: blankPage, normalizePage: normalizePage, blankIssue: blankIssue, normalizeIssue: normalizeIssue,
    blankProject: blankProject, normalizeProject: normalizeProject, categoryOf: categoryOf, categoryName: categoryName
  };
});
