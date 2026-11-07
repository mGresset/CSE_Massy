/* CSE Studio V10 · Éditeur de fiche : formulaire guidé par étapes, aperçu 16:9 fidèle à l'export.
 * Le formulaire est un composant réutilisable (App.itemForm) : il sert à modifier la fiche source
 * (« toutes les semaines ») ou une seule diapositive d'un MEL (« cette semaine uniquement »). */
(function (root) {
  'use strict';
  var C = root.CSE, ui = C.ui, h = ui.h, App = C.app = C.app || {};
  App.views = App.views || {};
  var D = C.dates;

  /* Étapes et champs selon le type de fiche. */
  var STEPS = {
    activity: ['essentiel', 'dates', 'contenu', 'visuels', 'tarifs', 'pratique'],
    info: ['essentiel', 'contenu', 'visuels', 'pratique'],
    partner: ['essentiel', 'offre', 'contenu', 'visuels', 'pratique'],
    calendar: ['essentiel', 'calendrier', 'visuels', 'pratique'],
    page: ['essentiel', 'contenu', 'visuels', 'pratique'],
    rules: ['essentiel', 'contenu', 'pratique']
  };
  var STEP_LABELS = { essentiel: 'Essentiel', dates: 'Dates & inscriptions', contenu: 'Contenu', visuels: 'Visuels & lien', tarifs: 'Tarifs & points', pratique: 'Contacts & infos', offre: 'Offre', calendrier: 'Calendrier' };
  /* Correspondance entre un élément cliqué sur l'aperçu (champ « field » du moteur) et l'étape / le champ du formulaire. */
  var FIELD_MAP = {
    'titre': ['essentiel', 'title'], 'catégorie': ['essentiel', 'categoryId'], 'sous-titre': ['essentiel', 'subtitle'], 'statut': ['essentiel', 'editorial'],
    'date': ['dates', 'dateStart'], 'lieu': ['dates', 'location'], 'dernière chance': ['dates', 'regEnd'], 'date limite': ['dates', 'regEnd'],
    'description': ['contenu', 'description'], 'suite de la description': ['contenu', 'description'], 'résumé': ['contenu', 'summary'], 'texte de l’information': ['contenu', 'description'],
    'encadré d’alerte': ['contenu', 'notes'], 'règlement': ['contenu', 'description'], 'encadré du règlement': ['contenu', 'notes'], 'temps forts': ['contenu', 'highlights'], 'programme': ['contenu', 'program'],
    'conditions de l’offre': ['contenu', 'description'], 'offre': ['offre', 'partner'], 'remise': ['offre', 'partner'],
    'photo': ['visuels', 'photos'], 'bouton': ['visuels', 'link'],
    'tarifs': ['tarifs', 'pricing'], 'notes tarifs': ['tarifs', 'pricing'], 'Points': ['tarifs', 'points'],
    'contacts': ['pratique', 'contacts'], 'Participants': ['pratique', 'minPart'], 'Public': ['pratique', 'audience'], 'Bilan carbone': ['pratique', 'carbon'], 'Adresse': ['dates', 'address'],
    'Inscriptions jusqu’au': ['dates', 'regEnd'], 'Inscriptions': ['dates', 'regStatus'],
    'service': ['calendrier', 'calendar'], 'légende': ['calendrier', 'calendar'], 'horaires': ['calendrier', 'calendar'], 'horaire du jour': ['calendrier', 'calendar'], 'mention': ['calendrier', 'calendar']
  };
  var state = { step: 'essentiel', split: false };

  /* ================= Composant formulaire ================= */
  /** Monte le formulaire d'une fiche dans container.
   *  opts : { project, scope: 'item'|'page', touch(), render(), isOverridden(key), resetField(key), onStep(step), step }
   *  Renvoie { focusField(field), redraw(), destroy() }. */
  function mountForm(container, it, opts) {
    var p = opts.project;
    var steps = STEPS[it.type] || STEPS.activity;
    var stepLabel = function (name) { return name === 'tarifs' && !p.settings.pricingModule ? 'Points' : STEP_LABELS[name]; };
    var cur = opts.step && steps.indexOf(opts.step) >= 0 ? opts.step : steps[0];
    var stepBar = h('div', { class: 'steps', role: 'tablist', 'aria-label': 'Étapes de la fiche' });
    var stepBody = h('div', { role: 'tabpanel', class: 'step-body' });
    var stepNav = h('div', { class: 'step-nav' });
    container.appendChild(stepBar); container.appendChild(stepBody); container.appendChild(stepNav);
    var ctx = {
      scope: opts.scope || 'item', project: p,
      touch: function () { opts.touch(); updateStepErrors(); refreshMarks(); },
      render: opts.render || function () { },
      redraw: function () { drawStep(); },
      redrawKeepScroll: redrawKeepingScroll,
      isOverridden: opts.isOverridden || function () { return false; },
      resetField: function (key) { if (opts.resetField) { opts.resetField(key); drawStep(); } },
      done: opts.done
    };
    steps.forEach(function (s, i) {
      stepBar.appendChild(h('button', { type: 'button', role: 'tab', 'aria-selected': String(s === cur), dataset: { step: s }, onclick: function () { go(s); } }, h('span', { class: 'n' }, String(i + 1)), stepLabel(s)));
    });
    function go(s) { cur = s; if (opts.onStep) opts.onStep(s); drawStep(); }
    /** Met à jour en direct les repères « cette semaine » pendant la saisie (portée « page »). */
    function refreshMarks() {
      if (ctx.scope !== 'page') return;
      stepBody.querySelectorAll('[data-key]').forEach(function (el) {
        var want = ctx.isOverridden(el.dataset.key), has = el.classList.contains('overridden');
        if (want && !has) addMark(el, el.dataset.key, ctx);
        if (!want && has) { el.classList.remove('overridden'); el.querySelectorAll(':scope > label > .ov-chip, :scope > label > .ov-reset, :scope > h3 > .ov-chip, :scope > h3 > .ov-reset, :scope > legend > .ov-chip, :scope > legend > .ov-reset').forEach(function (x) { x.remove(); }); }
      });
    }
    function updateStepErrors() {
      var errs = { essentiel: !String(it.title).trim(), dates: !!(it.dateStart && it.dateEnd && it.dateEnd < it.dateStart) || !!(it.regStart && it.regEnd && it.regEnd < it.regStart),
        visuels: (it.link.type === 'custom' && !!it.link.url && !C.compose.validUrl(it.link.url)) || (it.photos || []).some(function (ph) { return C.images.status(ph) !== 'ready'; }) };
      stepBar.querySelectorAll('button').forEach(function (b) { b.classList.toggle('has-error', !!errs[b.dataset.step]); });
    }
    function redrawKeepingScroll() {
      var scrollY = window.scrollY || window.pageYOffset || 0;
      var scroller = container.closest('.props-scroll');
      var inner = scroller ? scroller.scrollTop : 0;
      drawStep();
      window.scrollTo(0, scrollY);
      if (scroller) scroller.scrollTop = inner;
      requestAnimationFrame(function () { window.scrollTo(0, scrollY); if (scroller) scroller.scrollTop = inner; });
    }
    function drawStep() {
      stepBar.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.step === cur)); });
      ui.clear(stepBody); ui.clear(stepNav);
      STEP_RENDER[cur](stepBody, it, p, ctx);
      var i = steps.indexOf(cur);
      stepNav.appendChild(i > 0 ? h('button', { class: 'btn', type: 'button', onclick: function () { go(steps[i - 1]); } }, '← ' + stepLabel(steps[i - 1])) : h('span'));
      if (i < steps.length - 1) stepNav.appendChild(h('button', { class: 'btn primary', type: 'button', onclick: function () { go(steps[i + 1]); } }, stepLabel(steps[i + 1]) + ' →'));
      else if (opts.done) stepNav.appendChild(opts.done());
      updateStepErrors();
    }
    drawStep();
    return {
      redraw: drawStep,
      step: function () { return cur; },
      /** Met en évidence le champ correspondant à un élément cliqué sur l'aperçu. */
      focusField: function (field) {
        var m = FIELD_MAP[field];
        if (!m) return false;
        if (steps.indexOf(m[0]) < 0) return false;
        if (cur !== m[0]) go(m[0]);
        var el = stepBody.querySelector('[data-key="' + m[1] + '"]');
        if (!el) return true;
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        el.classList.add('flash');
        setTimeout(function () { el.classList.remove('flash'); }, 1400);
        var input = el.querySelector('input:not([type=hidden]),textarea,select,button');
        if (input) input.focus({ preventScroll: true });
        return true;
      }
    };
  }
  App.itemForm = { STEPS: STEPS, STEP_LABELS: STEP_LABELS, FIELD_MAP: FIELD_MAP, mount: mountForm };

  /* ================= Vue « Fiche » (bibliothèque) ================= */
  App.views.editor = {
    title: 'Fiche',
    render: function (el, args) {
      var p = App.p(), it;
      var from = new URLSearchParams((location.hash.split('?')[1] || ''));
      var returnIssue = p.issues.find(function (x) { return x.id === from.get('mel'); });
      var returnPage = returnIssue && returnIssue.pages.find(function (x) { return x.id === from.get('page'); });
      function returnToMel() { if (returnPage) App.composerSelect = returnPage.id; App.go('#/mel/' + returnIssue.id); }
      if (args[0] === 'nouvelle') {
        it = C.model.blankItem(args[1] || 'activity');
        if (args[2]) it.template = args[2];
        if (it.type === 'calendar') it.calendar.month = App.refDate().slice(0, 7);
        if (it.type === 'rules') it.title = 'Modalités d’inscription aux activités du CSE';
        if (it.type !== 'activity' && it.type !== 'partner') it.categoryId = 'cat-informations';
        p.items.push(it);
        App.save('items');
        history.replaceState(null, '', '#/fiche/' + it.id);
        state.step = 'essentiel';
      } else {
        it = App.item(args[0]);
        if (!it) { el.appendChild(h('div', { class: 'alert error' }, 'Fiche introuvable (supprimée ?). ', h('a', { href: '#/bibliotheque' }, 'Retour à la bibliothèque'))); return; }
        if (state.itemId !== it.id) state.step = 'essentiel';
      }
      state.itemId = it.id;
      var uses = p.issues.filter(function (is) { return is.pages.some(function (pg) { return pg.itemId === it.id; }); });
      var titleEl = h('h1', {}, it.title || 'Nouvelle fiche');
      el.appendChild(h('div', { class: 'page-head' },
        h('div', {}, h('p', { class: 'muted small', style: { margin: 0 } }, h('a', { href: '#/bibliotheque' }, '← Bibliothèque'), ' · ', ui.typeLabel(it.type)), titleEl),
        h('div', { class: 'btn-group' },
          App.undoButtons ? App.undoButtons() : null,
          returnIssue ? h('button', { class: 'btn', type: 'button', onclick: returnToMel }, '← Retour à cette diapositive') : null,
          h('button', { class: 'btn', type: 'button', onclick: function () { var c = App.duplicateItem(it); App.go('#/fiche/' + c.id); } }, 'Dupliquer'),
          h('button', { class: 'btn', type: 'button', onclick: function () { it.archived = !it.archived; touch(); ui.toast(it.archived ? 'Fiche archivée.' : 'Fiche réactivée.'); App.refresh(); } }, it.archived ? 'Désarchiver' : 'Archiver'),
          h('button', { class: 'btn primary', type: 'button', onclick: function () { App.addToIssue(it); } }, '+ Ajouter au MEL en cours'))));
      el.appendChild(h('div', { class: 'scope-banner scope-item' }, h('b', {}, 'Modification de la fiche (toutes les semaines)'),
        ' — ', uses.length ? 'utilisée dans ' + uses.length + ' MEL ; les MEL publiés (figés) ne changent pas.' : 'pas encore utilisée dans un MEL.',
        returnPage ? h('span', {}, ' Pour une correction propre à une semaine, utilisez « Cette semaine uniquement » dans « Composer le MEL ».') : null));
      if (it.archived) el.appendChild(h('div', { class: 'alert warn' }, 'Fiche archivée : elle n’apparaît plus dans les compositions automatiques.'));
      if (it.legacy) el.appendChild(h('div', { class: 'alert info small' }, 'Fiche reprise d’une version précédente (' + it.legacy.source + '). Les valeurs d’origine sont conservées dans la sauvegarde JSON.'));

      var form = h('div', { class: 'card' });
      var preview = h('div', { class: 'preview-col' });
      el.appendChild(h('div', { class: 'editor' }, form, preview));

      /* ---------- Aperçu ---------- */
      var tplSel = ui.selectEl([{ id: 'auto', label: 'Automatique (recommandé)' }].concat((C.templates.ITEM_TEMPLATES[it.type] || []).map(function (id) { return { id: id, label: C.templates.TEMPLATES.find(function (t) { return t.id === id; }).name }; })), it.template);
      tplSel.addEventListener('change', function () { it.template = tplSel.value; touch(); renderPreview(); });
      var densSel = ui.selectEl(C.model.DENSITIES, it.density);
      densSel.addEventListener('change', function () { it.density = densSel.value; touch(); renderPreview(); });
      var read = h('span', { class: 'readability' });
      var stage = h('div', { class: 'slides-strip' });
      var issuesBox = h('ul', { class: 'issues', 'aria-live': 'polite' });
      var lastSlides = [];
      preview.appendChild(h('div', { class: 'card sticky-preview' },
        h('div', { class: 'preview-tools' }, ui.field('Modèle', tplSel), ui.field('Densité', densSel, { help: 'Automatique : corps ≥ 12 pt · Aéré · Compact : corps ≥ 11 pt et photos réduites.' }), h('span', { class: 'spacer' }), read),
        h('div', { style: { marginTop: '10px' } }, stage),
        h('p', { class: 'small muted', style: { margin: '6px 0 0' } }, 'Astuce : cliquez sur un texte de l’aperçu pour aller au champ correspondant.'),
        h('div', { class: 'row', style: { marginTop: '10px' } },
          h('button', { class: 'btn', type: 'button', onclick: function () { App.fullscreen(lastSlides); } }, '⤢ Aperçu plein écran'),
          h('button', { class: 'btn', type: 'button', onclick: function (e) { App.exportPptx(lastSlides.map(function (s) { return { slide: s, title: it.title, notes: App.notesFor({}, it, s), item: it }; }), 'CSE_' + ui.slug(it.title) + '.pptx', e.currentTarget); } }, '↓ Exporter la fiche (.pptx)'),
          h('span', { class: 'spacer' }), h('span', { class: 'small muted' }, 'Statut au ' + D.fmtShort(App.refDate(), true) + ' : '), h('span', { id: 'rubricBox' }))));
      preview.appendChild(h('div', { class: 'card' }, h('h3', {}, 'Contrôles et lisibilité'), issuesBox));
      var renderPreview = ui.debounce(function () {
        lastSlides = C.templates.renderItem(it, p, { refDate: App.refDate() });
        ui.clear(stage);
        lastSlides.forEach(function (s, i) {
          if (lastSlides.length > 1) stage.appendChild(h('div', { class: 'part-label' }, 'Diapositive ' + (i + 1) + ' / ' + lastSlides.length));
          var f = ui.slideFrame(s, { label: 'Aperçu de la diapositive', onAction: onAction, onField: function (field) { formApi.focusField(field); }, onDrawn: function (r) { if (r.domOverflow.length) addIssue('warn', 'Débordement détecté à l’affichage : ' + r.domOverflow.join(', ') + '. Raccourcir le texte.'); } });
          stage.appendChild(f.frame);
        });
        var r = C.templates.readability(lastSlides);
        read.className = 'readability ' + r.level;
        read.textContent = 'Lisibilité : ' + r.label + (r.min ? ' · police min. ' + Math.round(r.min * 0.8 * 10) / 10 + ' pt' : '');
        var rb = document.getElementById('rubricBox');
        if (rb) { ui.clear(rb); ui.rubricChip(C.compose.classify(it, App.refDate(), p.settings)).forEach(function (x) { rb.appendChild(x); }); }
        renderIssues();
      }, 90);
      function addIssue(level, msg, action) {
        var li = h('li', { class: level }, h('span', { class: 'ic' }, level === 'block' ? '✕' : level === 'ok' ? '✓' : level === 'info' ? 'i' : '!'), h('span', {}, msg));
        if (action) li.appendChild(action);
        issuesBox.appendChild(li);
      }
      function renderIssues() {
        ui.clear(issuesBox);
        C.compose.checkItem(it, p, App.refDate()).forEach(function (x) { addIssue(x[0], x[1]); });
        var seen = {};
        lastSlides.forEach(function (s) { s.warnings.forEach(function (w) {
          if (seen[w.msg] || /^Tarifs : /.test(w.msg)) return; seen[w.msg] = 1;
          var act = null;
          if (w.code === 'compact-fits') act = h('button', { class: 'btn small act', type: 'button', onclick: function () { it.density = 'compact'; densSel.value = 'compact'; touch(); renderPreview(); } }, 'Passer en compact');
          if (w.code === 'image') act = h('button', { class: 'btn small act', type: 'button', onclick: function () { formApi.focusField('photo'); } }, 'Corriger la photo');
          addIssue(w.level, w.msg, act);
        }); });
        if (!issuesBox.children.length) addIssue('ok', 'Aucun problème détecté. Relisez la diapositive avant diffusion.');
      }
      function onAction(a) { if (a.type === 'calendar-day') { C.model.cycleCalendarDay(it.calendar, a.date, state.calBrush && state.calBrush.hours); touch(); renderPreview(); if (formApi.step() === 'calendrier') formApi.redraw(); } }
      function touch() {
        it.updatedAt = new Date().toISOString();
        if (it.editorialStatus === 'approved') { it.editorialStatus = 'review'; ui.toast('Fiche modifiée : statut repassé à « À relire ».'); }
        titleEl.textContent = it.title || 'Nouvelle fiche';
        App.save('items');
      }
      var formApi = mountForm(form, it, {
        project: p, scope: 'item', step: state.step, touch: touch, render: renderPreview,
        onStep: function (s) { state.step = s; },
        done: function () { return returnIssue ? h('button', { class: 'btn primary', type: 'button', onclick: returnToMel }, 'Terminer et revenir au MEL') : h('a', { class: 'btn primary', href: '#/bibliotheque' }, 'Terminer'); }
      });
      renderPreview();
      if (!it.title) setTimeout(function () { var t = form.querySelector('[data-key="title"] input'); if (t) t.focus(); }, 50);
    }
  };

  /* ---------- Contrôles liés à la fiche ---------- */
  /** Repère « personnalisé cette semaine » + bouton de retour à la valeur de la fiche. */
  function overrideMark(wrap, key, ctx) {
    wrap.dataset.key = key;
    if (ctx.scope !== 'page' || !ctx.isOverridden(key)) return wrap;
    return addMark(wrap, key, ctx);
  }
  function addMark(wrap, key, ctx) {
    wrap.classList.add('overridden');
    var lab = wrap.querySelector(':scope > label') || wrap.querySelector(':scope > h3') || wrap.querySelector(':scope legend') || wrap.querySelector('label') || wrap;
    lab.appendChild(h('span', { class: 'ov-chip', title: 'Valeur propre à ce MEL' }, 'cette semaine'));
    lab.appendChild(h('button', { type: 'button', class: 'ov-reset', title: 'Revenir à la valeur de la fiche', 'aria-label': 'Annuler la personnalisation de ce champ', onclick: function (e) { e.preventDefault(); ctx.resetField(key); } }, '↺'));
    return wrap;
  }
  function bindInput(it, key, ctx, opts) {
    opts = opts || {};
    var tag = opts.rows ? 'textarea' : 'input';
    var get = opts.get || function () { return it[key]; };
    var set = opts.set || function (v) { it[key] = v; };
    var el = h(tag, { type: opts.rows ? null : (opts.type || 'text'), placeholder: opts.placeholder || '', maxlength: opts.max || null, min: opts.min, max: opts.maxv, step: opts.step });
    if (opts.rows) el.rows = opts.rows;
    el.value = get() || '';
    el.addEventListener('input', function () { set(el.value); ctx.touch(); ctx.render(); if (opts.after) opts.after(el.value); });
    var w = ui.field(opts.label, el, { help: opts.help, required: opts.required });
    if (opts.required) {
      var check = function () { var bad = !String(el.value).trim(); w.classList.toggle('invalid', bad); var e = w.querySelector('.err'); if (bad && !e) w.appendChild(h('span', { class: 'err' }, 'Champ obligatoire.')); if (!bad && e) e.remove(); };
      el.addEventListener('blur', check);
    }
    return overrideMark(w, opts.markKey || key, ctx);
  }
  function bindSelect(it, key, options, ctx, opts) {
    opts = opts || {};
    var get = opts.get || function () { return it[key]; };
    var set = opts.set || function (v) { it[key] = v; };
    var s = ui.selectEl(options, get());
    s.addEventListener('change', function () { set(s.value); ctx.touch(); ctx.render(); if (opts.redraw) ctx.redraw(); });
    return overrideMark(ui.field(opts.label, s, { help: opts.help }), opts.markKey || key, ctx);
  }
  function bindCheck(it, label, get, set, ctx, help, redraw, key) {
    var c = h('input', { type: 'checkbox', checked: !!get() });
    c.addEventListener('change', function () { set(c.checked); ctx.touch(); ctx.render(); if (redraw) ctx.redraw(); });
    var w = h('div', {}, h('label', { class: 'check' }, c, label), help ? h('small', { class: 'help', style: { display: 'block', margin: '-8px 0 12px 26px' } }, help) : null);
    return key ? overrideMark(w, key, ctx) : w;
  }
  var richHelp = 'Astuces : **texte** = gras · une ligne commençant par « - » = puce · ligne vide = espace.';
  var STATUS_LABEL = { ready: 'Prête pour le PowerPoint', remote: 'Lien Web non importé', missing: 'Introuvable' };

  var STEP_RENDER = {
    essentiel: function (box, it, p, ctx) {
      if (ctx.scope !== 'page') {
        box.appendChild(bindSelect(it, 'type', C.model.TYPES, ctx, { label: 'Type de fiche', help: (C.model.TYPES.find(function (t) { return t.id === it.type; }) || {}).hint, set: function (v) { it.type = v; it.template = 'auto'; }, redraw: true }));
        box.querySelector('select').addEventListener('change', function () { App.refresh(); });
      }
      box.appendChild(bindInput(it, 'title', ctx, { label: it.type === 'partner' ? 'Enseigne / nom du partenaire' : 'Titre', required: true, max: 160, placeholder: it.type === 'activity' ? 'Ex. Circuit découverte des Pouilles' : '' }));
      box.appendChild(bindInput(it, 'subtitle', ctx, { label: it.type === 'rules' ? 'Sous-titre (affiché sous le titre)' : 'Sous-titre / précision (facultatif)', max: 200, placeholder: 'Ex. Vacances de printemps', help: 'Si le sous-titre répète la période saisie dans les dates, elle n’est affichée qu’une fois.' }));
      var cats = p.categories.map(function (c) { return { id: c.id, label: c.name }; });
      box.appendChild(h('div', { class: 'cols' },
        bindSelect(it, 'categoryId', cats, ctx, { label: 'Catégorie' }),
        it.type === 'activity' || it.type === 'info' || it.type === 'partner' ? bindSelect(it, 'editorial', C.model.EDITORIAL, ctx, { label: 'Rubrique éditoriale', help: 'Automatique : nouveauté si créée depuis moins de ' + p.settings.newDays + ' j (annoncée au plus ' + p.settings.newMaxWeeks + ' semaine(s)), dernière chance si clôture sous ' + p.settings.lastDays + ' j.' }) : null));
      if (ctx.scope !== 'page' && (it.type === 'activity' || it.type === 'page')) box.appendChild(bindSelect(it, 'melSection', [
        { id: 'auto', label: 'Automatique selon la fiche et les inscriptions' },
        { id: 'announcements', label: 'Annonces / concerts / événements' },
        { id: 'important', label: 'Informations importantes' },
        { id: 'planning', label: 'Plannings / activités à venir' }
      ], ctx, { label: 'Placement dans le MEL', help: 'Indépendant de la catégorie : permet de placer un concert dans « Annonces ». Une dernière chance automatique reste disponible si le mode automatique est choisi.' }));
      if (ctx.scope !== 'page') {
        box.appendChild(h('p', { class: 'small' }, h('a', { href: '#/parametres' }, 'Gérer les catégories (créer, renommer, réordonner)…')));
        box.appendChild(bindSelect(it, 'editorialStatus', [{ id: 'draft', label: 'Brouillon' }, { id: 'review', label: 'À relire' }, { id: 'approved', label: 'Validée pour diffusion' }], ctx, { label: 'Validation interne', help: 'Indication de travail en local, signalée avant l’export. Une validation sécurisée (rôles Rédacteur / Relecteur) nécessite l’espace partagé Supabase.' }));
      }
    },
    dates: function (box, it, p, ctx) {
      var startField = bindInput(it, 'dateStart', ctx, { label: 'Date de début', type: 'date' });
      var endField = bindInput(it, 'dateEnd', ctx, { label: 'Date de fin', type: 'date' });
      var startInput = startField.querySelector('input'), endInput = endField.querySelector('input');
      var endMsg = h('small', { class: 'field-msg', 'aria-live': 'polite' });
      endField.appendChild(endMsg);
      function syncDates() {
        endInput.min = it.dateStart || '';
        if (it.dateStart && (!it.dateEnd || it.dateEnd < it.dateStart)) {
          it.dateEnd = it.dateStart;
          endInput.value = it.dateEnd;
          endMsg.textContent = 'Date de fin alignée sur la date de début.';
          ctx.touch(); ctx.render();
        }
      }
      startInput.addEventListener('input', syncDates);
      endInput.addEventListener('input', function () {
        if (it.dateStart && it.dateEnd && it.dateEnd < it.dateStart) {
          it.dateEnd = it.dateStart; endInput.value = it.dateStart; endMsg.textContent = 'La date de fin ne peut pas précéder la date de début.'; endMsg.className = 'field-msg warn'; ctx.touch(); ctx.render();
        } else { endMsg.textContent = ''; endMsg.className = 'field-msg'; }
      });
      endInput.min = it.dateStart || ''; // ne modifie pas silencieusement une fiche existante à l'ouverture
      box.appendChild(h('div', { class: 'cols' }, startField, endField));
      box.appendChild(h('div', { class: 'cols' }, bindInput(it, 'timeStart', ctx, { label: 'Heure de début', type: 'time' }), bindInput(it, 'timeEnd', ctx, { label: 'Heure de fin', type: 'time' })));
      box.appendChild(h('div', { class: 'cols' }, bindInput(it, 'location', ctx, { label: 'Lieu / destination', placeholder: 'Ex. Salle des fêtes, Massy' }), bindInput(it, 'address', ctx, { label: 'Adresse (facultatif)' })));
      box.appendChild(h('fieldset', {}, h('legend', {}, 'Inscriptions'),
        h('div', { class: 'cols' }, bindInput(it, 'regStart', ctx, { label: 'Ouverture des inscriptions', type: 'date' }), bindInput(it, 'regEnd', ctx, { label: 'Clôture des inscriptions', type: 'date', help: 'Sert au calcul « Dernière chance » et au compteur J−x.' })),
        bindSelect(it, 'regStatus', C.model.REG_STATUS, ctx, { label: 'Statut des inscriptions' }),
        bindInput(it, 'regInfo', ctx, { label: 'Modalités d’inscription (facultatif)', rows: 2, placeholder: 'Ex. Inscription sur le portail CSE ou au local du CSE.' }),
        bindCheck(it, 'Forcer en « Dernière chance »', function () { return it.forceLast; }, function (v) { it.forceLast = v; if (v) it.excludeLast = false; }, ctx, 'Exception manuelle : la fiche apparaît en dernière chance même hors fenêtre de ' + p.settings.lastDays + ' jours (jamais si les inscriptions sont closes).', true, 'forceLast'),
        bindCheck(it, 'Ne jamais afficher en « Dernière chance »', function () { return it.excludeLast; }, function (v) { it.excludeLast = v; if (v) it.forceLast = false; }, ctx, null, true, 'excludeLast')));
    },
    contenu: function (box, it, p, ctx) {
      var isRules = it.type === 'rules';
      if (!isRules) box.appendChild(bindInput(it, 'summary', ctx, { label: it.type === 'info' ? 'Message principal (chapeau)' : 'Résumé (2 ou 3 phrases, mis en valeur)', rows: 3, max: 1200 }));
      box.appendChild(bindInput(it, 'description', ctx, { label: isRules ? 'Texte du règlement' : it.type === 'partner' ? 'Conditions et détails de l’offre' : 'Description détaillée', rows: isRules ? 16 : 6, max: 8000, help: isRules ? 'Titres : ligne commençant par « # ». ' + richHelp + ' Le texte se répartit automatiquement sur plusieurs diapositives si nécessaire.' : richHelp }));
      if (it.type === 'activity' || it.type === 'page') {
        box.appendChild(bindInput(it, 'highlights', ctx, { label: 'Temps forts (une ligne par élément)', rows: 4 }));
        box.appendChild(bindInput(it, 'program', ctx, { label: 'Programme (une étape par ligne, ex. « 14h00 - Accueil »)', rows: 4 }));
      }
      if (it.type === 'activity') {
        box.appendChild(h('div', { class: 'cols' }, bindInput(it, 'transport', ctx, { label: 'Transport (facultatif)', rows: 2 }), bindInput(it, 'lodging', ctx, { label: 'Hébergement (facultatif)', rows: 2 })));
        box.appendChild(bindInput(it, 'conditions', ctx, { label: 'Pièces / conditions (facultatif)', rows: 2 }));
      }
      box.appendChild(bindInput(it, 'notes', ctx, { label: it.type === 'info' || isRules ? 'Encadré d’alerte (facultatif)' : 'Remarques / à noter (facultatif)', rows: 2 }));
    },
    visuels: function (box, it, p, ctx) {
      var list = h('div', { class: 'photos' });
      it.photoMeta = it.photoMeta || {};
      function meta(ref) { return it.photoMeta[ref] || (it.photoMeta[ref] = {}); }
      function changedPhotos() { ctx.touch(); ctx.render(); draw(); }
      function draw() {
        ui.clear(list);
        it.photos.forEach(function (ref, i) {
          var st = C.images.status(ref), m = it.photoMeta[ref] || {};
          var src = st === 'ready' ? C.renderHTML.resolve(ref) : '';
          var img = src ? h('img', { src: src, alt: m.alt || 'Photo ' + (i + 1), title: 'Cliquer sur l’image pour choisir le point à garder visible au recadrage' }) : h('div', { class: 'photo-missing' }, st === 'remote' ? 'Lien Web non importé' : 'Image introuvable');
          if (src) {
            img.style.objectPosition = (m.fx === undefined ? 50 : m.fx) + '% ' + (m.fy === undefined ? 50 : m.fy) + '%';
            img.style.objectFit = m.fit === 'contain' ? 'contain' : 'cover';
            img.addEventListener('click', function (e) {
              var r = img.getBoundingClientRect();
              var mm = meta(ref); mm.fx = Math.round((e.clientX - r.left) / r.width * 100); mm.fy = Math.round((e.clientY - r.top) / r.height * 100);
              changedPhotos();
            });
          }
          var fitSel = ui.selectEl([{ id: 'cover', label: 'Recadrer' }, { id: 'contain', label: 'Image entière' }], m.fit || 'cover', { 'aria-label': 'Cadrage de la photo ' + (i + 1), title: 'Recadrer : remplit le cadre (cliquez sur l’image pour choisir la zone gardée). Image entière : sans recadrage.' });
          fitSel.addEventListener('change', function () { meta(ref).fit = fitSel.value; changedPhotos(); });
          var alt = h('input', { value: m.alt || '', placeholder: 'Texte alternatif (facultatif)', 'aria-label': 'Texte alternatif de la photo ' + (i + 1), maxlength: 200 });
          alt.addEventListener('change', function () { meta(ref).alt = alt.value.trim(); ctx.touch(); });
          var fix = null;
          if (st !== 'ready') fix = h('div', { class: 'photo-fix' },
            h('span', { class: 'small' }, st === 'remote' ? 'Non intégrable au PowerPoint tant qu’elle n’est pas importée.' : 'La réimporter ou la retirer.'),
            st === 'remote' ? h('button', { type: 'button', class: 'btn small', onclick: function () { retryUrl(ref, i); } }, 'Réessayer l’import') : null,
            h('button', { type: 'button', class: 'btn small primary', onclick: function () { replaceWithFile(i); } }, 'Remplacer par un fichier'),
            st === 'remote' ? h('a', { class: 'btn small', href: ref, target: '_blank', rel: 'noopener noreferrer' }, 'Ouvrir l’URL') : null);
          list.appendChild(h('div', { class: 'photo' + (st === 'ready' ? '' : ' bad') },
            img,
            h('span', { class: 'badge st-' + st, title: STATUS_LABEL[st] }, st === 'ready' ? '✓ Prête' : st === 'remote' ? '⚠ Non importée' : '⚠ Introuvable'),
            i === 0 ? h('span', { class: 'badge first' }, it.type === 'partner' ? 'Logo' : 'Principale') : null,
            h('div', { class: 'tools' },
              i > 0 ? h('button', { type: 'button', 'aria-label': 'Placer en premier', title: 'Placer en premier', onclick: function () { it.photos.splice(i, 1); it.photos.unshift(ref); changedPhotos(); } }, '★') : null,
              h('button', { type: 'button', 'aria-label': 'Retirer la photo ' + (i + 1), title: 'Retirer', onclick: function () { it.photos.splice(i, 1); delete it.photoMeta[ref]; changedPhotos(); } }, '✕')),
            st === 'ready' ? h('div', { class: 'photo-opts' }, fitSel, alt) : fix));
        });
        if (!it.photos.length) list.appendChild(h('p', { class: 'small muted' }, 'Aucune photo : la composition s’adapte (pictogramme de catégorie ou texte élargi).'));
      }
      function addFiles(files, at) {
        files = files.filter(function (f) { return f && (!f.type || /^image\//.test(f.type)); });
        if (!files.length) return;
        var room = 6 - it.photos.length + (at !== undefined ? 1 : 0);
        if (room <= 0) return ui.toast('6 images maximum par fiche.', 'error');
        Promise.all(files.slice(0, room).map(function (f) { return C.images.importFile(f, it.type === 'partner' && !it.photos.length ? { maxW: 1200, maxH: 1200 } : {}); }))
          .then(function (refs) {
            if (at !== undefined) { var old = it.photos[at]; it.photos.splice(at, 1, refs[0]); if (old) { it.photoMeta[refs[0]] = it.photoMeta[old] || {}; delete it.photoMeta[old]; } }
            else it.photos = it.photos.concat(refs);
            changedPhotos(); ui.toast(refs.length + ' image(s) enregistrée(s) dans CSE Studio : prête(s) pour le PowerPoint.', 'ok');
          })
          .catch(function (e) { ui.toast(e.message, 'error', 8000); });
      }
      function replaceWithFile(i) { ui.pickFile('image/png,image/jpeg,image/webp', false).then(function (f) { addFiles(f, i); }); }
      function retryUrl(ref, i) {
        C.images.importUrl(ref).then(function (newRef) {
          var mm = it.photoMeta[ref] || {}; mm.source = ref; it.photoMeta[newRef] = mm; delete it.photoMeta[ref];
          it.photos.splice(i, 1, newRef); changedPhotos(); ui.toast('Image récupérée et enregistrée localement : prête pour le PowerPoint.', 'ok');
        }).catch(function (e) { urlError(e, ref); });
      }
      function urlError(e, u) {
        ui.dialog({ title: 'Image non importée', body: h('div', {},
          h('p', {}, e.message),
          h('p', { class: 'small muted' }, 'CSE Studio fonctionne entièrement dans le navigateur (GitHub Pages) : il ne peut pas contourner la protection d’un site. Solutions fiables :'),
          h('ol', { class: 'small' }, h('li', {}, 'Ouvrir l’adresse, enregistrer l’image sur l’ordinateur puis « Importer un fichier » ;'), h('li', {}, 'ou faire clic droit → « Copier l’image » puis la coller dans la zone prévue (Ctrl+V).'))),
          buttons: [{ label: 'Fermer', value: false }, { label: 'Ouvrir l’adresse', value: 'open' }, { label: 'Importer un fichier', kind: 'primary', value: 'file' }] }).then(function (v) {
          if (v === 'open') window.open(u, '_blank', 'noopener');
          if (v === 'file') ui.pickFile('image/png,image/jpeg,image/webp', true).then(addFiles);
        });
      }
      var dz = h('div', { class: 'dropzone', tabindex: '0', role: 'button', 'aria-label': 'Ajouter des photos' }, it.type === 'partner' ? 'Glisser le logo puis un visuel, ou cliquer pour choisir (JPG, PNG, WEBP)' : 'Glisser des photos ici ou cliquer pour choisir (JPG, PNG, WEBP · 6 maximum)');
      dz.addEventListener('click', function () { ui.pickFile('image/png,image/jpeg,image/webp', true).then(addFiles); });
      dz.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dz.click(); } });
      dz.addEventListener('dragover', function (e) { e.preventDefault(); dz.classList.add('over'); });
      dz.addEventListener('dragleave', function () { dz.classList.remove('over'); });
      dz.addEventListener('drop', function (e) { e.preventDefault(); dz.classList.remove('over'); addFiles(Array.prototype.slice.call(e.dataTransfer.files || [])); });
      function onPaste(e) {
        var items = Array.prototype.slice.call(e.clipboardData && e.clipboardData.items || []);
        var files = items.filter(function (x) { return x.kind === 'file' && /^image\//.test(x.type); }).map(function (x) { return x.getAsFile(); }).filter(Boolean);
        e.preventDefault();
        if (files.length) addFiles(files);
        else ui.toast('Le presse-papiers ne contient pas d’image. Copiez l’image elle-même (clic droit → Copier l’image), pas son adresse.', 'error', 7000);
      }
      dz.addEventListener('paste', onPaste);
      var pasteZone = h('div', { class: 'pastezone', tabindex: '0', role: 'textbox', 'aria-label': 'Zone de collage d’une image' }, '📋 Coller une image copiée : cliquer ici puis Ctrl+V');
      pasteZone.addEventListener('paste', onPaste);
      var url = h('input', { type: 'url', placeholder: 'https://… (adresse directe d’une image)' });
      var addUrl = h('button', { class: 'btn', type: 'button', onclick: function () {
        var u = url.value.trim();
        if (!u || !C.compose.validUrl(u)) return ui.toast('Adresse invalide : elle doit commencer par https://', 'error');
        addUrl.disabled = true; addUrl.textContent = 'Vérification…';
        C.images.importUrl(u).then(function (ref) {
          if (it.photos.length >= 6) throw Error('6 images maximum par fiche.');
          it.photos.push(ref); meta(ref).source = u; changedPhotos(); url.value = '';
          ui.toast('Image récupérée et enregistrée localement : prête pour le PowerPoint.', 'ok');
        }).catch(function (e) { urlError(e, u); }).then(function () { addUrl.disabled = false; addUrl.textContent = 'Importer'; });
      } }, 'Importer');
      var head = h('h3', {}, it.type === 'partner' ? 'Logo et visuels' : 'Photos');
      var wrap = overrideMark(h('div', {}, head, list), 'photos', ctx);
      box.appendChild(wrap);
      box.appendChild(dz);
      box.appendChild(pasteZone);
      box.appendChild(h('div', { class: 'row', style: { marginTop: '10px' } }, h('div', { style: { flex: 1, minWidth: '200px' } }, ui.field('Ou importer depuis une adresse Web', url, { help: 'L’image est téléchargée et enregistrée dans CSE Studio si le site l’autorise (CORS). Sinon, un message explique comment l’importer.' })), addUrl));
      draw();
      box.appendChild(h('h3', { style: { marginTop: '8px' } }, 'Lien de destination'));
      box.appendChild(bindSelect(it, 'link', [{ id: 'portal', label: 'Portail CSE' }, { id: 'custom', label: 'Lien personnalisé' }, { id: 'none', label: 'Aucun lien' }], ctx, { label: 'Bouton de la diapositive', get: function () { return it.link.type; }, set: function (v) { it.link.type = v; }, redraw: true, help: 'Portail : ' + p.settings.portalUrl + ' (page d’accueil après connexion ; les liens directs vers une activité Kalidea ne sont pas garantis). Sans lien valide, aucun bouton n’est affiché.' }));
      if (it.link.type === 'custom') box.appendChild(bindInput(it, 'link', ctx, { label: 'Adresse du lien personnalisé', type: 'url', get: function () { return it.link.url; }, set: function (v) { it.link.url = v.trim(); }, placeholder: 'https://…' }));
      if (it.link.type !== 'none') box.appendChild(bindInput(it, 'link', ctx, { label: 'Texte du bouton', max: 40, get: function () { return it.link.label; }, set: function (v) { it.link.label = v; } }));
    },
    tarifs: function (box, it, p, ctx) {
      if (!p.settings.pricingModule) { box.appendChild(h('div', { class: 'alert info' }, 'Le module « Tarifs CSE » est masqué dans les Paramètres : aucun tarif n’apparaît sur les diapositives.')); }
      var pr = it.pricing;
      box.appendChild(bindCheck(it, 'Afficher des tarifs sur cette fiche', function () { return pr.enabled; }, function (v) { pr.enabled = v; }, ctx, 'Désactivé : aucun cartouche, la composition récupère toute la place.', true, 'pricing'));
      if (pr.enabled) {
        box.appendChild(bindSelect(it, 'pricing', C.pricing.MODES, ctx, { label: 'Mode de calcul', get: function () { return pr.mode; }, set: function (v) { pr.mode = v; }, redraw: true }));
        var cols = h('div', { class: 'cols' });
        if (pr.mode !== 'single' && pr.mode !== 'manual') cols.appendChild(bindInput(it, 'pricing', ctx, { label: 'Prix extérieur / public (€)', type: 'number', min: 0, step: 0.01, get: function () { return pr.outside; }, set: function (v) { pr.outside = v; }, after: function () { drawTable(); } }));
        if (pr.mode === 'manual' || pr.mode === 'fixed') cols.appendChild(bindInput(it, 'pricing', ctx, { label: 'Prix extérieur (facultatif, €)', type: 'number', min: 0, step: 0.01, get: function () { return pr.outside; }, set: function (v) { pr.outside = v; } }));
        if (pr.mode === 'subsidy' || pr.mode === 'participation') cols.appendChild(bindInput(it, 'pricing', ctx, { label: pr.mode === 'subsidy' ? 'Réduction commune (%)' : 'Participation salarié (%)', type: 'number', min: 0, maxv: 100, get: function () { return pr.percent; }, set: function (v) { pr.percent = v; }, after: function () { drawTable(); } }));
        if (pr.mode === 'fixed' || pr.mode === 'single') cols.appendChild(bindInput(it, 'pricing', ctx, { label: pr.mode === 'single' ? 'Tarif unique (€)' : 'Prix salarié fixe (€)', type: 'number', min: 0, step: 0.01, get: function () { return pr.fixed; }, set: function (v) { pr.fixed = v; }, after: function () { drawTable(); } }));
        box.appendChild(cols);
        var table = h('div');
        box.appendChild(table);
        var drawTable = function () {
          ui.clear(table);
          var res = C.pricing.fromPricing(pr, p.settings);
          if (pr.mode === 'tranches' || pr.mode === 'manual') {
            var t = h('table', { class: 'price-table' }, h('thead', {}, h('tr', {}, h('th', {}, 'Tranche'), h('th', {}, pr.mode === 'tranches' ? 'Subvention' : ''), h('th', {}, pr.mode === 'tranches' ? 'Prix calculé' : 'Prix saisi (€)'), h('th', {}, pr.mode === 'tranches' ? 'Forcer un prix (€)' : ''))));
            var tb = h('tbody');
            for (var i = 0; i < 10; i++) (function (i) {
              var row = res.rows.find(function (r) { return r.label === 'T' + (i + 1); });
              var inp = h('input', { type: 'number', min: 0, step: 0.01, 'aria-label': (pr.mode === 'tranches' ? 'Prix forcé T' : 'Prix T') + (i + 1) });
              if (pr.mode === 'tranches') { inp.value = pr.overrides[i] === undefined ? '' : pr.overrides[i]; inp.placeholder = '—'; inp.addEventListener('change', function () { if (inp.value === '') delete pr.overrides[i]; else pr.overrides[i] = inp.value; ctx.touch(); ctx.render(); drawTable(); }); }
              else { inp.value = pr.manual[i] || ''; inp.addEventListener('change', function () { pr.manual[i] = inp.value; ctx.touch(); ctx.render(); drawTable(); }); }
              tb.appendChild(h('tr', {}, h('td', {}, 'T' + (i + 1)), h('td', {}, pr.mode === 'tranches' ? (p.settings.rates[i] + ' %') : ''), pr.mode === 'tranches' ? h('td', { class: 'calc' }, row ? C.pricing.money(row.price) + (row.overridden ? ' (forcé)' : '') : '—') : h('td', {}, inp), pr.mode === 'tranches' ? h('td', {}, inp) : h('td')));
            })(i);
            t.appendChild(tb); table.appendChild(t);
            if (pr.mode === 'tranches') table.appendChild(h('p', { class: 'small muted' }, 'Barème et arrondi modifiables dans Paramètres → Tarifs CSE (valeurs de départ à faire confirmer par le CSE).'));
          } else if (res.rows[0]) table.appendChild(h('p', {}, h('b', {}, 'Résultat : '), res.rows[0].label + ' ' + C.pricing.money(res.rows[0].price)));
          res.issues.forEach(function (x) { table.appendChild(h('div', { class: 'alert ' + (x[0] === 'block' ? 'error' : 'warn') + ' small' }, x[1])); });
        };
        drawTable();
        box.appendChild(h('div', { class: 'cols' }, bindInput(it, 'pricing', ctx, { label: 'Libellé (facultatif)', placeholder: 'Ex. Chambre double', get: function () { return pr.label; }, set: function (v) { pr.label = v; } }),
          bindInput(it, 'pricing', ctx, { label: 'Supplément / note (facultatif)', placeholder: 'Ex. Supplément single : 150 €', get: function () { return pr.notes; }, set: function (v) { pr.notes = v; }, help: 'Court : en haut à droite du cartouche. Long : encart intégré au cartouche, jamais tronqué.' })));
      }
      box.appendChild(overrideMark(h('fieldset', {}, h('legend', {}, 'Points (facultatif)'),
        h('div', { class: 'cols' }, bindInput(it, 'points', ctx, { label: 'Nombre de points', type: 'number', min: 0, step: 0.5, get: function () { return it.points.value; }, set: function (v) { it.points.value = v; } }),
          bindSelect(it, 'points', C.model.COUNTERS, ctx, { label: 'Compteur', get: function () { return it.points.counter; }, set: function (v) { it.points.counter = v; } })),
        h('small', { class: 'help' }, 'Le bloc « Points » n’apparaît que si un nombre est saisi.')), 'points', ctx));
    },
    pratique: function (box, it, p, ctx) {
      if (it.type === 'activity') {
        box.appendChild(h('div', { class: 'cols' }, bindInput(it, 'minPart', ctx, { label: 'Participants minimum', type: 'number', min: 0 }), bindInput(it, 'maxPart', ctx, { label: 'Participants maximum', type: 'number', min: 0 })));
        box.appendChild(h('div', { class: 'cols' }, bindInput(it, 'minAge', ctx, { label: 'Âge minimum', placeholder: 'Ex. 16 ou « À partir de 16 ans »' }), bindInput(it, 'audience', ctx, { label: 'Public éligible', placeholder: 'Ex. Salariés et ayants droit' })));
        box.appendChild(bindInput(it, 'carbon', ctx, { label: 'Bilan carbone (facultatif)', placeholder: 'Ex. 619 kg CO₂e (vol A/R)' }));
      }
      var head = overrideMark(h('div', {}, h('h3', {}, 'Contacts / référents'), h('p', { class: 'small muted' }, 'Sur la diapositive, seul le nom apparaît ; s’il a un e-mail valide, le nom devient un lien « mailto: » dans l’aperçu et le PowerPoint. L’adresse reste lisible dans le lien : ne saisir que des adresses destinées à être diffusées.')), 'contacts', ctx);
      box.appendChild(head);
      var list = h('div');
      var EMAIL = /^[^\s@<>"'(),;:\\]+@[^\s@<>"'(),;:\\]+\.[A-Za-z]{2,}$/;
      function draw() {
        ui.clear(list);
        it.contacts.forEach(function (c, i) {
          var row = h('div', { class: 'contact-row two' });
          var name = h('input', { type: 'text', value: c.name || '', placeholder: 'Prénom Nom', 'aria-label': 'Nom du contact ' + (i + 1) });
          var mail = h('input', { type: 'email', value: c.email || '', placeholder: 'prenom.nom@…', 'aria-label': 'E-mail du contact ' + (i + 1) });
          var msg = h('small', { class: 'field-msg', 'aria-live': 'polite' });
          function check() {
            var e = String(mail.value || '').trim();
            var bad = e && !EMAIL.test(e);
            mail.setAttribute('aria-invalid', bad ? 'true' : 'false');
            msg.textContent = bad ? 'Adresse invalide : le nom sera affiché sans lien.' : (e ? 'Lien mailto actif sur le nom.' : 'Sans e-mail : nom affiché sans lien.');
            msg.className = 'field-msg' + (bad ? ' warn' : '');
          }
          name.addEventListener('input', function () { c.name = name.value; ctx.touch(); ctx.render(); });
          mail.addEventListener('input', function () { c.email = mail.value.trim(); check(); ctx.touch(); ctx.render(); });
          check();
          // Téléphone et fonction des versions précédentes : conservés tels quels, sans être affichés.
          row.appendChild(h('div', {}, name));
          row.appendChild(h('div', {}, mail, msg));
          row.appendChild(h('button', { class: 'btn small danger', type: 'button', 'aria-label': 'Retirer le contact ' + (i + 1), onclick: function () { it.contacts.splice(i, 1); ctx.touch(); ctx.render(); draw(); } }, '✕'));
          list.appendChild(row);
        });
        if (!it.contacts.length) list.appendChild(h('p', { class: 'small muted' }, 'Aucun contact : la ligne « Contact » n’apparaîtra pas.'));
      }
      draw();
      box.appendChild(list);
      var refs = p.settings.referents.filter(function (r) { return r.name || r.email; });
      var refSel = ui.selectEl([{ id: '', label: 'Ajouter un référent enregistré…' }].concat(refs.map(function (r, i) { return { id: String(i), label: r.name || r.email }; })), '');
      refSel.addEventListener('change', function () { var r = refs[Number(refSel.value)]; if (r) { it.contacts.push(Object.assign({}, r)); ctx.touch(); ctx.render(); draw(); } refSel.value = ''; });
      box.appendChild(h('div', { class: 'row' }, h('button', { class: 'btn', type: 'button', onclick: function () { it.contacts.push({ name: '', email: '' }); draw(); } }, '+ Ajouter un contact'), refs.length ? refSel : h('a', { href: '#/parametres', class: 'small' }, 'Enregistrer des référents réutilisables')));
    },
    offre: function (box, it, p, ctx) {
      var pa = it.partner;
      box.appendChild(bindInput(it, 'partner', ctx, { label: 'Offre / avantage', rows: 2, get: function () { return pa.offer; }, set: function (v) { pa.offer = v; }, placeholder: 'Ex. Remise supplémentaire sur tout le catalogue' }));
      box.appendChild(h('div', { class: 'cols' },
        bindInput(it, 'partner', ctx, { label: 'Montant ou remise (pastille)', max: 40, get: function () { return pa.amount; }, set: function (v) { pa.amount = v; }, placeholder: 'Ex. −20 % ou 15 €' }),
        bindInput(it, 'partner', ctx, { label: 'Code promotionnel', max: 60, get: function () { return pa.code; }, set: function (v) { pa.code = v; } }),
        bindInput(it, 'partner', ctx, { label: 'Valable jusqu’au', type: 'date', get: function () { return pa.validUntil; }, set: function (v) { pa.validUntil = v; } })));
    },
    calendrier: function (box, it, p, ctx) {
      var cal = it.calendar, M = C.model;
      cal.dayHours = cal.dayHours || {};
      box.appendChild(overrideMark(h('div', { class: 'cols' }, bindInput(it, 'calendar', ctx, { label: 'Mois affiché', type: 'month', get: function () { return cal.month; }, set: function (v) { cal.month = v; }, after: function () { ctx.redraw(); } }),
        bindInput(it, 'calendar', ctx, { label: 'Nom du service (pastille)', get: function () { return cal.service; }, set: function (v) { cal.service = v; }, placeholder: 'Permanences, Prêt de matériel…' })), 'calendar', ctx));
      box.appendChild(bindInput(it, 'calendar', ctx, { label: 'Horaire standard des jours « Ouvert » (vert)', get: function () { return cal.openHours; }, set: function (v) { cal.openHours = v; }, placeholder: 'Ex. 13h–16h' }));
      // Pinceau : on choisit un état puis on clique sur les jours ; les autres dates ne sont jamais effacées.
      var brush = state.calBrush = state.calBrush || { state: 'open', hours: '' };
      var brushBox = h('fieldset', {}, h('legend', {}, '1. Choisir l’état à appliquer'));
      [['open', 'Ouvert'], ['special', 'Horaire particulier'], ['closed', 'Fermé'], ['none', 'Effacer']].forEach(function (o) {
        var r = h('input', { type: 'radio', name: 'cal-brush', value: o[0], checked: brush.state === o[0] });
        r.addEventListener('change', function () { brush.state = o[0]; hoursWrap.classList.toggle('hidden', o[0] !== 'special'); });
        var sw = o[0] === 'none' ? h('span', { class: 'dot', style: { background: '#FFFFFF', border: '1px solid #9AA8BF' } }) : h('span', { class: 'dot', style: { background: M.CAL_STATES[o[0]].color } });
        brushBox.appendChild(h('label', { class: 'check', style: { display: 'inline-flex', marginRight: '14px' } }, r, sw, o[1]));
      });
      var hoursIn = h('input', { value: brush.hours, placeholder: 'Ex. 9h–12h ou 10h–12h / 14h–16h', 'aria-label': 'Horaire particulier à appliquer' });
      hoursIn.addEventListener('input', function () { brush.hours = hoursIn.value; });
      var hoursWrap = h('div', { class: brush.state === 'special' ? '' : 'hidden' }, ui.field('Horaire appliqué aux jours cliqués', hoursIn, { help: 'Chaque jour garde son propre horaire, modifiable ci-dessous.' }));
      brushBox.appendChild(hoursWrap);
      box.appendChild(brushBox);
      box.appendChild(h('p', { class: 'small muted', style: { margin: '4px 0' } }, '2. Cliquer sur les jours (ici ou directement sur l’aperçu, où un clic fait défiler Ouvert → Horaire particulier → Fermé → vide). La page ne remonte pas.'));
      var grid = h('div', { class: 'cal-editor', role: 'grid', 'aria-label': 'Jours du mois' });
      ['LUN', 'MAR', 'MER', 'JEU', 'VEN'].forEach(function (d) { grid.appendChild(h('div', { class: 'h' }, d)); });
      var month = cal.month || App.refDate().slice(0, 7);
      for (var d = D.monday(month + '-01'); d.slice(0, 7) <= month; d = D.addDays(d, 1)) {
        var wd = D.weekday(d);
        if (wd === 0 || wd === 6) continue;
        (function (day) {
          var inMonth = day.slice(0, 7) === month;
          var st = inMonth ? M.calendarDay(cal, day) : null;
          var label = st ? M.CAL_STATES[st.state].label + (st.hours ? ' ' + st.hours : '') : 'sans information';
          var b = h('button', { type: 'button', class: inMonth ? '' : 'out', style: st ? { background: M.CAL_STATES[st.state].color } : {}, 'aria-label': D.fmtDay(day) + ' : ' + label, title: label },
            inMonth ? String(+day.slice(8)) : '', st && st.state === 'special' && st.hours ? h('small', { class: 'cal-h' }, st.hours) : null);
          if (inMonth) b.addEventListener('click', function (e) {
            e.preventDefault();
            if (brush.state === 'none') { delete cal.days[day]; delete cal.dayHours[day]; }
            else {
              cal.days[day] = brush.state;
              if (brush.state === 'special') { if (String(brush.hours).trim()) cal.dayHours[day] = brush.hours.trim(); }
              else delete cal.dayHours[day];
            }
            ctx.touch(); ctx.render(); (ctx.redrawKeepScroll || ctx.redraw)();
          });
          grid.appendChild(b);
        })(d);
      }
      box.appendChild(grid);
      // Modification en masse : plage « du … au … », jours de la semaine choisis.
      var dateRange = h('fieldset', { class: 'cal-range' }, h('legend', {}, '3. Appliquer à une plage de dates'));
      var range = state.calRange = state.calRange && state.calRange.month === month ? state.calRange : { month: month, from: month + '-01', to: month + '-01', days: [1, 2, 3, 4, 5] };
      var lastDay = month + '-' + D.pad(new Date(Date.UTC(+month.slice(0, 4), +month.slice(5), 0)).getUTCDate());
      var fromDate = h('input', { type: 'date', value: range.from, min: month + '-01', max: lastDay, 'aria-label': 'Début de plage' });
      var toDate = h('input', { type: 'date', value: range.to, min: fromDate.min, max: lastDay, 'aria-label': 'Fin de plage' });
      fromDate.addEventListener('change', function () { range.from = fromDate.value; toDate.min = fromDate.value || fromDate.min; if (!toDate.value || toDate.value < fromDate.value) toDate.value = fromDate.value; range.to = toDate.value; });
      toDate.addEventListener('change', function () { range.to = toDate.value; });
      var dayChecks = h('div', { class: 'row small' });
      [[1, 'lun.'], [2, 'mar.'], [3, 'mer.'], [4, 'jeu.'], [5, 'ven.']].forEach(function (o) {
        var c = h('input', { type: 'checkbox', checked: range.days.indexOf(o[0]) >= 0 });
        c.addEventListener('change', function () { range.days = range.days.filter(function (x) { return x !== o[0]; }); if (c.checked) range.days.push(o[0]); });
        dayChecks.appendChild(h('label', { class: 'check', style: { margin: '0 8px 0 0' } }, c, o[1]));
      });
      var applyRange = h('button', { type: 'button', class: 'btn small primary', onclick: function () {
        var from = fromDate.value, to = toDate.value;
        if (!from || !to || from > to || from.slice(0, 7) !== month || to.slice(0, 7) !== month) return ui.toast('Choisir deux dates du mois, dans l’ordre.', 'error');
        if (brush.state === 'special' && !String(brush.hours || '').trim()) return ui.toast('Indiquer les horaires particuliers avant de les appliquer.', 'error');
        var count = 0;
        for (var cursor = from; cursor <= to; cursor = D.addDays(cursor, 1)) {
          var wd = D.weekday(cursor);
          if (wd === 0 || wd === 6 || range.days.indexOf(wd) < 0) continue;
          count++;
          if (brush.state === 'none') { delete cal.days[cursor]; delete cal.dayHours[cursor]; }
          else { cal.days[cursor] = brush.state; if (brush.state === 'special') cal.dayHours[cursor] = brush.hours.trim(); else delete cal.dayHours[cursor]; }
        }
        ctx.touch(); ctx.render(); (ctx.redrawKeepScroll || ctx.redraw)();
        ui.toast(count + ' jour(s) mis à jour.', 'ok');
      } }, 'Appliquer');
      dateRange.appendChild(h('div', { class: 'cols' }, ui.field('Du', fromDate), ui.field('Au', toDate)));
      dateRange.appendChild(ui.field('Jours concernés', dayChecks));
      dateRange.appendChild(applyRange);
      dateRange.appendChild(h('p', { class: 'help' }, 'Les samedis et dimanches sont toujours ignorés. Les jours déjà renseignés dans la plage sont remplacés.'));
      box.appendChild(dateRange);
      var specials = Object.keys(cal.days).filter(function (k) { return k.slice(0, 7) === month && cal.days[k] === 'special'; }).sort();
      if (specials.length) {
        var fs = h('fieldset', {}, h('legend', {}, 'Horaires particuliers du mois'));
        specials.forEach(function (day) {
          var inp = h('input', { value: cal.dayHours[day] || '', placeholder: 'Horaire', 'aria-label': 'Horaire du ' + D.fmtDay(day) });
          inp.addEventListener('input', function () { if (inp.value.trim()) cal.dayHours[day] = inp.value; else delete cal.dayHours[day]; ctx.touch(); ctx.render(); });
          var msg = cal.dayHours[day] ? null : h('small', { class: 'field-msg warn' }, 'Horaire à saisir');
          fs.appendChild(h('div', { class: 'legend-row', style: { gridTemplateColumns: '150px 1fr' } }, h('span', { class: 'small' }, D.capital(D.fmtDayShort(day))), h('div', {}, inp, msg)));
        });
        box.appendChild(fs);
      }
      box.appendChild(h('p', { class: 'small muted' }, 'La légende est générée automatiquement : seuls les états utilisés ce mois-ci apparaissent, et les horaires identiques sont regroupés.'));
      box.appendChild(bindInput(it, 'calendar', ctx, { label: 'Lieu / informations (texte sous la légende)', rows: 2, get: function () { return cal.hours; }, set: function (v) { cal.hours = v; } }));
      box.appendChild(h('div', { class: 'cols' }, bindInput(it, 'calendar', ctx, { label: 'Lien du catalogue (facultatif)', type: 'url', get: function () { return cal.catalogUrl; }, set: function (v) { cal.catalogUrl = v.trim(); } }),
        bindInput(it, 'calendar', ctx, { label: 'Texte du lien', get: function () { return cal.catalogLabel; }, set: function (v) { cal.catalogLabel = v; } })));
      box.appendChild(bindInput(it, 'calendar', ctx, { label: 'Mention sous le calendrier (facultatif)', get: function () { return cal.note; }, set: function (v) { cal.note = v; }, placeholder: p.settings.mentions.calendar }));
    }
  };
})(window);
