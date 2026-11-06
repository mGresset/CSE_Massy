/* CSE Studio V9 · Illustrations de démonstration dessinées localement (aucune photo externe, aucun droit tiers). */
(function (root, factory) {
  'use strict';
  var mod = factory();
  root.CSE = root.CSE || {};
  root.CSE.demoArt = mod;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  function rnd(seed) { var s = seed || 1; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function grad(ctx, x0, y0, x1, y1, stops) { var g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(function (s) { g.addColorStop(s[0], s[1]); }); return g; }
  function mountains(ctx, w, h, base, color, seed, amp) {
    var r = rnd(seed); ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, h);
    for (var x = 0; x <= w; x += w / 8) ctx.lineTo(x, base - r() * amp);
    ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
  }
  var THEMES = {
    travel: function (ctx, w, h) {
      ctx.fillStyle = grad(ctx, 0, 0, 0, h, [[0, '#FF9A5C'], [0.45, '#FFD27A'], [0.46, '#2B8FB3'], [1, '#14506E']]); ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#FFF4C2'; ctx.beginPath(); ctx.arc(w * 0.68, h * 0.42, h * 0.13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; for (var i = 0; i < 9; i++) ctx.fillRect(w * 0.5 + i * 8 - 40, h * 0.5 + i * 14, 160 - i * 12, 3);
      mountains(ctx, w, h, h * 0.47, '#1E6B5C', 3, h * 0.08);
      palm(ctx, w * 0.16, h, h * 0.62); palm(ctx, w * 0.27, h, h * 0.48);
      ctx.fillStyle = '#E9C88E'; ctx.beginPath(); ctx.ellipse(w * 0.2, h * 1.02, w * 0.4, h * 0.14, 0, 0, Math.PI * 2); ctx.fill();
    },
    temple: function (ctx, w, h) {
      ctx.fillStyle = grad(ctx, 0, 0, 0, h, [[0, '#7FC3E8'], [1, '#D9F0F7']]); ctx.fillRect(0, 0, w, h);
      mountains(ctx, w, h, h * 0.62, '#5C9A6B', 7, h * 0.12);
      ctx.fillStyle = '#F4F1E8'; ctx.beginPath(); ctx.moveTo(w * 0.5, h * 0.18); ctx.quadraticCurveTo(w * 0.66, h * 0.55, w * 0.7, h * 0.72); ctx.lineTo(w * 0.3, h * 0.72); ctx.quadraticCurveTo(w * 0.34, h * 0.55, w * 0.5, h * 0.18); ctx.fill();
      ctx.fillStyle = '#D9B44A'; ctx.fillRect(w * 0.485, h * 0.08, w * 0.03, h * 0.12);
      ctx.fillStyle = '#C9C2AE'; ctx.fillRect(w * 0.26, h * 0.72, w * 0.48, h * 0.06);
      ctx.fillStyle = '#3F7D4E'; ctx.fillRect(0, h * 0.78, w, h * 0.22);
    },
    wine: function (ctx, w, h) {
      ctx.fillStyle = grad(ctx, 0, 0, w, h, [[0, '#3A0E1E'], [1, '#12060B']]); ctx.fillRect(0, 0, w, h);
      var r = rnd(11); for (var i = 0; i < 26; i++) { ctx.fillStyle = 'rgba(255,' + (170 + r() * 60 | 0) + ',90,' + (0.08 + r() * 0.16) + ')'; ctx.beginPath(); ctx.arc(r() * w, r() * h * 0.6, 20 + r() * 50, 0, Math.PI * 2); ctx.fill(); }
      [0.36, 0.62].forEach(function (cx, k) {
        var x = w * cx, top = h * 0.3, gw = w * 0.11;
        ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.moveTo(x - gw, top); ctx.quadraticCurveTo(x - gw, top + h * 0.3, x, top + h * 0.32); ctx.quadraticCurveTo(x + gw, top + h * 0.3, x + gw, top); ctx.closePath(); ctx.fill();
        ctx.fillStyle = k ? '#F0D98A' : '#8E1B3A'; ctx.beginPath(); ctx.moveTo(x - gw * 0.92, top + h * 0.12); ctx.quadraticCurveTo(x - gw * 0.9, top + h * 0.29, x, top + h * 0.31); ctx.quadraticCurveTo(x + gw * 0.9, top + h * 0.29, x + gw * 0.92, top + h * 0.12); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(x - 3, top + h * 0.32, 6, h * 0.22); ctx.fillRect(x - gw * 0.5, top + h * 0.54, gw, 6);
      });
    },
    race: function (ctx, w, h) {
      ctx.fillStyle = '#5BA34B'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#3B3F46'; ctx.beginPath(); ctx.moveTo(0, h * 0.35); ctx.quadraticCurveTo(w * 0.5, h * 0.05, w, h * 0.45); ctx.lineTo(w, h * 0.85); ctx.quadraticCurveTo(w * 0.5, h * 0.45, 0, h * 0.8); ctx.closePath(); ctx.fill();
      for (var i = 0; i < 24; i++) { ctx.fillStyle = i % 2 ? '#E53935' : '#FFFFFF'; ctx.fillRect(i * w / 24, h * 0.8 + Math.sin(i / 3) * 6, w / 24, 14); }
      [[0.32, '#E53935'], [0.55, '#1E88E5'], [0.74, '#FDD835']].forEach(function (k, j) {
        var x = w * k[0], y = h * (0.5 - j * 0.04);
        ctx.fillStyle = k[1]; ctx.fillRect(x, y, w * 0.12, h * 0.07); ctx.fillStyle = '#111'; [0, 1].forEach(function (q) { ctx.beginPath(); ctx.arc(x + q * w * 0.1 + 12, y + h * 0.08, h * 0.035, 0, Math.PI * 2); ctx.fill(); });
        ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(x + w * 0.06, y - h * 0.02, h * 0.035, 0, Math.PI * 2); ctx.fill();
      });
    },
    mountain: function (ctx, w, h) {
      ctx.fillStyle = grad(ctx, 0, 0, 0, h, [[0, '#9CC9F0'], [1, '#E9F3FB']]); ctx.fillRect(0, 0, w, h);
      mountains(ctx, w, h, h * 0.45, '#A9B9CF', 5, h * 0.25);
      mountains(ctx, w, h, h * 0.62, '#7D92B0', 9, h * 0.2);
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, h * 0.78, w, h * 0.22);
      var r = rnd(4); for (var i = 0; i < 14; i++) tree(ctx, r() * w, h * (0.74 + r() * 0.12), 30 + r() * 40);
    },
    snow: function (ctx, w, h) {
      ctx.fillStyle = grad(ctx, 0, 0, 0, h, [[0, '#DDE7F2'], [1, '#FFFFFF']]); ctx.fillRect(0, 0, w, h);
      var r = rnd(8); for (var i = 0; i < 22; i++) tree(ctx, r() * w, h * (0.45 + r() * 0.5), 50 + r() * 90, '#4E6E62');
      ctx.fillStyle = 'rgba(255,255,255,.8)'; for (var k = 0; k < 120; k++) { ctx.beginPath(); ctx.arc(r() * w, r() * h, 2 + r() * 3, 0, Math.PI * 2); ctx.fill(); }
    },
    concert: function (ctx, w, h) {
      ctx.fillStyle = grad(ctx, 0, 0, 0, h, [[0, '#1B1240'], [1, '#3B1C5A']]); ctx.fillRect(0, 0, w, h);
      ['rgba(255,214,102,.35)', 'rgba(124,214,255,.3)', 'rgba(255,120,200,.3)'].forEach(function (c, i) {
        ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(w * (0.2 + i * 0.3), 0); ctx.lineTo(w * (0.05 + i * 0.32), h * 0.75); ctx.lineTo(w * (0.38 + i * 0.3), h * 0.75); ctx.closePath(); ctx.fill();
      });
      ctx.fillStyle = '#0E0A1F'; ctx.fillRect(0, h * 0.75, w, h * 0.25);
      var r = rnd(2); for (var i = 0; i < 18; i++) { var x = i * w / 17, s = 26 + r() * 12; ctx.beginPath(); ctx.arc(x, h * 0.86, s, Math.PI, 0); ctx.fill(); ctx.beginPath(); ctx.arc(x, h * 0.8, s * 0.55, 0, Math.PI * 2); ctx.fill(); }
    },
    books: function (ctx, w, h) {
      ctx.fillStyle = '#F4EBDD'; ctx.fillRect(0, 0, w, h);
      var cols = ['#C0392B', '#2E86AB', '#F4A261', '#2A9D8F', '#6D597A', '#E9C46A', '#264653'], r = rnd(6);
      for (var row = 0; row < 3; row++) {
        var y = h * (0.08 + row * 0.31), x = w * 0.05;
        ctx.fillStyle = '#8D6E52'; ctx.fillRect(0, y + h * 0.26, w, h * 0.03);
        while (x < w * 0.95) { var bw = 18 + r() * 34, bh = h * (0.18 + r() * 0.08); ctx.fillStyle = cols[(r() * cols.length) | 0]; ctx.fillRect(x, y + h * 0.26 - bh, bw, bh); x += bw + 3; }
      }
    },
    games: function (ctx, w, h) {
      ctx.fillStyle = '#2B6E8F'; ctx.fillRect(0, 0, w, h);
      var r = rnd(5), cols = ['#F94144', '#F8961E', '#F9C74F', '#90BE6D', '#43AA8B', '#577590'];
      for (var i = 0; i < 16; i++) {
        var x = r() * w, y = r() * h, s = 50 + r() * 70; ctx.save(); ctx.translate(x, y); ctx.rotate(r() * 1.5);
        ctx.fillStyle = cols[i % cols.length];
        if (i % 2) { ctx.fillRect(-s / 2, -s / 2, s, s); ctx.fillStyle = '#FFF'; [[-0.25, -0.25], [0.25, 0.25], [0, 0]].forEach(function (p) { ctx.beginPath(); ctx.arc(p[0] * s, p[1] * s, s * 0.08, 0, Math.PI * 2); ctx.fill(); }); }
        else { ctx.beginPath(); ctx.arc(0, -s * 0.3, s * 0.2, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(-s * 0.35, s * 0.4); ctx.lineTo(0, -s * 0.15); ctx.lineTo(s * 0.35, s * 0.4); ctx.closePath(); ctx.fill(); }
        ctx.restore();
      }
    }
  };
  function palm(ctx, x, base, hgt) {
    ctx.strokeStyle = '#3B2A1E'; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(x, base); ctx.quadraticCurveTo(x + 30, base - hgt * 0.5, x + 10, base - hgt); ctx.stroke();
    ctx.fillStyle = '#1F4D2B';
    for (var a = 0; a < 6; a++) { ctx.save(); ctx.translate(x + 10, base - hgt); ctx.rotate(-2.6 + a * 0.9); ctx.beginPath(); ctx.ellipse(70, 0, 80, 16, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  }
  function tree(ctx, x, y, s, color) {
    ctx.fillStyle = color || '#2F5D50';
    for (var i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x, y - s - i * s * 0.1 + i * s * 0.35); ctx.lineTo(x - s * 0.45, y - i * s * 0.3 + s * 0.05); ctx.lineTo(x + s * 0.45, y - i * s * 0.3 + s * 0.05); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.moveTo(x, y - s * 1.05); ctx.lineTo(x - s * 0.15, y - s * 0.7); ctx.lineTo(x + s * 0.15, y - s * 0.7); ctx.closePath(); ctx.fill();
  }
  /** Renvoie une data URL JPEG (1200 × 800 par défaut). */
  function paint(theme, w, h) {
    w = w || 1200; h = h || 800;
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var ctx = c.getContext('2d');
    (THEMES[theme] || THEMES.mountain)(ctx, w, h);
    return c.toDataURL('image/jpeg', 0.86);
  }
  return { paint: paint, themes: Object.keys(THEMES) };
});
