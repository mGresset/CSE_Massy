/* CSE Studio V9 · Petits outils d'interface (DOM sûr, dialogues, notifications, miniatures). */
(function (root) {
  'use strict';
  var CSE = root.CSE;

  /** Crée un élément : h('button', {class:'btn', onclick: fn}, 'Texte'). Le texte n'est jamais interprété comme HTML. */
  function h(tag, attrs) {
    var el = document.createElement(tag);
    var a = attrs || {};
    Object.keys(a).forEach(function (k) {
      var v = a[k];
      if (v === undefined || v === null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else if (k === 'checked') el.checked = !!v;
      else if (k === 'selected') el.selected = !!v;
      else if (k === 'disabled') el.disabled = !!v;
      else if (k === 'dataset') Object.keys(v).forEach(function (d) { el.dataset[d] = v[d]; });
      else el.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { append(el, x); }); return; }
    el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

  function toast(msg, kind, ms) {
    var box = document.getElementById('toasts');
    if (!box) return;
    var t = h('div', { class: 'toast ' + (kind || ''), role: kind === 'error' ? 'alert' : 'status' }, msg);
    box.appendChild(t);
    setTimeout(function () { t.remove(); }, ms || (kind === 'error' ? 7000 : 3800));
  }
  /** Dialogue générique : renvoie une promesse résolue avec la valeur du bouton cliqué (ou null). */
  function dialog(opts) {
    return new Promise(function (resolve) {
      var d = h('dialog', { class: opts.full ? 'full' : '', 'aria-label': opts.title || 'Dialogue' });
      var done = false;
      function close(v) { if (done) return; done = true; d.close(); d.remove(); resolve(v); }
      var head = h('div', { class: 'dlg-head' }, h('h2', { text: opts.title || '' }), h('button', { class: 'btn ghost icon', type: 'button', 'aria-label': 'Fermer', onclick: function () { close(null); } }, '✕'));
      var body = h('div', { class: 'dlg-body' }, opts.body);
      d.appendChild(head); d.appendChild(body);
      if (opts.buttons && opts.buttons.length) {
        var foot = h('div', { class: 'dlg-foot' });
        opts.buttons.forEach(function (b) {
          foot.appendChild(h('button', { class: 'btn ' + (b.kind || ''), type: 'button', onclick: function () { if (b.validate && !b.validate()) return; close(b.value === undefined ? true : b.value); } }, b.label));
        });
        d.appendChild(foot);
      }
      d.addEventListener('cancel', function (e) { e.preventDefault(); close(null); });
      document.body.appendChild(d);
      d.showModal();
      if (opts.onOpen) opts.onOpen(d, close);
      var f = d.querySelector('[autofocus]') || d.querySelector('.dlg-foot .btn.primary') || d.querySelector('input,select,textarea,button');
      if (f) setTimeout(function () { f.focus(); }, 30);
    });
  }
  function confirmDlg(title, message, okLabel, danger) {
    return dialog({ title: title, body: h('p', { style: { margin: 0, whiteSpace: 'pre-line' } }, message), buttons: [{ label: 'Annuler', value: false }, { label: okLabel || 'Confirmer', kind: danger ? 'danger' : 'primary', value: true }] }).then(function (v) { return v === true; });
  }
  function download(content, name, mime) {
    var blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'application/octet-stream' });
    var url = URL.createObjectURL(blob);
    var a = h('a', { href: url, download: name });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
  }
  function slug(s) { return String(s || 'cse').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/œ/g, 'oe').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60) || 'cse'; }
  function readFileText(file) { return new Promise(function (resolve, reject) { var r = new FileReader(); r.onload = function () { resolve(r.result); }; r.onerror = function () { reject(Error('Fichier illisible.')); }; r.readAsText(file); }); }
  function pickFile(accept, multiple) {
    return new Promise(function (resolve) {
      var inp = h('input', { type: 'file', accept: accept || '', class: 'sr' });
      if (multiple) inp.multiple = true;
      inp.addEventListener('change', function () { resolve(Array.prototype.slice.call(inp.files || [])); inp.remove(); });
      document.body.appendChild(inp); inp.click();
    });
  }

  /* ---------- Miniatures de diapositives ---------- */
  var ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(function (entries) { entries.forEach(function (e) { CSE.renderHTML.fit(e.target); }); }) : null;
  var io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting && e.target.__render) { var f = e.target.__render; e.target.__render = null; io.unobserve(e.target); f(); } });
  }, { rootMargin: '300px' }) : null;
  /** Cadre 16:9 contenant une diapositive (rendu différé si lazy). */
  function slideFrame(slide, opts) {
    opts = opts || {};
    var frame = h('div', { class: 'cse-frame' + (opts.className ? ' ' + opts.className : '') });
    var res = { frame: frame, domOverflow: [] };
    function draw() {
      var r = CSE.renderHTML.render(slide, frame, { onAction: opts.onAction, label: opts.label, checkOverflow: opts.checkOverflow });
      res.domOverflow = r.domOverflow;
      CSE.renderHTML.fit(frame);
      if (ro) ro.observe(frame);
      if (opts.onDrawn) opts.onDrawn(r);
    }
    if (opts.lazy && io) { frame.__render = draw; io.observe(frame); }
    else if (opts.defer) setTimeout(draw, 0);
    else { var tries = 0; (function wait() { if (frame.isConnected || tries++ > 40) draw(); else setTimeout(wait, 15); })(); }
    return res;
  }
  function fitAll(root) { (root || document).querySelectorAll('.cse-frame').forEach(CSE.renderHTML.fit); }

  /* ---------- Libellés ---------- */
  function rubricChip(cls) {
    var R = CSE.compose.RUBRICS[cls.rubric] || { label: cls.rubric };
    var label = R.label;
    if (cls.rubric === 'last' && cls.daysLeft !== null) label += ' · ' + (cls.daysLeft === 0 ? 'dernier jour' : 'J−' + cls.daysLeft);
    var span = h('span', { class: 'chip ' + cls.rubric }, label);
    var frag = [span];
    if (cls.isNew && cls.rubric !== 'new') frag.push(h('span', { class: 'chip new' }, 'Nouveau'));
    return frag;
  }
  function typeLabel(t) { var x = CSE.model.TYPES.find(function (y) { return y.id === t; }); return x ? x.label : t; }
  function catChip(project, item) {
    var c = CSE.model.categoryOf(project, item);
    if (!c) return null;
    return h('span', { class: 'chip', style: { background: CSE.layout.tint(c.color, 0.14), color: CSE.layout.shade(c.color, 0.2) } }, h('span', { class: 'dot', style: { background: c.color } }), c.name);
  }
  function selectEl(options, value, attrs) {
    var s = h('select', attrs || {});
    options.forEach(function (o) {
      var opt = h('option', { value: o.id !== undefined ? o.id : o.value }, o.label !== undefined ? o.label : o.name);
      if (String(opt.value) === String(value)) opt.selected = true;
      s.appendChild(opt);
    });
    return s;
  }
  function fieldWrap(label, control, o) {
    o = o || {};
    var id = control.id || ('f-' + Math.random().toString(36).slice(2, 9));
    control.id = id;
    var lab = h('label', { for: id }, label, o.required ? h('span', { class: 'req', 'aria-hidden': 'true' }, ' *') : null);
    if (o.required) control.setAttribute('aria-required', 'true');
    var wrap = h('div', { class: 'field' + (o.className ? ' ' + o.className : '') }, lab, control);
    if (o.help) { var hid = id + '-help'; wrap.appendChild(h('small', { id: hid }, o.help)); control.setAttribute('aria-describedby', hid); }
    return wrap;
  }
  function debounce(fn, ms) { var t; return function () { var a = arguments, self = this; clearTimeout(t); t = setTimeout(function () { fn.apply(self, a); }, ms); }; }

  CSE.ui = { h: h, clear: clear, toast: toast, dialog: dialog, confirm: confirmDlg, download: download, slug: slug, readFileText: readFileText, pickFile: pickFile,
    slideFrame: slideFrame, fitAll: fitAll, rubricChip: rubricChip, typeLabel: typeLabel, catChip: catChip, selectEl: selectEl, field: fieldWrap, debounce: debounce };
})(window);
