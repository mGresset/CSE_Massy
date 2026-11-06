/* CSE Studio · Calcul des tarifs, indépendant de l'interface et testable avec Node.
 * V9 : arrondi paramétrable, modes communs (% de subvention, % de participation), prix fixe,
 * tarif unique, saisie manuelle T1–T10 et surcharges par tranche.
 * L'API historique compute() est conservée à l'identique pour l'éditeur V6 et les anciens tests. */
(function (root) {
  'use strict';
  var DEFAULT_RATES = [70, 65, 60, 55, 50, 45, 40, 35, 30, 25];

  function finite(v, fallback) {
    if (fallback === undefined) fallback = 0;
    if (v === null || v === undefined || v === '') return fallback;
    var n = typeof v === 'string' ? Number(v.replace(/\s/g, '').replace('€', '').replace(',', '.')) : Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  function boundedRate(v) { return Math.min(100, Math.max(0, finite(v))); }
  function euroRound(v) { return Math.round((finite(v) + Number.EPSILON) * 100) / 100; }

  /* ---------- API historique (V4–V8) ---------- */
  function compute(basePrice, mode, rates, fixedRate, fixedEuro) {
    mode = mode || 'tranches'; rates = rates || DEFAULT_RATES;
    if (fixedRate === undefined) fixedRate = 50;
    var base = Math.max(0, finite(basePrice));
    if (mode === 'tranches') return Array.from({ length: 10 }, function (_, i) {
      var subsidy = boundedRate((rates || [])[i] !== undefined ? rates[i] : DEFAULT_RATES[i]);
      return { label: 'T' + (i + 1), subsidy: subsidy, employeePercent: euroRound(100 - subsidy), price: euroRound(base * (100 - subsidy) / 100) };
    });
    if (mode === 'fixedSubsidy') {
      var s = boundedRate(fixedRate);
      return [{ label: 'Tarif CSE', subsidy: s, employeePercent: euroRound(100 - s), price: euroRound(base * (100 - s) / 100) }];
    }
    if (mode === 'fixedEmployee') {
      var e = boundedRate(fixedRate);
      return [{ label: 'Tarif CSE', subsidy: euroRound(100 - e), employeePercent: e, price: euroRound(base * e / 100) }];
    }
    if (mode === 'fixedEuro') {
      var price = Math.max(0, finite(fixedEuro));
      return [{ label: 'Tarif CSE', subsidy: base ? euroRound(100 * (1 - price / base)) : null, employeePercent: base ? euroRound(100 * price / base) : null, price: euroRound(price) }];
    }
    throw new Error('Mode tarifaire inconnu : ' + mode);
  }

  /* ---------- V9 ---------- */
  var MODES = [
    { id: 'tranches', label: 'Barème T1 à T10 (subvention par tranche)' },
    { id: 'manual', label: 'Prix T1 à T10 saisis manuellement' },
    { id: 'subsidy', label: 'Réduction commune en % (même subvention pour tous)' },
    { id: 'participation', label: 'Participation commune en % du prix extérieur' },
    { id: 'fixed', label: 'Prix fixe salarié en €' },
    { id: 'single', label: 'Tarif unique (identique pour tous)' }
  ];
  var ROUNDINGS = [
    { id: 'cent', label: 'Au centime', step: 0.01 },
    { id: 'half', label: 'Au 50 centimes', step: 0.5 },
    { id: 'unit', label: 'À l’euro', step: 1 },
    { id: 'five', label: 'Aux 5 €', step: 5 }
  ];
  /** Arrondi paramétrable : rounding = {step:'unit'|'cent'|…, mode:'nearest'|'down'|'up'}. */
  function roundPrice(v, rounding) {
    rounding = rounding || {};
    var def = ROUNDINGS.find(function (r) { return r.id === rounding.step; }) || ROUNDINGS[2];
    var step = def.step, x = finite(v) / step;
    var r = rounding.mode === 'down' ? Math.floor(x + 1e-9) : rounding.mode === 'up' ? Math.ceil(x - 1e-9) : Math.round(x + 1e-9);
    return Math.round(r * step * 100) / 100;
  }
  /** « 2 400 € », « 12,50 € » — espaces insécables pour éviter une coupure de ligne dans un prix. */
  function money(v) {
    var n = finite(v), dec = Math.abs(n - Math.round(n)) > 0.001;
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: dec ? 2 : 0, maximumFractionDigits: 2 }).format(n).replace(/[   ]/g, ' ') + ' €';
  }

  /** Calcule les tarifs d'une fiche V9.
   * pricing = {enabled, mode, outside, percent, fixed, manual:[10], overrides:{0:…}, label, notes}
   * Renvoie {enabled, kind:'none'|'grid'|'single', rows:[{label, price, subsidy, overridden}], outside, label, notes, issues:[]} */
  function fromPricing(pricing, settings) {
    var p = pricing || {}, s = settings || {};
    var out = { enabled: false, kind: 'none', rows: [], outside: null, label: String(p.label || '').trim(), notes: String(p.notes || '').trim(), issues: [] };
    if (!p.enabled || s.pricingModule === false) return out;
    var rounding = s.rounding || { step: 'unit', mode: 'nearest' };
    var rates = Array.isArray(s.rates) && s.rates.length === 10 ? s.rates : DEFAULT_RATES;
    var mode = MODES.some(function (m) { return m.id === p.mode; }) ? p.mode : 'tranches';
    var outside = String(p.outside === undefined || p.outside === null ? '' : p.outside).trim() === '' ? null : Math.max(0, finite(p.outside));
    out.enabled = true; out.outside = outside; out.mode = mode;
    var overrides = p.overrides && typeof p.overrides === 'object' ? p.overrides : {};
    if (mode === 'tranches') {
      if (outside === null) { out.issues.push(['block', 'Barème T1–T10 : renseigner le prix extérieur.']); return out; }
      out.kind = 'grid';
      out.rows = rates.map(function (rate, i) {
        var o = overrides[i];
        var hasO = o !== undefined && o !== null && String(o).trim() !== '';
        var price = hasO ? roundPrice(finite(o), { step: 'cent' }) : roundPrice(outside * (1 - boundedRate(rate) / 100), rounding);
        return { label: 'T' + (i + 1), price: price, subsidy: boundedRate(rate), overridden: hasO };
      });
    } else if (mode === 'manual') {
      var vals = (Array.isArray(p.manual) ? p.manual : []).slice(0, 10);
      out.kind = 'grid';
      out.rows = vals.map(function (v, i) { return { label: 'T' + (i + 1), price: String(v).trim() === '' ? null : roundPrice(finite(v), { step: 'cent' }), subsidy: null, overridden: true }; })
        .filter(function (r) { return r.price !== null; });
      if (out.rows.length !== 10) out.issues.push(['warn', 'Saisie manuelle : ' + out.rows.length + ' tarif(s) sur 10 renseigné(s).']);
      if (!out.rows.length) out.kind = 'none';
    } else if (mode === 'subsidy' || mode === 'participation') {
      if (outside === null) { out.issues.push(['block', 'Renseigner le prix extérieur pour calculer le tarif.']); return out; }
      var pct = boundedRate(p.percent);
      var price2 = mode === 'subsidy' ? outside * (1 - pct / 100) : outside * pct / 100;
      out.kind = 'single';
      out.rows = [{ label: 'Tarif CSE', price: roundPrice(price2, rounding), subsidy: mode === 'subsidy' ? pct : 100 - pct }];
    } else if (mode === 'fixed' || mode === 'single') {
      if (String(p.fixed === undefined ? '' : p.fixed).trim() === '') { out.issues.push(['block', 'Renseigner le prix en euros.']); return out; }
      out.kind = 'single';
      out.rows = [{ label: mode === 'single' ? 'Tarif unique' : 'Tarif CSE', price: roundPrice(finite(p.fixed), { step: 'cent' }), subsidy: null }];
      if (mode === 'single') out.outside = null;
    }
    // Contrôles de cohérence
    if (out.outside !== null) {
      out.rows.forEach(function (r) { if (r.price > out.outside + 0.001) out.issues.push(['warn', r.label + ' (' + money(r.price) + ') dépasse le prix extérieur (' + money(out.outside) + ').']); });
    }
    if (out.kind === 'grid') {
      for (var i = 1; i < out.rows.length; i++) {
        if (out.rows[i].price < out.rows[i - 1].price) { out.issues.push(['warn', 'Les tarifs ne sont pas croissants de T1 à T10 (' + out.rows[i - 1].label + ' > ' + out.rows[i].label + ').']); break; }
      }
    }
    if (out.rows.some(function (r) { return r.price < 0; })) out.issues.push(['block', 'Prix négatif.']);
    return out;
  }

  function frMoney(value) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(finite(value)); }
  function toFrDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return '';
    var a = value.split('-').map(Number), date = new Date(a[0], a[1] - 1, a[2]);
    if (date.getFullYear() !== a[0] || date.getMonth() + 1 !== a[1] || date.getDate() !== a[2]) return '';
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
  }
  function dateRange(start, end) {
    if (!start && !end) return 'DATES À CONFIRMER';
    if (start && !end) return 'LE ' + toFrDate(start).toUpperCase();
    if (!start && end) return 'JUSQU’AU ' + toFrDate(end).toUpperCase();
    if (start === end) return 'LE ' + toFrDate(start).toUpperCase();
    return 'DU ' + toFrDate(start).replace(/\s\d{4}$/, '').toUpperCase() + ' AU ' + toFrDate(end).toUpperCase();
  }

  var api = { DEFAULT_RATES: DEFAULT_RATES, MODES: MODES, ROUNDINGS: ROUNDINGS, finite: finite, boundedRate: boundedRate, euroRound: euroRound, compute: compute,
    roundPrice: roundPrice, money: money, fromPricing: fromPricing, frMoney: frMoney, toFrDate: toFrDate, dateRange: dateRange };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CSEPricing = api;
  root.CSE = root.CSE || {};
  root.CSE.pricing = api;
})(typeof window !== 'undefined' ? window : globalThis);
