/* CSE Studio V9 · Migrations explicites et imports de sauvegardes.
 * Sources prises en charge (aucune n'est modifiée ni supprimée) :
 *  - localStorage V6 : cse-studio-massy:v1:activities, :v1:draft, :v1:rates, :v6:categories
 *  - localStorage V7/V8 : cse-studio-massy:v7:mel (schéma JSON « cse-studio:mel-v7 »)
 *  - fichiers JSON : cse-studio:2 (fiche V6), cse-studio:3-library (bibliothèque V6), cse-studio:mel-v7, cse-studio:v9
 * Les champs d'origine sont conservés dans item.legacy (sans les images) : aucune perte silencieuse. */
(function (root, factory) {
  'use strict';
  var mod = factory(root.CSE || {});
  root.CSE = root.CSE || {};
  root.CSE.migrate = mod;
  if (typeof module === 'object' && module.exports) module.exports = mod;
})(typeof window !== 'undefined' ? window : globalThis, function (CSE) {
  'use strict';
  var KEYS = {
    v9: 'cse-studio-massy:v9:project',
    v7mel: 'cse-studio-massy:v7:mel',
    v6cat: 'cse-studio-massy:v6:categories',
    v1act: 'cse-studio-massy:v1:activities',
    v1draft: 'cse-studio-massy:v1:draft',
    v1rates: 'cse-studio-massy:v1:rates'
  };
  var M = function () { return CSE.model; };
  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function s(v) { return v === undefined || v === null ? '' : String(v); }
  function stripImages(o) {
    var c = {};
    Object.keys(o || {}).forEach(function (k) {
      var v = o[k];
      if (typeof v === 'string' && /^data:image\//.test(v)) c[k] = '[image ' + Math.round(v.length * 0.75 / 1024) + ' Ko, migrée dans les photos]';
      else c[k] = v;
    });
    return c;
  }
  function isoDate(v) { return /^\d{4}-\d{2}-\d{2}$/.test(s(v)) ? v : ''; }
  function photoOf(v) { v = s(v).trim(); return /^data:image\/(png|jpeg|webp|gif);base64,/i.test(v) || /^https?:\/\//i.test(v) || /^assets\//.test(v) ? v : ''; }

  /** Contexte de catégories : nom → id, création si absente. */
  function catContext(categories) {
    var list = categories.slice();
    function idFor(name) {
      name = s(name).trim().replace(/\s+/g, ' ');
      if (!name) return '';
      var hit = list.find(function (c) { return c.name.toLocaleLowerCase('fr') === name.toLocaleLowerCase('fr'); });
      if (hit) return hit.id;
      var c = { id: 'cat-' + M().slug(name), name: name.slice(0, 45), color: M().PALETTE[list.length % M().PALETTE.length] };
      while (list.some(function (x) { return x.id === c.id; })) c.id += '-b';
      list.push(c);
      return c.id;
    }
    return { idFor: idFor, list: function () { return list; } };
  }
  function rateEqual(a, b) { return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every(function (v, i) { return Number(v) === Number(b[i]); }); }

  /* ---------- Fiche V6 (éditeur d'activités) ---------- */
  function fromV6Activity(a, cats, settings) {
    var tplType = { info: 'info' }[a.template] || 'activity';
    var it = M().blankItem(tplType);
    it.title = s(a.title);
    it.subtitle = s(a.subtitle);
    it.categoryId = cats.idFor(a.category || 'Informations');
    it.location = s(a.location);
    it.address = s(a.venue);
    it.dateStart = isoDate(a.activityStart); it.dateEnd = isoDate(a.activityEnd);
    it.regStart = isoDate(a.registrationStart); it.regEnd = isoDate(a.registrationEnd);
    it.summary = s(a.summary);
    var desc = [];
    if (s(a.included).trim()) desc.push('**Prestations incluses**\n' + s(a.included).split(/\r?\n/).filter(function (x) { return x.trim(); }).map(function (x) { return '- ' + x.trim(); }).join('\n'));
    it.description = desc.join('\n\n');
    it.highlights = s(a.highlights);
    it.conditions = [s(a.administrative), s(a.conditions)].filter(function (x) { return x.trim(); }).join('\n');
    it.notes = s(a.warning);
    it.audience = s(a.audience);
    it.minPart = s(a.minimum); it.maxPart = s(a.maximum);
    it.points = { value: s(a.points).replace(/[^\d.,]/g, ''), counter: ['long', 'short', 'france'].indexOf(a.pointCounter) >= 0 ? a.pointCounter : '' };
    it.carbon = s(a.carbon);
    var regMap = { 'À venir': 'soon', 'Inscriptions ouvertes': 'open', 'Complet': 'full', 'Clôturé': 'closed', 'Annulé': 'cancelled' };
    it.regStatus = regMap[a.status] || 'auto';
    var contacts = Array.isArray(a.contacts) && a.contacts.length ? a.contacts : (a.contact || a.contactEmail ? [{ name: a.contact, email: a.contactEmail }] : []);
    it.contacts = M().normalizeContacts(contacts);
    it.photos = [a.photoData, a.photoUrl, a.photo2Data].map(photoOf).filter(Boolean);
    it.link = { type: a.linkType === 'custom' ? 'custom' : a.linkType === 'none' ? 'none' : 'portal', url: s(a.customUrl), label: s(a.ctaLabel || 'Plus d’infos') };
    var showPricing = a.showPricing === undefined ? s(a.outsidePrice).trim() !== '' : a.showPricing !== false;
    var pm = { tranches: 'tranches', fixedSubsidy: 'subsidy', fixedEmployee: 'participation', fixedEuro: 'fixed' }[a.pricingMode] || 'tranches';
    it.pricing = { enabled: showPricing, mode: pm, outside: s(a.outsidePrice), percent: s(a.fixedRate), fixed: s(a.fixedEuro), manual: [], overrides: {}, label: s(a.priceLabel), notes: s(a.priceNotes) };
    // Barème propre à la fiche différent du barème général : prix figés en saisie manuelle (aucun changement de montant).
    if (pm === 'tranches' && Array.isArray(a.rates) && a.rates.length === 10 && !rateEqual(a.rates, settings.rates) && s(a.outsidePrice).trim() !== '') {
      var base = CSE.pricing.finite(a.outsidePrice);
      it.pricing.mode = 'manual';
      it.pricing.manual = a.rates.map(function (r) { return String(CSE.pricing.euroRound(base * (100 - CSE.pricing.boundedRate(r)) / 100)); });
    }
    it.template = { classic: 'classic', hero: 'immersive', info: 'info', flash: 'poster', upcoming: 'classic' }[a.template] || 'auto';
    it.editorialStatus = ['draft', 'review', 'approved'].indexOf(a.editorialStatus) >= 0 ? a.editorialStatus : 'draft';
    it.createdAt = s(a.updatedAt) || '2026-01-01T00:00:00.000Z';
    it.updatedAt = it.createdAt;
    if (a.internalReference) it.internalRef = s(a.internalReference);
    it.legacy = { source: 'V6 · éditeur d’activités', raw: stripImages(a) };
    return M().normalizeItem(it);
  }

  /* ---------- Diapositive V7/V8 (compositeur) ---------- */
  var V8_ITEM_KINDS = ['activity', 'deadline', 'immersive', 'poster', 'information', 'partner', 'calendar', 'rules'];
  function fromV8Slide(sl, cats, ctx) {
    var kind = sl.kind;
    var type = kind === 'information' ? 'info' : kind === 'partner' ? 'partner' : kind === 'calendar' ? 'calendar' : kind === 'rules' ? 'rules' : 'activity';
    var it = M().blankItem(type);
    it.title = s(sl.title);
    it.subtitle = s(sl.subtitle);
    it.categoryId = cats.idFor(sl.category || 'Informations');
    it.location = s(sl.location);
    it.dateStart = isoDate(sl.date); it.dateEnd = isoDate(sl.dateEnd);
    it.regEnd = type === 'partner' ? '' : isoDate(sl.deadline);
    var lines = s(sl.contact).split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean);
    it.contacts = lines.map(function (l) { var m = /^(.*?)[\s(<]*([^\s()<>]+@[^\s()<>]+)[)>]?$/.exec(l); return m ? { name: m[1].trim(), email: m[2] } : { name: l }; });
    it.contacts = M().normalizeContacts(it.contacts);
    it.photos = [sl.image, sl.image2].map(photoOf).filter(Boolean);
    it.link = { type: sl.linkType === 'custom' ? 'custom' : sl.linkType === 'none' ? 'none' : 'portal', url: s(sl.linkCustom), label: s(sl.linkLabel || 'Plus d’infos') };
    it.density = { aere: 'airy', compact: 'compact' }[sl.density] || 'auto';
    if (type === 'rules') {
      it.description = [s(sl.description), s(sl.details)].filter(function (x) { return x.trim(); }).join('\n\n');
      it.notes = s(sl.highlight);
    } else if (type === 'calendar') {
      it.description = s(sl.description);
      it.calendar = {
        month: /^\d{4}-\d{2}$/.test(s(sl.calendarMonth)) ? sl.calendarMonth : '',
        days: isObj(sl.scheduleDays) ? sl.scheduleDays : {},
        statuses: [
          { key: 'open', label: sl.openHours ? 'Permanence ' + s(sl.openHours) : 'Permanence', color: '#8BC34A' },
          { key: 'short', label: sl.shortHours ? 'Ouverture ' + s(sl.shortHours) : 'Ouverture réduite', color: '#FFE45C' },
          { key: 'closed', label: 'Fermé', color: '#E5484D' }
        ],
        service: s(sl.description).slice(0, 60) || 'Permanences', hours: '', catalogUrl: s(sl.catalogueUrl), catalogLabel: 'Catalogue', note: s(sl.details)
      };
    } else {
      it.description = [s(sl.description), s(sl.details)].filter(function (x) { return x.trim(); }).join('\n\n');
      if (type === 'partner') { it.partner = { offer: s(sl.highlight), amount: '', code: s(sl.code), validUntil: isoDate(sl.deadline) }; }
      else it.notes = s(sl.highlight);
      it.minAge = s(sl.age);
      it.minPart = s(sl.minParticipants); it.maxPart = s(sl.maxParticipants);
      it.points = { value: s(sl.points), counter: sl.counter || '' };
      it.carbon = s(sl.carbon);
      var pm = { tranches: 'tranches', manuel: 'manual', fixe: 'fixed', pourcentage: 'subsidy', part: 'participation' }[sl.pricingMode] || 'tranches';
      var manual = pm === 'manual' ? s(sl.manualPrices).replace(/€/g, '').split(/[;,\/|\s]+/).map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 10) : [];
      it.pricing = { enabled: !!sl.priceEnabled, mode: pm, outside: s(sl.outsidePrice), percent: s(sl.fixedPercent), fixed: s(sl.fixedPrice), manual: manual, overrides: {}, label: '', notes: s(sl.priceNotes) };
      if (sl.section === 'Nouveautés' || sl.badge === 'new') it.editorial = 'new';
      else if (sl.section === 'À venir') it.editorial = 'upcoming';
      if (sl.badge === 'last' || (sl.section === 'Dernière semaine' && !it.regEnd)) it.forceLast = true;
      it.template = { activity: 'classic', deadline: 'classic', immersive: 'immersive', poster: s(sl.details).trim() ? 'animation' : 'poster' }[kind] || 'auto';
    }
    it.createdAt = ctx.createdAt; it.updatedAt = ctx.createdAt;
    it.legacy = { source: 'V7/V8 · compositeur du MEL', raw: stripImages(sl) };
    if (/^EXEMPLE\s+—/.test(it.title)) it.archived = true;
    return M().normalizeItem(it);
  }
  /** MEL V7/V8 complet → {items, issue, settings, archivedExamples}. */
  function fromV8Mel(obj, cats, baseSettings) {
    var st = isObj(obj.settings) ? obj.settings : {};
    var settings = Object.assign({}, baseSettings);
    if (st.title) settings.melTitle = s(st.title);
    if (st.cseUrl) settings.portalUrl = s(st.cseUrl);
    if (st.canvaUrl) settings.canvaUrl = s(st.canvaUrl);
    if (st.planningUrl) settings.planningUrl = s(st.planningUrl);
    if (st.footer) settings.footerNote = s(st.footer);
    if (Array.isArray(st.rates) && st.rates.length === 10) settings.rates = st.rates.map(Number);
    var ref = isoDate(st.newsletterDate) || CSE.dates.todayParis();
    var issue = M().blankIssue(ref);
    if (st.week) issue.week = Number(st.week) || issue.week;
    if (st.year) issue.year = Number(st.year) || issue.year;
    var createdAt = new Date(Date.UTC(+ref.slice(0, 4), +ref.slice(5, 7) - 1, +ref.slice(8, 10) - 30)).toISOString();
    var items = [], idMap = {}, archived = 0;
    var slides = Array.isArray(obj.slides) ? obj.slides : [];
    slides.forEach(function (sl) {
      if (!isObj(sl)) return;
      if (V8_ITEM_KINDS.indexOf(sl.kind) >= 0) {
        var it = fromV8Slide(sl, cats, { createdAt: createdAt });
        if (it.archived) archived++;
        items.push(it); idMap[s(sl.id)] = it.id;
      }
    });
    slides.forEach(function (sl) {
      if (!isObj(sl)) return;
      var page = null;
      var included = sl.included !== false;
      if (V8_ITEM_KINDS.indexOf(sl.kind) >= 0) page = M().blankPage('item', { itemId: idMap[s(sl.id)] });
      else if (sl.kind === 'cover') {
        page = M().blankPage('cover');
        page.opts.important = { label: 'Important', title: '', text: s(sl.highlight) };
        if (s(sl.description).trim()) page.opts.mustSee = { auto: false, text: s(sl.description) };
        page.opts.editorial = s(sl.details);
        page.legacy = { raw: stripImages(sl) };
      } else if (sl.kind === 'newsgrid' || sl.kind === 'lastboard') {
        page = M().blankPage(sl.kind === 'newsgrid' ? 'news' : 'last');
        var ids = (Array.isArray(sl.featureIds) ? sl.featureIds : []).map(function (x) { return idMap[s(x)]; }).filter(Boolean);
        if (ids.length) { page.opts.auto = false; page.opts.ids = ids.slice(0, 6); }
        if (sl.smartCategory && sl.smartCategory !== 'Toutes') page.opts.categoryId = cats.idFor(sl.smartCategory);
        if (sl.title) page.opts.title = s(sl.title);
      } else if (sl.kind === 'agenda' || sl.kind === 'table') {
        page = M().blankPage('upcoming');
        page.opts.style = sl.kind === 'table' ? 'table' : 'list';
        page.opts.auto = false;
        page.opts.rows = (Array.isArray(sl.agendaRows) ? sl.agendaRows : []).map(function (r) { return { date: isoDate(r.date), title: s(r.title), location: s(r.location), type: s(r.status) }; });
        page.opts.title = s(sl.title) || page.opts.title; page.opts.subtitle = s(sl.subtitle); page.opts.note = s(sl.description);
      }
      if (!page) return;
      if (/^EXEMPLE\s+—/.test(s(sl.title))) included = false;
      page.included = included;
      page.density = { aere: 'airy', compact: 'compact' }[sl.density] || 'auto';
      issue.pages.push(M().normalizePage(page));
    });
    return { items: items, issue: issue, settings: settings, archivedExamples: archived };
  }

  /** Lecture des anciennes clés du navigateur → projet V9 + rapport. Ne modifie rien. */
  function fromLegacyStorage(storage) {
    var get = function (k) { try { var v = storage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } };
    var report = { sources: [], items: 0, issues: 0, archivedExamples: 0, notes: [] };
    var p = M().blankProject();
    var v6cat = get(KEYS.v6cat), v1act = get(KEYS.v1act), v1draft = get(KEYS.v1draft), v1rates = get(KEYS.v1rates), v7 = get(KEYS.v7mel);
    if (!v6cat && !v1act && !v7 && !(v1draft && v1draft.title)) return null;
    if (Array.isArray(v6cat) && v6cat.length) { p.categories = M().normalizeCategories(v6cat); report.sources.push('catégories V6 (' + v6cat.length + ')'); }
    if (Array.isArray(v1rates) && v1rates.length === 10) p.settings.rates = v1rates.map(Number);
    var cats = catContext(p.categories);
    if (isObj(v1act)) {
      var list = Object.keys(v1act).map(function (k) { return v1act[k]; }).filter(function (a) { return isObj(a) && s(a.title).trim(); });
      list.forEach(function (a) { p.items.push(fromV6Activity(a, cats, p.settings)); });
      if (list.length) report.sources.push('bibliothèque V6 (' + list.length + ' fiche(s))');
    }
    if (isObj(v1draft) && s(v1draft.title).trim() && !p.items.some(function (x) { return x.title === s(v1draft.title); }) && s(v1draft.title) !== 'EXEMPLE ACTIVITÉ VOYAGE') {
      var d = fromV6Activity(v1draft, cats, p.settings);
      d.title = d.title + ' (brouillon récupéré)';
      p.items.push(d);
      report.sources.push('brouillon V6');
    }
    if (isObj(v7) && Array.isArray(v7.slides)) {
      var r = fromV8Mel(v7, cats, p.settings);
      p.settings = r.settings;
      p.items = p.items.concat(r.items);
      p.issues.push(r.issue);
      p.activeIssueId = r.issue.id;
      report.sources.push('MEL V7/V8 (' + v7.slides.length + ' diapositive(s))');
      report.archivedExamples = r.archivedExamples;
      if (r.archivedExamples) report.notes.push(r.archivedExamples + ' fiche(s) d’exemple « EXEMPLE — … » de la V8 ont été archivées (elles restent consultables dans la bibliothèque).');
    }
    p.categories = M().normalizeCategories(cats.list());
    report.items = p.items.length; report.issues = p.issues.length;
    p.migration = { at: new Date().toISOString(), from: report.sources, notes: report.notes };
    return { project: M().normalizeProject(p), report: report };
  }

  /** Import d'un fichier JSON (toute version). Renvoie {project (partiel), images, report, kind}. */
  function fromBackup(obj, current) {
    if (!isObj(obj)) throw Error('Fichier JSON invalide.');
    var schema = s(obj.schema);
    var base = current ? M().normalizeProject(JSON.parse(JSON.stringify(current))) : M().blankProject();
    var cats = catContext(base.categories);
    var report = { kind: schema || 'inconnu', items: 0, issues: 0, notes: [] };
    var p = { settings: base.settings, categories: base.categories, items: [], issues: [] };
    if (schema === M().SCHEMA) {
      var full = M().normalizeProject(obj);
      report.items = full.items.length; report.issues = full.issues.length;
      return { project: full, images: isObj(obj.images) ? obj.images : {}, report: report, kind: 'v9', full: true };
    }
    if (schema === 'cse-studio:mel-v7') {
      var r = fromV8Mel(obj, cats, base.settings);
      if (Array.isArray(obj.categories)) obj.categories.forEach(function (c) { cats.idFor(c); });
      p.items = r.items; p.issues = [r.issue]; p.settings = r.settings;
      report.notes.push('MEL V7/V8 : ' + (obj.slides || []).length + ' diapositive(s).');
      if (r.archivedExamples) report.notes.push(r.archivedExamples + ' fiche(s) d’exemple archivée(s).');
    } else if (schema === 'cse-studio:3-library') {
      if (Array.isArray(obj.categories)) obj.categories.forEach(function (c) { cats.idFor(typeof c === 'string' ? c : c && c.name); });
      p.items = (obj.activities || []).filter(isObj).map(function (a) { return fromV6Activity(a, cats, base.settings); });
      report.notes.push('Bibliothèque V6 : ' + p.items.length + ' fiche(s).');
    } else if (schema === 'cse-studio:2' || isObj(obj.activity)) {
      p.items = [fromV6Activity(obj.activity || obj, cats, base.settings)];
      report.notes.push('Fiche V6 unique.');
    } else if (Array.isArray(obj.items)) {
      p.items = obj.items.map(M().normalizeItem);
      report.notes.push('Liste de fiches sans schéma reconnu : import prudent.');
    } else throw Error('Format de sauvegarde non reconnu (schéma « ' + (schema || 'absent') + ' »).');
    p.categories = M().normalizeCategories(cats.list());
    report.items = p.items.length; report.issues = p.issues.length;
    return { project: p, images: {}, report: report, kind: schema || 'liste', full: false };
  }

  /** Fusion : ajoute les fiches/MEL importés sans toucher à l'existant (nouveaux identifiants si collision). */
  function merge(current, incoming) {
    var out = M().normalizeProject(JSON.parse(JSON.stringify(current)));
    var cats = catContext(out.categories);
    (incoming.categories || []).forEach(function (c) { cats.idFor(c.name); });
    var catIdMap = {};
    (incoming.categories || []).forEach(function (c) { catIdMap[c.id] = cats.idFor(c.name); });
    var idMap = {};
    (incoming.items || []).forEach(function (it) {
      var copy = M().normalizeItem(JSON.parse(JSON.stringify(it)));
      if (out.items.some(function (x) { return x.id === copy.id; })) { var old = copy.id; copy.id = M().uid('fiche'); idMap[old] = copy.id; }
      if (catIdMap[copy.categoryId]) copy.categoryId = catIdMap[copy.categoryId];
      out.items.push(copy);
    });
    (incoming.issues || []).forEach(function (is) {
      var c = M().normalizeIssue(JSON.parse(JSON.stringify(is)));
      if (out.issues.some(function (x) { return x.id === c.id; })) c.id = M().uid('mel');
      c.pages.forEach(function (pg) { if (idMap[pg.itemId]) pg.itemId = idMap[pg.itemId]; if (pg.opts && Array.isArray(pg.opts.ids)) pg.opts.ids = pg.opts.ids.map(function (x) { return idMap[x] || x; }); });
      out.issues.push(c);
    });
    out.categories = M().normalizeCategories(cats.list());
    return out;
  }

  return { KEYS: KEYS, fromV6Activity: fromV6Activity, fromV8Slide: fromV8Slide, fromV8Mel: fromV8Mel, fromLegacyStorage: fromLegacyStorage, fromBackup: fromBackup, merge: merge, catContext: catContext };
});
