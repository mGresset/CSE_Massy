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

  /** Classe une fiche à la date de référence ref (AAAA-MM-JJ). */
  function classify(item, ref, settings) {
    var d = D(), s = settings || {};
    var lastDays = s.lastDays === undefined ? 7 : Math.max(0, Number(s.lastDays) || 0), newDays = s.newDays === undefined ? 7 : s.newDays;
    var r = { rubric: 'ongoing', isNew: false, isLast: false, open: false, closed: false, expired: false, soon: false, daysLeft: null, regLabel: '' };
    if (item.archived) { r.rubric = 'archived'; return r; }
    var created = createdDay(item);
    var age = created ? d.diffDays(ref, created) : null;
    r.isNew = item.editorial === 'new' || (item.editorial === 'auto' && newDays > 0 && age !== null && age >= 0 && age < newDays);
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
  function itemsWith(project, ref, rubric, categoryId) {
    return project.items.filter(function (it) {
      if (it.archived) return false;
      if (categoryId && it.categoryId !== categoryId) return false;
      return classify(it, ref, project.settings).rubric === rubric;
    });
  }
  function findItem(project, id) { return project.items.find(function (it) { return it.id === id; }) || null; }

  /** Activités retenues pour une mosaïque (nouveautés / dernières chances), dans l'ordre d'affichage. */
  function selection(page, project, issue) {
    var ref = issue.refDate, o = page.opts || {};
    var rubric = page.kind === 'last' ? 'last' : 'new';
    var list;
    if (o.auto === false && Array.isArray(o.ids)) list = o.ids.map(function (id) { return findItem(project, id); }).filter(function (it) { return it && !it.archived; });
    else list = itemsWith(project, ref, rubric, o.categoryId).sort(rubric === 'last' ? byDeadline : byDate);
    if (rubric === 'new') list = list.filter(function (it) { return it.type === 'activity' || it.type === 'partner' || it.type === 'info'; });
    return list;
  }
  /** Contenus automatiques de la couverture. */
  function coverData(page, project, issue) {
    var o = page.opts || {}, ref = issue.refDate;
    var last = itemsWith(project, ref, 'last').sort(byDeadline);
    var news = (o.newsAuto === false && Array.isArray(o.newsIds))
      ? o.newsIds.map(function (id) { return findItem(project, id); }).filter(function (it) { return it && !it.archived; })
      : project.items.filter(function (it) { var c = classify(it, ref, project.settings); return !it.archived && c.isNew && !c.expired && ['full', 'closed', 'cancelled'].indexOf(c.rubric) < 0 && (it.type === 'activity' || it.type === 'partner'); }).sort(byDate);
    return { last: last, news: news.slice(0, 4), newsTotal: news.length };
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
      var c = classify(it, ref, project.settings);
      return c.rubric !== 'cancelled' && c.rubric !== 'expired';
    }).sort(byDate).map(function (it) {
      var c = classify(it, ref, project.settings);
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
    var cls = classify(it, ref, project.settings);
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
    live.forEach(function (it) { cls[it.id] = classify(it, ref, s); });
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
  /** Audit d'un numéro : [{level, msg, itemId?, pageId?}] */
  function audit(project, issue) {
    var out = [], ref = issue ? issue.refDate : D().todayParis();
    duplicates(project).forEach(function (g) { out.push({ level: 'warn', msg: 'Doublon probable : « ' + g[0].title + ' » (' + g.length + ' fiches).', itemId: g[0].id }); });
    if (!issue) return out;
    var used = {};
    issue.pages.forEach(function (p) {
      if (p.kind !== 'item') return;
      var it = findItem(project, p.itemId);
      if (!it) { out.push({ level: 'warn', msg: 'Une page référence une fiche supprimée.', pageId: p.id }); return; }
      if (!p.included) return;
      if (used[it.id]) out.push({ level: 'info', msg: '« ' + it.title + ' » apparaît plusieurs fois dans ce MEL.', pageId: p.id, itemId: it.id });
      used[it.id] = 1;
      checkItem(it, project, ref).forEach(function (x) { if (x[0] !== 'info') out.push({ level: x[0], msg: '« ' + (it.title || 'Sans titre') + ' » : ' + x[1], pageId: p.id, itemId: it.id }); });
    });
    var order = enforceOrder(issue.pages, project, issue);
    if (order.some(function (p, i) { return p !== issue.pages[i]; })) out.push({ level: 'info', msg: 'Les pages seront replacées dans l’ordre éditorial : couverture, ouvertures, informations, dernières chances, nouveautés, inscriptions, annonces, partenaires, plannings et règlement.' });
    if (!issue.pages.some(function (p) { return p.included; })) out.push({ level: 'block', msg: 'Aucune page incluse dans ce MEL.' });
    return out;
  }

  return { RUBRICS: RUBRICS, SECTIONS: SECTIONS, sectionForPage: sectionForPage, pageKey: pageKey, refreshPreservingEdits: refreshPreservingEdits, classify: classify, selection: selection, coverData: coverData, upcomingRows: upcomingRows, enforceOrder: enforceOrder, moveWithinSection: moveWithinSection,
    autoCompose: autoCompose, checkItem: checkItem, duplicates: duplicates, audit: audit, validUrl: validUrl, linkOf: linkOf, findItem: findItem,
    byDate: byDate, byDeadline: byDeadline, itemsWith: itemsWith };
});
