// MyMoneyDecoder — shared app logic: data store, formatting, charts.
// The store is anonymous by default: nothing is written to localStorage
// unless the user opts in via the "Remember my inputs" toggle.
(function (root) {
  'use strict';

  var DATA_KEY = 'mmd-shared-v1';
  var CONSENT_KEY = 'mmd-consent';

  // The shared model lives in sessionStorage: calculators on different
  // pages pre-fill each other within this tab, and everything vanishes
  // when the tab closes. localStorage is used ONLY when the user opts in
  // ("Remember my inputs"), so numbers persist across visits.
  var memory = {};

  function isConsented() {
    try { return localStorage.getItem(CONSENT_KEY) === 'on'; } catch (e) { return false; }
  }
  function setConsent(on) {
    try {
      localStorage.setItem(CONSENT_KEY, on ? 'on' : 'off');
      if (on) localStorage.setItem(DATA_KEY, JSON.stringify(memory));
      else localStorage.removeItem(DATA_KEY);
    } catch (e) { /* private mode: stay in session */ }
    refreshConsentUI();
  }
  function loadStored() {
    try {
      var raw = sessionStorage.getItem(DATA_KEY);
      if (raw) { memory = JSON.parse(raw) || {}; return; }
    } catch (e) {}
    if (!isConsented()) return;
    try {
      var saved = localStorage.getItem(DATA_KEY);
      if (saved) memory = JSON.parse(saved) || {};
    } catch (e) { memory = {}; }
  }
  function persist() {
    try { sessionStorage.setItem(DATA_KEY, JSON.stringify(memory)); } catch (e) {}
    if (isConsented()) {
      try { localStorage.setItem(DATA_KEY, JSON.stringify(memory)); } catch (e) {}
    }
  }
  function get(key, fallback) {
    var v = memory[key];
    return (v === undefined || v === null || v === '') ? fallback : v;
  }
  function set(key, value) {
    memory[key] = value;
    persist();
  }
  function clearAll() {
    memory = {};
    try {
      sessionStorage.removeItem(DATA_KEY);
      localStorage.removeItem(DATA_KEY);
      localStorage.removeItem(CONSENT_KEY);
    } catch (e) {}
    refreshConsentUI();
  }

  // ---- formatting -------------------------------------------------------
  function fmtSGD(n, decimals) {
    if (!Number.isFinite(n)) return '—';
    return 'S$' + n.toLocaleString('en-SG', {
      minimumFractionDigits: decimals || 0,
      maximumFractionDigits: decimals || 0 });
  }
  function fmtNum(n, decimals) {
    if (!Number.isFinite(n)) return '—';
    return n.toLocaleString('en-SG', {
      minimumFractionDigits: decimals || 0,
      maximumFractionDigits: decimals === undefined ? 0 : decimals });
  }
  function fmtPct(frac, decimals) {
    if (!Number.isFinite(frac)) return '—';
    return (frac * 100).toFixed(decimals === undefined ? 1 : decimals) + '%';
  }
  function fmtYears(n) {
    if (n === null || n === undefined || !Number.isFinite(n)) return '—';
    if (n >= 60) return '60+ years';
    return n + (n === 1 ? ' year' : ' years');
  }
  function parseMoney(str) {
    if (typeof str === 'number') return str;
    var n = parseFloat(String(str || '').replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }

  // ---- input binding -----------------------------------------------------
  // Wire a number input to the store: pre-fill from store, save on change,
  // and call onChange() after every edit.
  function bindNumber(id, key, onChange) {
    var el = document.getElementById(id);
    if (!el) return null;
    var stored = get(key, null);
    if (stored !== null && stored !== undefined && stored !== '') {
      el.value = stored;
    }
    // Save what the calculator shows right now (stored value, or the
    // page default) so the shared model reflects it even before the user
    // types. Without this the Wealth Report says "no numbers yet" for a
    // calculator the user only looked at. Empty inputs are left alone:
    // saving a 0 would wipe a value another calculator already stored
    // (e.g. the expenses field on passive-income.html has no default).
    if (el.value !== '' && el.value !== null && el.value !== undefined) {
      set(key, parseMoney(el.value));
    }
    el.addEventListener('input', function () {
      set(key, parseMoney(el.value));
      if (onChange) onChange();
    });
    return el;
  }
  function readNumber(id) {
    var el = document.getElementById(id);
    return el ? parseMoney(el.value) : 0;
  }

  // ---- charts ------------------------------------------------------------
  var PALETTE = ['#16233a', '#b98a2e', '#0e6b4a', '#7a8aa5', '#c96f4a', '#5b7fa6'];
  function donut(el, segments) {
    if (!el) return;
    var total = segments.reduce(function (s, x) { return s + Math.max(0, x.value); }, 0);
    if (total <= 0) { el.innerHTML = '<p class="empty-note">Enter values to see the breakdown.</p>'; return; }
    var stops = [], acc = 0;
    segments.forEach(function (seg, i) {
      var frac = Math.max(0, seg.value) / total;
      var color = seg.color || PALETTE[i % PALETTE.length];
      stops.push(color + ' ' + (acc * 100).toFixed(1) + '% ' + ((acc + frac) * 100).toFixed(1) + '%');
      acc += frac;
    });
    var legend = segments.map(function (seg, i) {
      var color = seg.color || PALETTE[i % PALETTE.length];
      var frac = Math.max(0, seg.value) / total;
      return '<li><span class="swatch" style="background:' + color + '"></span>' +
        seg.label + ' — ' + fmtSGD(seg.value) + ' (' + fmtPct(frac) + ')</li>';
    }).join('');
    el.innerHTML = '<div class="donut-wrap"><div class="donut" style="background:conic-gradient(' +
      stops.join(', ') + ')"></div><ul class="legend">' + legend + '</ul></div>';
  }
  function barRows(el, rows, maxValue) {
    if (!el) return;
    var max = maxValue || Math.max.apply(null, rows.map(function (r) { return r.value; }).concat([1]));
    el.innerHTML = rows.map(function (r) {
      var pct = max > 0 ? Math.max(0, r.value) / max * 100 : 0;
      return '<div class="bar-row"><span>' + r.label + '</span>' +
        '<div class="bar-track"><div class="bar-fill ' + (r.cls || '') +
        '" style="width:' + pct.toFixed(1) + '%"></div></div>' +
        '<span style="text-align:right;font-weight:700">' + r.text + '</span></div>';
    }).join('');
  }
  // Simple SVG line chart. points: [{x, y}], targetY: optional dashed line.
  function lineChart(el, points, opts) {
    if (!el || !points.length) return;
    opts = opts || {};
    var W = 640, H = 260, padL = 8, padR = 8, padT = 14, padB = 26;
    var maxX = Math.max.apply(null, points.map(function (p) { return p.x; }));
    var maxY = Math.max.apply(null, points.map(function (p) { return p.y; })
      .concat(opts.targetY ? [opts.targetY] : [0]));
    var minY = 0;
    function X(x) { return padL + (x / Math.max(1, maxX)) * (W - padL - padR); }
    function Y(y) { return H - padB - ((y - minY) / Math.max(1, maxY - minY)) * (H - padT - padB); }
    var line = points.map(function (p, i) {
      return (i === 0 ? 'M' : 'L') + X(p.x).toFixed(1) + ',' + Y(p.y).toFixed(1);
    }).join(' ');
    var target = '';
    if (opts.targetY) {
      target = '<line x1="' + padL + '" y1="' + Y(opts.targetY) + '" x2="' + (W - padR) +
        '" y2="' + Y(opts.targetY) + '" stroke="#a93226" stroke-width="1.5" stroke-dasharray="5,4"/>' +
        '<text x="' + (W - padR) + '" y="' + (Y(opts.targetY) - 5) + '" font-size="11" fill="#a93226" text-anchor="end">' +
        (opts.targetLabel || '') + '</text>';
    }
    var end = points[points.length - 1];
    el.innerHTML = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img">' +
      target +
      '<path d="' + line + '" fill="none" stroke="#0e6b4a" stroke-width="2.5"/>' +
      '<circle cx="' + X(end.x) + '" cy="' + Y(end.y) + '" r="4" fill="#0e6b4a"/>' +
      '<text x="' + padL + '" y="' + (H - 8) + '" font-size="11" fill="#6b7688">' + (opts.xLabelStart || '') + '</text>' +
      '<text x="' + (W - padR) + '" y="' + (H - 8) + '" font-size="11" fill="#6b7688" text-anchor="end">' + (opts.xLabelEnd || '') + '</text>' +
      '</svg>';
  }

  // ---- consent UI --------------------------------------------------------
  function refreshConsentUI() {
    var on = isConsented();
    document.querySelectorAll('[data-consent-pill]').forEach(function (b) {
      b.classList.toggle('on', on);
      b.textContent = on ? '✓ Remembering inputs on this device' : 'Remember my inputs';
    });
    document.querySelectorAll('[data-consent-state]').forEach(function (el) {
      el.textContent = on
        ? 'On — your inputs are saved in this browser only, and never sent anywhere.'
        : 'Off — your numbers are shared between calculators in this tab only, and disappear when you close it.';
    });
  }
  function wireConsentUI() {
    document.querySelectorAll('[data-consent-pill]').forEach(function (b) {
      b.addEventListener('click', function () { setConsent(!isConsented()); });
    });
    document.querySelectorAll('[data-clear-data]').forEach(function (b) {
      b.addEventListener('click', function () {
        clearAll();
        location.reload();
      });
    });
  }

  loadStored();
  document.addEventListener('DOMContentLoaded', function () {
    refreshConsentUI();
    wireConsentUI();
  });

  root.MMDApp = { get: get, set: set, clearAll: clearAll,
    isConsented: isConsented, setConsent: setConsent,
    fmtSGD: fmtSGD, fmtNum: fmtNum, fmtPct: fmtPct, fmtYears: fmtYears,
    parseMoney: parseMoney, bindNumber: bindNumber, readNumber: readNumber,
    donut: donut, barRows: barRows, lineChart: lineChart };
})(typeof window !== 'undefined' ? window : globalThis);
