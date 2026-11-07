/* CSE Studio V9 · Règles éditoriales et composition automatique du MEL.
 * - classify() : nouveauté, dernière chance, en cours, à venir, clos, expiré… à partir de la date de référence du MEL.
 * - autoCompose() : construit l'ordre des pages d'un numéro à partir de la bibliothèque.
 * - audit() / checkItem() : doublons, dates manquantes, fiches expirées, URL invalides, incohérences. */
(function (root, factory) {
  'use strict';
  var mod = factory(root.CSE || {});
  root.CSE = root.CSE || {};
  root.CSE.compose = mod;
  if (typeof module === 'object' && module.exports) module.exports = mod;
})(typeof window !== 'undefined' ? window : globalThis, function (CSE) {
  'use strict';
  var D = function () { return CSE.dates; };
  var M = function () { return CSE.model; };

  var RUBRICS = {
    last: { label: 'Dernière semaine', color: '#D9480F' },
    new: { label: 'Nouveauté', color: '#1B7F4C' },
    ongoing: { label: 'En cours', color: '#2F5DA8' },
    upcoming: { label: 'À venir', color: '#6B4FBB' },
    full: { label: 'Complet', color: '#8A6D1F' },
    closed: { label: 'Inscriptions closes', color: '#6B7280' },
    expired: { label: 'Expirée', color: '#9CA3AF' },
    cancelled: { label: 'Annulée', color: '#9CA3AF' },
    info: { label: 'Information', color: '#2F5DA8' },
    partner: { label: 'Partenaire', color: '#7A4FD6' },
    calendar: { label: 'Permanences', color: '#1B7F79' },
    permanent: { label: 'Permanent', color: '#1B7F79' },
    rules: { label: 'Règlement', color: '#374151' },
    archived: { label: 'Archivée', color: '#9CA3AF' }
  };

  function createdDay(item) {
    var c = String(item.createdAt || '');
    if (/^\d{4}-\d{2}-\d{2}T/.test(c)) { var t = new Date(c); if (!isNaN(t)) return D().todayParis(t); }
    return /^\d{4}-\d{2}-\d{2}$/.test(c) ? c : '';
  }

  /** Classe une fiche à la date de référence ref (AAAA-MM-JJ).
   *  issue (facultatif) : MEL concerné ; son historique newSeen empêche qu'une nouveauté déjà annoncée
   *  pendant settings.newMaxWeeks semaines redevienne « nouveauté » lors d'une duplication. */
  function classify(item, ref, settings, issue) {
    var d = D(), s = settings || {};
    var lastDays = s.lastDays === undefined ? 7 : Math.max(0, Number(s.lastDays) || 0), newDays = s.newDays === undefined ? 7 : s.newDays;
    var r = { rubric: 'ongoing', isNew: false, isLast: false, open: false, closed: false, expired: false, soon: false, daysLeft: null, regLabel: '' };
    if (item.archived) { r.rubric = 'archived'; return r; }
    var created = createdDay(item);
    var age = created ? d.diffDays(ref, created) : null;
    r.isNew = item.editorial === 'new' || (item.editorial === 'auto' && newDays > 0 && age !== null && age >= 0 && age < newDays);
    var seen = issue && issue.newSeen && issue.newSeen[item.id];
    if (r.isNew && seen && /^\d{4}-\d{2}-\d{2}$/.test(seen)) {
      var maxDays = 7 * Math.max(1, Number(s.newMaxWeeks) || 2);
      if (d.diffDays(ref, seen) >= maxDays) { r.isNew = false; r.newSince = seen; }
    }
    var end = item.dateEnd || item.dateStart;
    if (item.type === 'rules') { r.rubric = 'rules'; return r; }
    if (item.type === 'calendar') { r.rubric = 'calendar'; return r; }
    if (item.type === 'page') { r.rubric = 'permanent'; return r; }
    if (item.type === 'info') {
      r.expired = !!(end && d.diffDays(end, ref) < 0);
      r.rubric = r.expired ? 'expired' : 'info';
      return r;
    }
    if (item.type === 'partner') {
      var until = item.partner && item.partner.validUntil || item.regEnd || item.dateEnd;
      r.expired = !!(until && d.diffDays(until, ref) < 0);
      r.daysLeft = until ? d.diffDays(until, ref) : null;
      r.rubric = r.expired ? 'expired' : 'partner';
      return r;
    }
    // Activités
    r.expired = !!(end && d.diffDays(end, ref) < 0);
    var st = item.regStatus || 'auto';
    if (st === 'auto') {
      if (item.regEnd && d.diffDays(item.regEnd, ref) < 0) st = 'closed';
      else if (item.regStart && d.diffDays(item.regStart, ref) > 0) st = 'soon';
      else st = 'open';
    }
    r.open = st === 'open'; r.closed = st === 'closed'; r.soon = st === 'soon';
    r.regLabel = { open: 'Inscriptions ouvertes', soon: 'Inscriptions prochainement', full: 'Complet', closed: 'Inscriptions closes', cancelled: 'Annulé' }[st] || '';
    r.daysLeft = item.regEnd ? d.diffDays(item.regEnd, ref) : null;
    var inWindow = r.daysLeft !== null && r.daysLeft >= 0 && r.daysLeft <= lastDays;
    // Une date limite dépassée ne peut jamais redevenir « Dernière chance », même en statut manuel.
    r.isLast = r.open && !r.expired && !item.excludeLast && (r.daysLeft === null || r.daysLeft >= 0) && (inWindow || !!item.forceLast);
    if (r.expired) r.rubric = 'expired';
    else if (st === 'cancelled') r.rubric = 'cancelled';
    else if (r.isLast) r.rubric = 'last';
    else if (item.editorial === 'upcoming') r.rubric = 'upcoming';
    else if (item.editorial === 'permanent') r.rubric = 'permanent';
    else if (item.editorial === 'ongoing') r.rubric = st === 'closed' ? 'closed' : 'ongoing';
    else if (st === 'closed') r.rubric = 'closed';
    else if (st === 'full') r.rubric = 'full';
    else if (r.isNew && st === 'open') r.rubric = 'new';
    else if (st === 'soon') r.rubric = 'upcoming';
    else r.rubric = 'ongoing';
    return r;
  }

  function byDate(a, b) {
    return String(a.dateStart || '9999').localeCompare(String(b.dateStart || '9999')) || String(a.title).localeCompare(String(b.title), 'fr');
  }
  function byDeadline(a, b) {
    return String(a.regEnd || '9999').localeCompare(String(b.regEnd || '9999')) || byDate(a, b);
  }
  function itemsWith(project, ref, rubric, categoryId, issue) {
    return project.items.filter(function (it) {
      if (it.archived) return false;
      if (categoryId && it.categoryId !== categoryId) return false;
      return classify(it, ref, project.settings, issue).rubric === rubric;
    });
  }
  function findItem(project, id) { return project.items.find(function (it) { return it.id === id; }) || null; }

  /** Activités retenues pour une mosaïque (nouveautés / dernières chances), dans l'ordre d'affichage. */
  function selection(page, project, issue) {
    var ref = issue.refDate, o = page.opts || {};
    var rubric = page.kind === 'last' ? 'last' : 'new';
    var list;
    if (o.auto === false && Array.isArray(o.ids)) list = o.ids.map(function (id) { return findItem(project, id); }).filter(function (it) { return it && !it.archived; });
    else list = itemsWith(project, ref, rubric, o.categoryId, issue).sort(rubric === 'last' ? byDeadline : byDate);
    if (rubric === 'new') list = list.filter(function (it) { return it.type === 'activity' || it.type === 'partner' || it.type === 'info'; });
    return list;
  }
  /** Contenus automatiques de la couverture. */
  function coverData(page, project, issue) {
    var o = page.opts || {}, ref = issue.refDate;
    var last = itemsWith(project, ref, 'last', '', issue).sort(byDeadline);
    var news = (o.newsAuto === false && Array.isArray(o.newsIds))
      ? o.newsIds.map(function (id) { return findItem(project, id); }).filter(function (it) { return it && !it.archived; })
      : project.items.filter(function (it) { var c = classify(it, ref, project.settings, issue); return !it.archived && c.isNew && !c.expired && ['full', 'closed', 'cancelled'].indexOf(c.rubric) < 0 && (it.type === 'activity' || it.type === 'partner'); }).sort(byDate);
    return { last: last, news: news.slice(0, 4), newsTotal: Math.max(news.length, Number(o.frozenNewsTotal) || 0) };
  }
  /** Lignes d'un programme « À venir » (automatique depuis la bibliothèque ou saisie manuelle). */
  function upcomingRows(page, project, issue) {
    var o = page.opts || {};
    if (o.auto === false) return (o.rows || []).filter(function (r) { return r.title; }).slice().sort(function (a, b) { return String(a.date || '9999').localeCompare(String(b.date || '9999')); });
    var ref = issue.refDate;
    return project.items.filter(function (it) {
      if (it.archived || it.type !== 'activity' || !it.dateStart) return false;
      if (o.categoryId && it.categoryId !== o.categoryId) return false;
      if (D().diffDays(it.dateStart, ref) < 0) return false;
      if (o.from && it.dateStart < o.from) return false;
      if (o.to && it.dateStart > o.to) return false;
      var c = classify(it, ref, project.settings, issue);
      return c.rubric !== 'cancelled' && c.rubric !== 'expired';
    }).sort(byDate).map(function (it) {
      var c = classify(it, ref, project.settings, issue);
      return { date: it.dateStart, dateEnd: it.dateEnd, title: it.title, location: it.location, type: M().categoryName(project, it), status: c.regLabel, itemId: it.id };
    });
  }

  /* Ordre éditorial fixe du MEL, avec liberté de tri à l'intérieur des rubriques.
   * Le groupe d'une page dépend de sa fiche et de la date de RÉFÉRENCE du MEL,
   * jamais de la date actuelle : un ancien numéro ne change donc pas d'ordre. */
  var SECTIONS = [
    { id: 'cover', label: '1 · Couverture' },
    { id: 'opening', label: '2 · Ouvertures et permanences' },
    { id: 'important', label: '3 · Informations importantes' },
    { id: 'last', label: '4 · Dernières chances' },
    { id: 'new', label: '5 · Nouvelles activités' },
    { id: 'ongoing', label: '6 · Inscriptions en cours' },
    { id: 'announcements', label: '7 · Annonces et événements' },
    { id: 'partners', label: '8 · Partenaires et offres' },
    { id: 'planning', label: '9 · Plannings et activités à venir' },
    { id: 'rules', label: '10 · Règlement et inscriptions' }
  ];
  function sectionForPage(page, project, issue) {
    if (page.kind === 'cover') return page.opts && page.opts.extraCover ? 'important' : 'cover';
    if (page.kind === 'last') return 'last';
    if (page.kind === 'news') return 'new';
    if (page.kind === 'upcoming') return 'planning';
    var it = page.kind === 'item' ? findItem(project, page.itemId) : null;
    if (!it) return 'important'; // page devenue orpheline : visible dans les alertes
    if (it.type === 'calendar') return 'opening';
    if (it.type === 'rules') return 'rules';
    if (it.type === 'partner') return 'partners';
    if (it.type === 'info') return 'important';
    if (it.melSection && it.melSection !== 'auto' && ['important', 'announcements', 'planning'].indexOf(it.melSection) >= 0) return it.melSection;
    if (it.type === 'page') return 'important';
    var ref = issue && issue.refDate || D().todayParis();
    var cls = classify(it, ref, project.settings, issue);
    if (cls.rubric === 'last') return 'last';
    if (cls.rubric === 'new') return 'new';
    if (cls.rubric === 'upcoming') return 'planning';
    return 'ongoing';
  }
  function enforceOrder(pages, project, issue) {
    var buckets = {};
    SECTIONS.forEach(function (s) { buckets[s.id] = []; });
    (pages || []).forEach(function (pg) { buckets[sectionForPage(pg, project, issue)].push(pg); });
    // Une seule couverture à la première position. Une couverture historique
    // supplémentaire reste accessible, mais se range dans Informations.
    if (buckets.cover.length > 1) {
      var extraCovers = buckets.cover.splice(1);
      extraCovers.forEach(function (pg) { pg.opts = pg.opts || {}; pg.opts.extraCover = true; });
      buckets.important.unshift.apply(buckets.important, extraCovers);
    }
    return SECTIONS.reduce(function (out, s) { return out.concat(buckets[s.id]); }, []);
  }
  /** Déplace une page avant/après une autre page de sa rubrique, sans jamais franchir une section.
   * Quand on glisse vers le bas, la page se place après la cible (sinon le voisin immédiat ne bougeait pas).
   * Renvoie false si le déplacement est interdit, sinon true. */
  function moveWithinSection(pages, from, to, project, issue) {
    if (!Array.isArray(pages) || from === to || from < 0 || to < 0 || from >= pages.length || to >= pages.length) return false;
    var sourceSection = sectionForPage(pages[from], project, issue);
    if (sourceSection === 'cover' || sourceSection !== sectionForPage(pages[to], project, issue)) return false;
    var pg = pages.splice(from, 1)[0];
    pages.splice(to, 0, pg);
    return true;
  }
  function pageKey(pg) {
    return pg.kind === 'item' ? 'item:' + pg.itemId : pg.kind + (pg.kind === 'upcoming' ? ':' + ((pg.opts || {}).categoryId || '') + ':' + ((pg.opts || {}).style || 'list') : '');
  }
  /** Ne détruit jamais une page existante lors de l'actualisation automatique :
   * identifiants, choix de modèle, surcharge locale et exclusion sont conservés.
   * Les pages ajoutées manuellement restent dans le MEL. */
  function refreshPreservingEdits(project, issue) {
    var generated = autoCompose(project, issue), old = (issue.pages || []).slice();
    var keyOf = pageKey;
    var used = new Set();
    var pages = generated.map(function (pg) {
      var oldPg = old.find(function (x) { return !used.has(x.id) && keyOf(x) === keyOf(pg); });
      if (oldPg) { used.add(oldPg.id); return oldPg; }
      return pg;
    });
    old.forEach(function (pg) { if (!used.has(pg.id)) pages.push(pg); });
    return enforceOrder(pages, project, issue);
  }

  /** Compose automatiquement un numéro. opts.detailPages : une page détaillée par activité. */
  function autoCompose(project, issue, opts) {
    opts = Object.assign({ detailPages: true, upcoming: true }, opts || {});
    var M_ = M(), ref = issue.refDate, s = project.settings;
    var live = project.items.filter(function (it) { return !it.archived; });
    var cls = {};
    live.forEach(function (it) { cls[it.id] = classify(it, ref, s, issue); });
    var of = function (rub) { return live.filter(function (it) { return cls[it.id].rubric === rub; }); };
    var pages = [M_.blankPage('cover')];
    var add = function (it) { pages.push(M_.blankPage('item', { itemId: it.id })); };
    var eligible = function (it) { return ['expired', 'closed', 'cancelled', 'archived'].indexOf(cls[it.id].rubric) < 0; };
    function sectionItems(sec) {
      return live.filter(function (it) {
        return eligible(it) && sectionForPage({ kind: 'item', itemId: it.id }, project, issue) === sec;
      });
    }
    sectionItems('opening').sort(byDate).forEach(add);
    sectionItems('important').sort(function (a, b) { return (cls[b.id].isNew ? 1 : 0) - (cls[a.id].isNew ? 1 : 0) || byDate(a, b); }).forEach(add);
    var last = sectionItems('last').sort(byDeadline);
    if (last.length) { pages.push(M_.blankPage('last')); if (opts.detailPages) last.forEach(add); }
    var news = sectionItems('new').sort(byDate);
    if (news.length) { pages.push(M_.blankPage('news')); if (opts.detailPages) news.forEach(add); }
    sectionItems('ongoing').sort(byDeadline).forEach(add);
    sectionItems('announcements').sort(byDate).forEach(add);
    sectionItems('partners').sort(function (a, b) { return (cls[b.id].isNew ? 1 : 0) - (cls[a.id].isNew ? 1 : 0) || String(a.title).localeCompare(String(b.title), 'fr'); }).forEach(add);
    // Les annonces « à venir » peuvent aussi être présentées par une fiche propre.
    sectionItems('planning').sort(byDate).forEach(add);
    if (opts.upcoming) {
      var upc = live.filter(function (it) { return it.type === 'activity' && it.dateStart && D().diffDays(it.dateStart, ref) >= 0 && ['upcoming', 'ongoing', 'new', 'last', 'full'].indexOf(cls[it.id].rubric) >= 0; });
      if (upc.length >= 3) pages.push(M_.blankPage('upcoming', { opts: Object.assign(M_.blankPage('upcoming').opts, { style: 'list' }) }));
    }
    sectionItems('rules').forEach(add);
    var suppressed = issue.suppressed || [];
    return enforceOrder(pages.filter(function (pg) { return suppressed.indexOf(pageKey(pg)) < 0; }), project, issue);
  }

  /* ================= V10 · Réemploi hebdomadaire ================= */

  /** Champs d'une fiche personnalisables pour un seul MEL (« cette diapositive uniquement »).
   *  Les objets (tarifs, points, lien, offre, calendrier) et les listes (contacts, photos) sont
   *  remplacés en bloc : la surcharge contient la valeur complète affichée cette semaine. */
  var OVERRIDE_FIELDS = ['title', 'subtitle', 'categoryId', 'summary', 'description', 'highlights', 'program', 'notes', 'transport', 'lodging', 'conditions',
    'regInfo', 'location', 'address', 'dateStart', 'dateEnd', 'timeStart', 'timeEnd', 'regStart', 'regEnd', 'regStatus', 'forceLast', 'excludeLast',
    'minPart', 'maxPart', 'minAge', 'audience', 'carbon', 'contacts', 'photos', 'photoMeta', 'pricing', 'points', 'link', 'partner', 'calendar', 'editorial'];
  function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
  function hasOverrides(page) {
    var o = page && page.opts;
    return !!(o && o.useOverrides && o.override && Object.keys(o.override).some(function (k) { return OVERRIDE_FIELDS.indexOf(k) >= 0; }));
  }
  /** Fiche telle qu'affichée dans CE MEL : fiche source + personnalisations de la page (jamais l'inverse). */
  function effectiveItem(page, item) {
    if (!item || !hasOverrides(page)) return item;
    var ov = page.opts.override, out = Object.assign({}, item);
    OVERRIDE_FIELDS.forEach(function (k) {
      if (!Object.prototype.hasOwnProperty.call(ov, k)) return;
      var v = ov[k];
      if (['title', 'subtitle', 'summary', 'description', 'highlights', 'program', 'notes', 'transport', 'lodging', 'conditions', 'regInfo', 'location', 'address', 'audience', 'carbon', 'minPart', 'maxPart', 'minAge'].indexOf(k) >= 0) out[k] = String(v === undefined || v === null ? '' : v);
      else out[k] = clone(v);
    });
    out.overridden = Object.keys(ov).filter(function (k) { return OVERRIDE_FIELDS.indexOf(k) >= 0; });
    return out;
  }
  /** Enregistre la différence entre un brouillon de fiche et sa source dans la page (personnalisation locale). */
  function setOverrides(page, source, draft) {
    page.opts = page.opts || {};
    var ov = {};
    OVERRIDE_FIELDS.forEach(function (k) {
      var a = JSON.stringify(source[k] === undefined ? null : source[k]), b = JSON.stringify(draft[k] === undefined ? null : draft[k]);
      if (a !== b) ov[k] = clone(draft[k]);
    });
    page.opts.override = ov;
    page.opts.useOverrides = Object.keys(ov).length > 0;
    return ov;
  }
  /** Retire la personnalisation d'un champ (ou de toute la page si field est omis). */
  function resetOverride(page, field) {
    var o = page && page.opts;
    if (!o || !o.override) return;
    if (field) delete o.override[field]; else o.override = {};
    o.useOverrides = Object.keys(o.override).length > 0;
  }

  var ISSUE_STATUS = [
    { id: 'draft', label: 'Brouillon' }, { id: 'review', label: 'À relire' }, { id: 'validated', label: 'Validé' },
    { id: 'published', label: 'Publié (figé)' }, { id: 'archived', label: 'Archivé' }
  ];
  function isFrozen(issue) { return !!(issue && issue.snapshot && (issue.status === 'published' || issue.status === 'archived')); }
  /** Vue de rendu d'un MEL : la bibliothèque vivante pour un brouillon, l'instantané pour un MEL publié. */
  function issueView(project, issue) {
    if (!isFrozen(issue)) return { project: project, issue: issue, frozen: false };
    var snap = issue.snapshot;
    var proj = Object.assign({}, project, { items: snap.items || [], categories: snap.categories || project.categories, settings: Object.assign({}, project.settings, snap.settings || {}) });
    return { project: proj, issue: Object.assign({}, issue, { pages: snap.pages || issue.pages, newSeen: snap.newSeen || issue.newSeen }), frozen: true };
  }
  /** Identifiants des fiches utilisées par un MEL (pages, mosaïques, couverture, programmes automatiques). */
  function usedItemIds(project, issue) {
    var ids = {};
    (issue.pages || []).forEach(function (pg) {
      if (pg.kind === 'item' && pg.itemId) ids[pg.itemId] = 1;
      if (pg.kind === 'news' || pg.kind === 'last') selection(pg, project, issue).forEach(function (it) { ids[it.id] = 1; });
      if (pg.kind === 'cover') { var cd = coverData(pg, project, issue); cd.news.concat(cd.last).forEach(function (it) { ids[it.id] = 1; }); }
      if (pg.kind === 'upcoming') upcomingRows(pg, project, issue).forEach(function (r) { if (r.itemId) ids[r.itemId] = 1; });
    });
    return Object.keys(ids);
  }
  /** Fige un MEL au moment de la publication : copie des fiches, catégories, réglages et sélections
   *  automatiques matérialisées. Le MEL publié reste consultable et exportable tel que diffusé. */
  function freezeIssue(project, issue) {
    var pages = clone(issue.pages || []);
    pages.forEach(function (pg) {
      pg.opts = pg.opts || {};
      if (pg.kind === 'news' || pg.kind === 'last') { pg.opts.ids = selection(pg, project, issue).map(function (it) { return it.id; }); pg.opts.auto = false; }
      if (pg.kind === 'cover') { var cd = coverData(pg, project, issue); pg.opts.newsIds = cd.news.map(function (it) { return it.id; }); pg.opts.newsAuto = false; pg.opts.frozenNewsTotal = cd.newsTotal; }
      if (pg.kind === 'upcoming' && pg.opts.auto !== false) {
        pg.opts.rows = upcomingRows(pg, project, issue).map(function (r) { return { date: r.date, dateEnd: r.dateEnd || '', title: r.title, location: r.location || '', type: r.type || '', status: r.status || '', itemId: r.itemId || '' }; });
        pg.opts.auto = false;
      }
    });
    var items = usedItemIds(project, issue).map(function (id) { return findItem(project, id); }).filter(Boolean).map(clone);
    issue.snapshot = { frozenAt: new Date().toISOString(), refDate: issue.refDate, pages: pages, items: items, categories: clone(project.categories), settings: clone(project.settings), newSeen: clone(issue.newSeen || {}) };
    return issue.snapshot;
  }
  /** Change le statut ; « publié » fige le MEL, « rouvrir » conserve l'instantané précédent. */
  function setIssueStatus(project, issue, status) {
    if (ISSUE_STATUS.every(function (s) { return s.id !== status; })) return issue;
    if (status === 'published' && !isFrozen(issue)) freezeIssue(project, issue);
    if ((status === 'draft' || status === 'review' || status === 'validated') && issue.snapshot) {
      issue.previousSnapshots = (issue.previousSnapshots || []).concat([issue.snapshot]).slice(-3);
      delete issue.snapshot;
    }
    issue.status = status;
    issue.updatedAt = new Date().toISOString();
    return issue;
  }

  /** Crée le MEL d'une nouvelle semaine à partir d'un MEL précédent, SANS modifier ce dernier.
   *  Pages, personnalisations, exclusions, modèles et réglages sont repris ; les rubriques sont
   *  recalculées à la nouvelle date ; les nouveautés déjà annoncées ne sont pas réannoncées
   *  au-delà de settings.newMaxWeeks semaines. Renvoie { issue, report }. */
  function duplicateIssue(project, source, newRef) {
    var M_ = M(), d = D();
    var view = issueView(project, source);
    var is = M_.blankIssue(newRef);
    is.title = source.title || ''; is.numbering = !!source.numbering; is.status = 'draft'; is.sourceIssueId = source.id;
    // Historique des nouveautés : celles annoncées dans le MEL source restent datées de leur 1re annonce.
    var seen = clone(source.newSeen || {}) || {};
    var announced = {};
    view.issue.pages.forEach(function (pg) {
      if (pg.kind === 'news') selection(pg, view.project, view.issue).forEach(function (it) { announced[it.id] = 1; });
      if (pg.kind === 'cover') coverData(pg, view.project, view.issue).news.forEach(function (it) { announced[it.id] = 1; });
      if (pg.kind === 'item' && sectionForPage(pg, view.project, view.issue) === 'new') announced[pg.itemId] = 1;
    });
    Object.keys(announced).forEach(function (id) { if (!seen[id]) seen[id] = source.refDate; });
    is.newSeen = seen;
    is.suppressed = (source.suppressed || []).slice();
    var report = { source: { id: source.id, week: source.week, year: source.year, refDate: source.refDate }, kept: [], moved: [], added: [], removed: [], excluded: [], review: [], notNewAnymore: [] };
    var labelOf = function (pg) {
      if (pg.kind === 'item') { var it = findItem(project, pg.itemId); return it ? (effectiveItem(pg, it).title || 'Sans titre') : 'Fiche supprimée'; }
      return { cover: 'Couverture', news: 'Nouveautés', last: 'Dernières chances', upcoming: (pg.opts && pg.opts.title) || 'Programme' }[pg.kind] || pg.kind;
    };
    var carried = [];
    (source.pages || []).forEach(function (pg) {
      var c = M_.normalizePage(clone(pg));
      c.id = M_.uid('page');
      if (c.kind === 'item') {
        var it = findItem(project, c.itemId);
        if (!it) { report.removed.push({ label: labelOf(pg), reason: 'fiche supprimée de la bibliothèque' }); return; }
        if (it.archived) { report.removed.push({ label: it.title, reason: 'fiche archivée' }); return; }
        var cls = classify(it, newRef, project.settings, is);
        if (['expired', 'closed', 'cancelled'].indexOf(cls.rubric) >= 0) { report.removed.push({ label: it.title, reason: (RUBRICS[cls.rubric] || {}).label || cls.rubric }); return; }
        var before = sectionForPage(pg, view.project, view.issue), after = sectionForPage(c, project, is);
        if (before !== after) report.moved.push({ label: labelOf(c), from: before, to: after });
        else report.kept.push({ label: labelOf(c) });
        if (announced[it.id] && !cls.isNew && cls.newSince) report.notNewAnymore.push({ label: it.title, since: cls.newSince });
        if (it.type === 'calendar' && it.calendar && it.calendar.month && it.calendar.month < newRef.slice(0, 7)) report.review.push({ label: it.title, reason: 'calendrier du mois de ' + d.monthLabel(it.calendar.month) + ' : à mettre à jour', itemId: it.id, pageId: c.id, action: 'calendar-month' });
        if (isFrozen(source)) {
          var snapIt = (source.snapshot.items || []).find(function (x) { return x.id === it.id; });
          if (snapIt && snapIt.updatedAt !== it.updatedAt) report.review.push({ label: it.title, reason: 'fiche modifiée dans la bibliothèque depuis la publication du MEL précédent', itemId: it.id, pageId: c.id });
        }
        if (hasOverrides(c)) report.review.push({ label: labelOf(c), reason: 'personnalisation de la semaine précédente conservée : à relire', pageId: c.id });
      } else {
        report.kept.push({ label: labelOf(c) });
        if (c.kind === 'cover') {
          var o = c.opts || {};
          if ((o.important && (o.important.title || o.important.text)) || (o.extraNotes || []).length || o.editorial) report.review.push({ label: 'Couverture', reason: 'messages de la semaine précédente conservés : à relire', pageId: c.id });
        }
      }
      if (!c.included) report.excluded.push({ label: labelOf(c) });
      carried.push(c);
    });
    is.pages = carried;
    // Ajout des nouvelles fiches de la semaine (sans toucher aux pages reprises).
    var beforeKeys = {};
    is.pages.forEach(function (pg) { beforeKeys[pageKey(pg)] = 1; });
    is.pages = refreshPreservingEdits(project, is);
    is.pages.forEach(function (pg) { if (!beforeKeys[pageKey(pg)]) report.added.push({ label: labelOf(pg), section: sectionForPage(pg, project, is) }); });
    if (!is.pages.some(function (pg) { return pg.kind === 'cover' && !(pg.opts || {}).extraCover; })) is.pages.unshift(M_.blankPage('cover'));
    is.pages = enforceOrder(is.pages, project, is);
    // Images à réimporter (Web non importées ou introuvables).
    var I = CSE.images;
    if (I && typeof I.status === 'function') {
      is.pages.forEach(function (pg) {
        if (pg.kind !== 'item') return;
        var it = findItem(project, pg.itemId); if (!it) return;
        (effectiveItem(pg, it).photos || []).forEach(function (src) { var st = I.status(src); if (st !== 'ready') report.review.push({ label: it.title, reason: st === 'remote' ? 'photo Web non importée (non intégrable au PowerPoint)' : 'photo introuvable', itemId: it.id, pageId: pg.id }); });
      });
    }
    is.diffReport = report;
    return { issue: is, report: report };
  }
  /** Semaine ISO suivante : lundi de la semaine qui suit la date de référence. */
  function nextWeekRef(ref) { var d = D(); return d.addDays(d.monday(ref), 7); }

  /* ---------- Contrôles ---------- */
  function validUrl(u, allowRelative) {
    var s = String(u || '').trim();
    if (!s) return true;
    if (allowRelative && /^(assets\/|img:|data:image\/)/.test(s)) return true;
    try { var x = new URL(s); return (x.protocol === 'https:' || x.protocol === 'http:') && !!x.hostname && !x.username && !x.password; } catch (e) { return false; }
  }
  function linkOf(item, settings) {
    var l = item.link || {};
    if (l.type === 'none') return '';
    if (l.type === 'custom') return validUrl(l.url) && l.url ? String(l.url).trim() : '';
    var portal = String(settings && settings.portalUrl || M().PORTAL).trim();
    return validUrl(portal) && portal ? portal : M().PORTAL;
  }
  /** Contrôles d'une fiche : [['block'|'warn'|'info', message]]. */
  function checkItem(item, project, ref) {
    var out = [], d = D();
    var t = item.type;
    if (!String(item.title).trim()) out.push(['block', 'Le titre est obligatoire.']);
    if (item.dateStart && item.dateEnd && item.dateEnd < item.dateStart) out.push(['block', 'La date de fin précède la date de début.']);
    if (item.regStart && item.regEnd && item.regEnd < item.regStart) out.push(['block', 'La clôture des inscriptions précède leur ouverture.']);
    if (item.minPart && item.maxPart && Number(item.minPart) > Number(item.maxPart)) out.push(['warn', 'Le minimum de participants dépasse le maximum.']);
    if (t === 'activity' && !item.dateStart && item.editorial !== 'permanent') out.push(['warn', 'Date de l’activité manquante.']);
    if (t === 'activity' && item.regEnd && item.dateStart && item.regEnd > (item.dateEnd || item.dateStart)) out.push(['warn', 'La clôture des inscriptions est postérieure à l’activité.']);
    if (item.link && item.link.type === 'custom') {
      if (!String(item.link.url).trim()) out.push(['warn', 'Lien personnalisé choisi, mais aucune URL saisie : aucun lien ne sera affiché.']);
      else if (!validUrl(item.link.url)) out.push(['block', 'Le lien personnalisé doit être une adresse complète commençant par https://']);
    }
    (item.photos || []).forEach(function (p, i) { if (!validUrl(p, true)) out.push(['warn', 'Adresse de la photo ' + (i + 1) + ' invalide.']); });
    if (t === 'calendar') {
      if (!item.calendar.month) out.push(['warn', 'Choisir le mois du calendrier.']);
      else if (!Object.keys(item.calendar.days || {}).some(function (k) { return k.slice(0, 7) === item.calendar.month; })) out.push(['warn', 'Aucun jour coloré pour ce mois.']);
      if (item.calendar.catalogUrl && !validUrl(item.calendar.catalogUrl)) out.push(['warn', 'Lien du catalogue invalide.']);
    }
    if (item.pricing && item.pricing.enabled && project && project.settings.pricingModule !== false) {
      CSE.pricing.fromPricing(item.pricing, project.settings).issues.forEach(function (x) { out.push(x); });
    }
    if (item.points && item.points.value && !item.points.counter) out.push(['info', 'Points saisis sans compteur : seule la valeur sera affichée.']);
    (item.contacts || []).forEach(function (c) {
      var e = String(c.email || '').trim();
      if (e && !/^[^\s@<>"'(),;:\\]+@[^\s@<>"'(),;:\\]+\.[A-Za-z]{2,}$/.test(e)) out.push(['info', 'E-mail de « ' + (c.name || e) + ' » invalide : le nom sera affiché sans lien.']);
    });
    if (item.forceLast && !item.regEnd) out.push(['warn', '« Dernière chance » forcée sans date limite d’inscription : aucune date ne sera affichée.']);
    if (t === 'activity' && item.regStatus === 'open' && ref && item.regEnd && d.diffDays(item.regEnd, ref) < 0)
      out.push(['warn', 'Inscriptions indiquées comme ouvertes alors que leur date de clôture est passée : vérifiez le statut.']);
    if (t === 'activity' && item.regStatus === 'full' && item.forceLast)
      out.push(['info', 'Activité complète : la mention « Dernière chance » ne sera pas affichée.']);
    if (ref && project) {
      var c = classify(item, ref, project.settings);
      if (c.expired) out.push(['warn', 'Fiche expirée à la date du MEL (' + d.fmtLong(ref) + ').']);
      else if (c.closed && t === 'activity') out.push(['info', 'Inscriptions closes à la date du MEL.']);
    }
    if (project && item.categoryId && !project.categories.some(function (x) { return x.id === item.categoryId; })) out.push(['warn', 'Catégorie inconnue.']);
    return out;
  }
  function normTitle(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
  /** Groupes de doublons probables (même titre normalisé et même date de début). */
  function duplicates(project) {
    var map = {};
    project.items.forEach(function (it) {
      if (it.archived || !normTitle(it.title)) return;
      var k = it.type + '|' + normTitle(it.title) + '|' + (it.dateStart || '');
      (map[k] = map[k] || []).push(it);
    });
    return Object.keys(map).map(function (k) { return map[k]; }).filter(function (g) { return g.length > 1; });
  }
  /** Audit d'un numéro : [{level, msg, itemId?, pageId?}] (fiches telles qu'affichées dans ce MEL). */
  function audit(project, issue) {
    var out = [], ref = issue ? issue.refDate : D().todayParis();
    if (!issue) { duplicates(project).forEach(function (g) { out.push({ level: 'warn', msg: 'Doublon probable : « ' + g[0].title + ' » (' + g.length + ' fiches).', itemId: g[0].id }); }); return out; }
    var view = issueView(project, issue), proj = view.project, is = view.issue;
    duplicates(proj).forEach(function (g) { out.push({ level: 'warn', msg: 'Doublon probable : « ' + g[0].title + ' » (' + g.length + ' fiches).', itemId: g[0].id }); });
    var used = {}, I = CSE.images;
    is.pages.forEach(function (p) {
      if (p.kind !== 'item') return;
      var src = findItem(proj, p.itemId);
      if (!src) { out.push({ level: 'warn', msg: 'Une page référence une fiche supprimée.', pageId: p.id }); return; }
      if (!p.included) return;
      var it = effectiveItem(p, src);
      if (used[it.id]) out.push({ level: 'info', msg: '« ' + it.title + ' » apparaît plusieurs fois dans ce MEL.', pageId: p.id, itemId: it.id });
      used[it.id] = 1;
      checkItem(it, proj, ref).forEach(function (x) { if (x[0] !== 'info') out.push({ level: x[0], msg: '« ' + (it.title || 'Sans titre') + ' » : ' + x[1], pageId: p.id, itemId: it.id }); });
      if (I && typeof I.status === 'function') (it.photos || []).forEach(function (ph) {
        var st = I.status(ph);
        if (st !== 'ready') out.push({ level: 'block', code: 'image', src: ph, msg: '« ' + (it.title || 'Sans titre') + ' » : ' + (st === 'remote' ? 'photo Web non importée, impossible à intégrer au PowerPoint (CORS).' : 'photo introuvable dans le stockage local.'), pageId: p.id, itemId: it.id });
      });
    });
    var order = enforceOrder(is.pages, proj, is);
    if (order.some(function (p, i) { return p !== is.pages[i]; })) out.push({ level: 'info', msg: 'Les pages seront replacées dans l’ordre éditorial : couverture, ouvertures, informations, dernières chances, nouveautés, inscriptions, annonces, partenaires, plannings et règlement.' });
    if (!is.pages.some(function (p) { return p.included; })) out.push({ level: 'block', msg: 'Aucune page incluse dans ce MEL.' });
    return out;
  }

  return { RUBRICS: RUBRICS, SECTIONS: SECTIONS, sectionForPage: sectionForPage, pageKey: pageKey, refreshPreservingEdits: refreshPreservingEdits, classify: classify, selection: selection, coverData: coverData, upcomingRows: upcomingRows, enforceOrder: enforceOrder, moveWithinSection: moveWithinSection,
    autoCompose: autoCompose, checkItem: checkItem, duplicates: duplicates, audit: audit, validUrl: validUrl, linkOf: linkOf, findItem: findItem,
    byDate: byDate, byDeadline: byDeadline, itemsWith: itemsWith,
    OVERRIDE_FIELDS: OVERRIDE_FIELDS, effectiveItem: effectiveItem, setOverrides: setOverrides, resetOverride: resetOverride, hasOverrides: hasOverrides,
    ISSUE_STATUS: ISSUE_STATUS, isFrozen: isFrozen, issueView: issueView, usedItemIds: usedItemIds, freezeIssue: freezeIssue, setIssueStatus: setIssueStatus,
    duplicateIssue: duplicateIssue, nextWeekRef: nextWeekRef };
});