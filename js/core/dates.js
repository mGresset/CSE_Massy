/* CSE Studio V9 · Dates en français, sans décalage UTC.
 * Toutes les dates métier sont des chaînes « AAAA-MM-JJ » (dates civiles, sans heure).
 * Les calculs passent par Date.UTC(année, mois, jour) : aucune dépendance au fuseau du poste,
 * donc pas d'erreur J−1. « Aujourd'hui » est calculé dans le fuseau Europe/Paris. */
(function (root, factory) {
  'use strict';
  var mod = factory();
  root.CSE = root.CSE || {};
  root.CSE.dates = mod;
  if (typeof module === 'object' && module.exports) module.exports = mod;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  var DAY = 86400000;
  var MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  var DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  var DAYS_SHORT = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /** Analyse « AAAA-MM-JJ » ; renvoie {y,m,d} ou null si la date n'existe pas. */
  function parse(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '').trim());
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    var t = new Date(Date.UTC(y, mo - 1, d));
    if (t.getUTCFullYear() !== y || t.getUTCMonth() !== mo - 1 || t.getUTCDate() !== d) return null;
    return { y: y, m: mo, d: d };
  }
  function isValid(iso) { return !!parse(iso); }
  function utc(iso) { var p = parse(iso); return p ? Date.UTC(p.y, p.m - 1, p.d) : NaN; }
  function fromUTC(ms) { var t = new Date(ms); return t.getUTCFullYear() + '-' + pad(t.getUTCMonth() + 1) + '-' + pad(t.getUTCDate()); }

  /** Date du jour à Paris (indépendante du fuseau de l'ordinateur). */
  function todayParis(now) {
    var d = now instanceof Date ? now : new Date();
    try {
      var parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
      var o = {};
      parts.forEach(function (p) { o[p.type] = p.value; });
      if (o.year && o.month && o.day) return o.year + '-' + o.month + '-' + o.day;
    } catch (e) { /* Intl sans fuseau : repli sur l'heure locale */ }
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  /** Nombre de jours civils de b vers a (a − b). */
  function diffDays(a, b) {
    var x = utc(a), y = utc(b);
    return isFinite(x) && isFinite(y) ? Math.round((x - y) / DAY) : null;
  }
  function addDays(iso, n) { var x = utc(iso); return isFinite(x) ? fromUTC(x + n * DAY) : ''; }
  function weekday(iso) { var x = utc(iso); return isFinite(x) ? new Date(x).getUTCDay() : null; }
  /** Lundi de la semaine contenant la date. */
  function monday(iso) { var w = weekday(iso); return w === null ? '' : addDays(iso, -((w + 6) % 7)); }
  /** Semaine ISO 8601 : {week, year}. */
  function isoWeek(iso) {
    var p = parse(iso); if (!p) return null;
    var t = new Date(Date.UTC(p.y, p.m - 1, p.d));
    var day = (t.getUTCDay() + 6) % 7;
    t.setUTCDate(t.getUTCDate() - day + 3);
    var firstThursday = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
    var week = 1 + Math.round(((t - firstThursday) / DAY - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
    return { week: week, year: t.getUTCFullYear() };
  }
  /** Lundi d'une semaine ISO donnée. */
  function isoWeekMonday(week, year) {
    var jan4 = Date.UTC(year, 0, 4);
    var w = (new Date(jan4).getUTCDay() + 6) % 7;
    return fromUTC(jan4 - w * DAY + (week - 1) * 7 * DAY);
  }
  function fmtLong(iso) { var p = parse(iso); return p ? p.d + (p.d === 1 ? 'er' : '') + ' ' + MONTHS[p.m - 1] + ' ' + p.y : ''; }
  function fmtShort(iso, withYear) { var p = parse(iso); return p ? p.d + (p.d === 1 ? 'er' : '') + ' ' + MONTHS_SHORT[p.m - 1] + (withYear ? ' ' + p.y : '') : ''; }
  function fmtDay(iso) { var p = parse(iso); return p ? DAYS[weekday(iso)] + ' ' + fmtLong(iso) : ''; }
  function fmtDayShort(iso) { var p = parse(iso); return p ? DAYS_SHORT[weekday(iso)] + ' ' + p.d + ' ' + MONTHS_SHORT[p.m - 1] : ''; }
  function fmtNumeric(iso) { var p = parse(iso); return p ? pad(p.d) + '/' + pad(p.m) + '/' + p.y : ''; }
  function monthLabel(ym) {
    var m = /^(\d{4})-(\d{2})$/.exec(String(ym || ''));
    if (!m || +m[2] < 1 || +m[2] > 12) return '';
    var name = MONTHS[+m[2] - 1];
    return name.charAt(0).toUpperCase() + name.slice(1) + ' ' + m[1];
  }
  /** « 14:00 » → « 14h », « 14:30 » → « 14h30 ». */
  function fmtTime(t) {
    var m = /^(\d{1,2})[:h](\d{2})?$/.exec(String(t || '').trim());
    if (!m) return String(t || '').trim();
    var mm = m[2] && m[2] !== '00' ? m[2] : '';
    return (+m[1]) + 'h' + mm;
  }
  /** Période lisible : « Le 21 novembre 2026 », « Du 4 au 15 avril 2027 »… */
  function fmtRange(a, b, opts) {
    opts = opts || {};
    var pa = parse(a), pb = parse(b);
    if (!pa && !pb) return '';
    if (pa && (!pb || a === b)) return (opts.day ? capital(fmtDay(a)) : 'Le ' + fmtLong(a));
    if (!pa) return 'Jusqu’au ' + fmtLong(b);
    if (b < a) return 'Le ' + fmtLong(a);
    var first;
    if (pa.y === pb.y && pa.m === pb.m) first = pa.d + (pa.d === 1 ? 'er' : '');
    else if (pa.y === pb.y) first = pa.d + (pa.d === 1 ? 'er' : '') + ' ' + MONTHS[pa.m - 1];
    else first = fmtLong(a);
    return 'Du ' + first + ' au ' + fmtLong(b);
  }
  function fmtRangeShort(a, b) {
    var pa = parse(a), pb = parse(b);
    if (!pa && !pb) return '';
    if (pa && (!pb || a === b)) return fmtShort(a, true);
    if (!pa) return 'Jusqu’au ' + fmtShort(b, true);
    if (pa.y === pb.y && pa.m === pb.m) return pa.d + '–' + pb.d + ' ' + MONTHS_SHORT[pb.m - 1] + ' ' + pb.y;
    if (pa.y === pb.y) return fmtShort(a) + ' – ' + fmtShort(b, true);
    return fmtShort(a, true) + ' – ' + fmtShort(b, true);
  }
  function capital(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  /** Libellé du compte à rebours : J−0 = dernier jour. */
  function countdown(deadline, ref) {
    var n = diffDays(deadline, ref);
    if (n === null) return '';
    if (n < 0) return 'Clos';
    if (n === 0) return 'Dernier jour';
    return 'J−' + n;
  }
  function isoNow() { return new Date().toISOString(); }

  return {
    MONTHS: MONTHS, MONTHS_SHORT: MONTHS_SHORT, DAYS: DAYS,
    parse: parse, isValid: isValid, utc: utc, todayParis: todayParis, diffDays: diffDays, addDays: addDays,
    weekday: weekday, monday: monday, isoWeek: isoWeek, isoWeekMonday: isoWeekMonday,
    fmtLong: fmtLong, fmtShort: fmtShort, fmtDay: fmtDay, fmtDayShort: fmtDayShort, fmtNumeric: fmtNumeric,
    monthLabel: monthLabel, fmtTime: fmtTime, fmtRange: fmtRange, fmtRangeShort: fmtRangeShort,
    countdown: countdown, capital: capital, isoNow: isoNow, pad: pad
  };
});
