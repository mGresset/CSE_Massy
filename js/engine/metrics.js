/* CSE Studio V9 · Mesure du texte (Arial), identique dans le navigateur, dans Node et pour le PowerPoint.
 * Les largeurs de glyphes sont celles d'Arial / Helvetica (unités pour 1000 em), métriquement compatibles.
 * L'aperçu HTML et l'export PPTX utilisent tous deux Arial, la même taille, le même interligne (1,2)
 * et des marges internes nulles : la mesure ci-dessous décide donc du découpage pour les deux rendus.
 * Une marge de sécurité de 4 % absorbe les petites différences de rendu (crénage, arrondis). */
(function (root, factory) {
  'use strict';
  var mod = factory();
  root.CSE = root.CSE || {};
  root.CSE.metrics = mod;
  if (typeof module === 'object' && module.exports) module.exports = mod;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  // Codes 32 à 126.
  var REG = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
    1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
    333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
  var BOLD = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
    975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
    333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584];
  var SPECIAL = {
    ' ': [278, 278], '’': [222, 278], '‘': [222, 278], '“': [333, 500], '”': [333, 500], '«': [556, 556], '»': [556, 556],
    '–': [556, 556], '—': [1000, 1000], '−': [584, 584], '…': [1000, 1000], '•': [350, 350], '·': [278, 278], '€': [556, 556],
    '°': [400, 400], '×': [584, 584], 'œ': [944, 944], 'Œ': [1000, 1000], 'æ': [889, 889], 'Æ': [1000, 1000], 'ß': [611, 611],
    '²': [333, 333], '³': [333, 333], '½': [834, 834], '¼': [834, 834], '→': [1000, 1000], '←': [1000, 1000], '✓': [800, 800]
  };
  var SAFETY = 1.04;
  var LINE_HEIGHT = 1.2;
  /* V10 : un paragraphe vide (séparation entre blocs) occupe une demi-ligne, dans l'aperçu
   * comme dans PowerPoint (interligne exact par paragraphe). Espacement plus professionnel et
   * davantage de texte lisible sur une seule diapositive. */
  var PARA_GAP = 0.5;
  var cache = {};

  function charWidth(ch, bold) {
    var c = ch.charCodeAt(0);
    if (c >= 32 && c <= 126) return (bold ? BOLD : REG)[c - 32];
    var sp = SPECIAL[ch];
    if (sp) return sp[bold ? 1 : 0];
    var key = ch + (bold ? 'b' : 'r');
    if (cache[key] !== undefined) return cache[key];
    var base = ch.normalize ? ch.normalize('NFD').charAt(0) : ch;
    var w;
    if (base !== ch && base.charCodeAt(0) >= 32 && base.charCodeAt(0) <= 126) w = (bold ? BOLD : REG)[base.charCodeAt(0) - 32];
    else if (c >= 0x2000 && c <= 0x206f) w = 500; // ponctuation générale
    else if (c > 0x2190) w = 1000; // symboles, pictogrammes, emoji : volontairement large
    else w = 600;
    cache[key] = w;
    return w;
  }
  /** Largeur d'une chaîne en pixels de diapositive pour une taille donnée. */
  function width(text, size, bold) {
    var s = String(text || ''), total = 0;
    for (var i = 0; i < s.length; i++) {
      var code = s.charCodeAt(i);
      if (code >= 0xd800 && code <= 0xdbff) { total += 1000; i++; continue; } // emoji (paire de substitution)
      total += charWidth(s[i], bold);
    }
    return total * size / 1000;
  }

  /* ---------- Paragraphes enrichis ----------
   * Un texte est une liste de paragraphes : {runs:[{text, bold, color, link}], bullet:boolean, align}
   * Syntaxe acceptée dans les champs : **gras**, lignes « - » ou « • » = puces, ligne vide = espace. */
  function parseRich(text, opts) {
    opts = opts || {};
    var lines = String(text === undefined || text === null ? '' : text).replace(/\r\n?/g, '\n').split('\n');
    var paras = [];
    lines.forEach(function (raw) {
      var line = raw.replace(/\s+$/, '');
      var bullet = false;
      var m = /^\s*(?:[-•*·]|–)\s+(.*)$/.exec(line);
      if (m && !/^\*\*/.test(line.trim())) { bullet = true; line = m[1]; }
      else if (opts.bullets) { bullet = !!line.trim(); }
      paras.push({ runs: parseRuns(line, opts.bold), bullet: bullet && !!line.trim() });
    });
    // Supprime les lignes vides en début et fin, réduit les vides multiples.
    while (paras.length && isEmpty(paras[0])) paras.shift();
    while (paras.length && isEmpty(paras[paras.length - 1])) paras.pop();
    var out = [];
    paras.forEach(function (p) { if (isEmpty(p) && out.length && isEmpty(out[out.length - 1])) return; out.push(p); });
    return out;
  }
  function parseRuns(line, boldAll) {
    var runs = [], re = /\*\*([^*]+)\*\*/g, last = 0, m;
    while ((m = re.exec(line))) {
      if (m.index > last) runs.push({ text: line.slice(last, m.index), bold: !!boldAll });
      runs.push({ text: m[1], bold: true });
      last = m.index + m[0].length;
    }
    if (last < line.length) runs.push({ text: line.slice(last), bold: !!boldAll });
    if (!runs.length) runs.push({ text: '', bold: !!boldAll });
    return runs;
  }
  function isEmpty(p) { return !p.runs.some(function (r) { return String(r.text).trim(); }); }
  function plain(paras) { return paras.map(function (p) { return (p.bullet ? '• ' : '') + p.runs.map(function (r) { return r.text; }).join(''); }).join('\n'); }
  /** Convertit du texte simple (ou une liste de paragraphes) en paragraphes. */
  function toParas(value, opts) {
    if (Array.isArray(value)) return value;
    return parseRich(value, opts);
  }

  /** Découpe un paragraphe en jetons {text, bold, space} (les espaces insécables restent dans le mot). */
  function tokens(para) {
    var out = [];
    var runs = para.bullet ? [{ text: '• ', bold: false }].concat(para.runs) : para.runs;
    runs.forEach(function (run, ri) {
      var parts = String(run.text).split(/( +)/);
      parts.forEach(function (part) {
        if (part === '') return;
        if (/^ +$/.test(part)) { out.push({ space: true, text: part, bold: run.bold, color: run.color, link: run.link, run: ri }); return; }
        // Un mot peut continuer d'un run à l'autre (ex. **gras**suite) : on le colle au précédent.
        var prev = out[out.length - 1];
        if (prev && !prev.space && prev.run !== ri) { prev.parts.push({ text: part, bold: run.bold, color: run.color, link: run.link }); prev.text += part; return; }
        out.push({ space: false, text: part, bold: run.bold, run: ri, parts: [{ text: part, bold: run.bold, color: run.color, link: run.link }] });
      });
    });
    return out;
  }
  function tokenWidth(t, size) {
    if (t.space) return width(t.text, size, t.bold);
    return t.parts.reduce(function (s, p) { return s + width(p.text, size, p.bold); }, 0);
  }
  /** Nombre de lignes et découpage d'un paragraphe pour une largeur donnée. */
  function wrapPara(para, maxW, size) {
    var toks = tokens(para), lines = [], cur = [], curW = 0, limit = maxW / SAFETY;
    if (!toks.length) return [[]];
    function push() { while (cur.length && cur[cur.length - 1].space) cur.pop(); lines.push(cur); cur = []; curW = 0; }
    toks.forEach(function (t) {
      var tw = tokenWidth(t, size);
      if (t.space) { if (cur.length) { cur.push(t); curW += tw; } return; }
      if (curW + tw <= limit || !cur.length) {
        if (!cur.length && tw > limit) {
          // Mot plus long que la ligne (URL…) : coupure par caractères.
          var chunk = '', chunkW = 0;
          for (var i = 0; i < t.text.length; i++) {
            var cw = width(t.text[i], size, t.bold);
            if (chunkW + cw > limit && chunk) { cur.push({ space: false, text: chunk, bold: t.bold, parts: [{ text: chunk, bold: t.bold }] }); push(); chunk = ''; chunkW = 0; }
            chunk += t.text[i]; chunkW += cw;
          }
          cur.push({ space: false, text: chunk, bold: t.bold, parts: [{ text: chunk, bold: t.bold }] }); curW = chunkW;
          return;
        }
        cur.push(t); curW += tw;
      } else {
        push();
        if (tw > limit) { wrapLong(t); return; }
        cur.push(t); curW = tw;
      }
    });
    function wrapLong(t) {
      var chunk = '', chunkW = 0;
      for (var i = 0; i < t.text.length; i++) {
        var cw = width(t.text[i], size, t.bold);
        if (chunkW + cw > limit && chunk) { cur.push({ space: false, text: chunk, bold: t.bold, parts: [{ text: chunk, bold: t.bold }] }); push(); chunk = ''; chunkW = 0; }
        chunk += t.text[i]; chunkW += cw;
      }
      cur.push({ space: false, text: chunk, bold: t.bold, parts: [{ text: chunk, bold: t.bold }] }); curW = chunkW;
    }
    if (cur.length || !lines.length) push();
    return lines;
  }
  function countLines(paras, maxW, size) {
    var n = 0;
    paras.forEach(function (p) { n += isEmpty(p) ? PARA_GAP : wrapPara(p, maxW, size).length; });
    return n;
  }
  function textHeight(paras, maxW, size, lh) { return countLines(paras, maxW, size) * size * (lh || LINE_HEIGHT); }
  /** Largeur maximale d'une ligne (utile pour dimensionner les pastilles). */
  function maxLineWidth(paras, size) {
    var m = 0;
    paras.forEach(function (p) {
      var w = tokens(p).reduce(function (s, t) { return s + tokenWidth(t, size); }, 0);
      if (w > m) m = w;
    });
    return m * SAFETY;
  }

  /** Cherche la plus grande taille (≤ max, ≥ min) pour laquelle le texte tient dans w × h.
   * Si rien ne tient au minimum, renvoie overflow:true et une version tronquée explicitement signalée. */
  function fit(value, w, h, opts) {
    opts = opts || {};
    var paras = toParas(value, opts);
    var max = opts.max || 20, min = Math.min(opts.min || 12, max), step = opts.step || 0.5, lh = opts.lh || LINE_HEIGHT;
    var maxLines = opts.maxLines || Infinity;
    if (!paras.length) return { paras: [], size: max, lines: 0, height: 0, overflow: false, hidden: 0 };
    for (var size = max; size >= min - 0.001; size -= step) {
      var n = countLines(paras, w, size);
      if (n * size * lh <= h + 0.5 && n <= maxLines) return { paras: paras, size: round1(size), lines: n, height: n * size * lh, overflow: false, hidden: 0 };
    }
    // Débordement : on tronque à la taille minimale, en le signalant.
    var capacity = Math.max(1, Math.min(maxLines, Math.floor((h + 0.5) / (min * lh))));
    var res = truncate(paras, w, min, capacity);
    return { paras: res.paras, size: min, lines: capacity, height: capacity * min * lh, overflow: true, hidden: res.hiddenWords, original: paras };
  }
  function round1(x) { return Math.round(x * 10) / 10; }
  /** Reconstruit des runs à partir de lignes de jetons (couleurs, liens et gras conservés). */
  function linesToRuns(ls) {
    var runs = [];
    ls.forEach(function (line, li) {
      line.forEach(function (t) {
        if (t.space) { runs.push({ text: ' ', bold: t.bold, color: t.color, link: t.link }); return; }
        t.parts.forEach(function (pt) { runs.push({ text: pt.text, bold: pt.bold, color: pt.color, link: pt.link }); });
      });
      if (li < ls.length - 1) runs.push({ text: ' ', bold: false });
    });
    return runs;
  }
  function dropBulletPrefix(runs) {
    if (!runs.length) return runs;
    if (runs[0].text === '• ') runs.shift();
    else if (runs[0].text.indexOf('• ') === 0) runs[0] = Object.assign({}, runs[0], { text: runs[0].text.slice(2) });
    return runs;
  }
  /** Garde les « capacity » premières lignes et termine TOUJOURS par « … » visible. */
  function truncate(paras, w, size, capacity) {
    var flat = [], totalWords = 0;
    paras.forEach(function (p, pi) {
      totalWords += tokens(p).filter(function (t) { return !t.space; }).length;
      if (isEmpty(p)) flat.push({ pi: pi, empty: true });
      else wrapPara(p, w, size).forEach(function (l) { flat.push({ pi: pi, line: l }); });
    });
    if (flat.length <= capacity) return { paras: paras, hiddenWords: 0 };
    var keep = flat.slice(0, capacity);
    while (keep.length > 1 && keep[keep.length - 1].empty) keep.pop();
    var lastLine = keep[keep.length - 1];
    if (lastLine.empty) return { paras: [{ runs: [{ text: '…' }] }], hiddenWords: totalWords };
    // Place pour « … » sur la dernière ligne conservée.
    var ellW = width(' …', size, false), lim = w / SAFETY;
    var ln = lastLine.line.slice();
    var lw = ln.reduce(function (s, t) { return s + tokenWidth(t, size); }, 0);
    while (ln.length > 1 && lw + ellW > lim) { lw -= tokenWidth(ln.pop(), size); while (ln.length && ln[ln.length - 1].space) lw -= tokenWidth(ln.pop(), size); }
    lastLine.line = ln;
    var out = [], keptWords = 0, cur = null;
    keep.forEach(function (f) {
      if (f.empty) { out.push(paras[f.pi]); cur = null; return; }
      if (!cur || cur.pi !== f.pi) { cur = { pi: f.pi, lines: [] }; out.push(cur); }
      cur.lines.push(f.line);
      f.line.forEach(function (t) { if (!t.space) keptWords++; });
    });
    out = out.map(function (o, i) {
      if (!o.lines) return o;
      var src = paras[o.pi];
      var runs = linesToRuns(o.lines);
      if (src.bullet) runs = dropBulletPrefix(runs);
      if (i === out.length - 1) runs.push({ text: ' …', bold: false });
      return { runs: mergeRuns(runs), bullet: src.bullet, align: src.align, heading: src.heading };
    });
    return { paras: out, hiddenWords: Math.max(1, totalWords - keptWords) };
  }
  function mergeRuns(runs) {
    var out = [];
    runs.forEach(function (r) {
      var prev = out[out.length - 1];
      if (prev && prev.bold === r.bold && prev.color === r.color && prev.link === r.link) prev.text += r.text;
      else out.push({ text: r.text, bold: r.bold, color: r.color, link: r.link });
    });
    return out;
  }

  /** Coupe un paragraphe après n lignes : renvoie [début, suite] (null si rien à couper). */
  function splitPara(para, w, size, n) {
    var lines = wrapPara(para, w, size);
    if (n <= 0 || n >= lines.length) return null;
    function build(ls, dropBullet) {
      var runs = [];
      ls.forEach(function (line, li) {
        line.forEach(function (t) {
          if (t.space) { runs.push({ text: ' ', bold: t.bold, color: t.color, link: t.link }); return; }
          t.parts.forEach(function (pt) { runs.push({ text: pt.text, bold: pt.bold, color: pt.color, link: pt.link }); });
        });
        if (li < ls.length - 1) runs.push({ text: ' ', bold: false });
      });
      if (dropBullet && runs.length) {
        if (runs[0].text === '\u2022\u00a0') runs.shift();
        else if (runs[0].text.indexOf('\u2022\u00a0') === 0) runs[0] = Object.assign({}, runs[0], { text: runs[0].text.slice(2) });
      }
      return mergeRuns(runs);
    }
    var first = { runs: build(lines.slice(0, n), para.bullet), bullet: para.bullet, align: para.align };
    var rest = { runs: build(lines.slice(n), false), bullet: false, cont: true, align: para.align };
    return [first, rest];
  }

  return { splitPara: splitPara, width: width, charWidth: charWidth, parseRich: parseRich, toParas: toParas, plain: plain, wrapPara: wrapPara, countLines: countLines,
    textHeight: textHeight, maxLineWidth: maxLineWidth, fit: fit, isEmpty: isEmpty, SAFETY: SAFETY, LINE_HEIGHT: LINE_HEIGHT, PARA_GAP: PARA_GAP };
});
