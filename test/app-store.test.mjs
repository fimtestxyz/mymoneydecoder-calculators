// Regression tests for the shared store glue in app.js (2026-11-27 fix:
// the Wealth Report showed "no FIRE numbers yet" for a calculator the
// user only looked at, because bindNumber only saved on typing).
// app.js is a browser script, so this file stubs the DOM + storage APIs
// it touches at load time, then loads it via require.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

function makeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

function makeElement(value) {
  const listeners = {};
  return {
    value,
    addEventListener: (type, fn) => { listeners[type] = fn; },
    _listeners: listeners,
  };
}

function loadApp(elements) {
  // Fresh globals per load so each test gets a clean store.
  delete globalThis.MMDApp;
  globalThis.sessionStorage = makeStorage();
  globalThis.localStorage = makeStorage();
  globalThis.document = {
    addEventListener() {},
    getElementById: (id) => elements[id] || null,
    querySelectorAll: () => [],
  };
  const require = createRequire(import.meta.url);
  // Bust the require cache so the IIFE re-runs against the fresh stubs.
  delete require.cache[require.resolve('../app.js')];
  require('../app.js');
  return globalThis.MMDApp;
}

test('bindNumber saves the displayed default without typing', () => {
  const el = makeElement('60000');
  const MMDApp = loadApp({ 'in-expenses': el });
  assert.equal(MMDApp.get('annualExpenses', null), null);
  MMDApp.bindNumber('in-expenses', 'annualExpenses', null);
  assert.equal(MMDApp.get('annualExpenses', null), 60000);
});

test('bindNumber pre-fills from the store and keeps it', () => {
  const el = makeElement('60000');
  const MMDApp = loadApp({ 'in-expenses': el });
  MMDApp.set('annualExpenses', 42000);
  MMDApp.bindNumber('in-expenses', 'annualExpenses', null);
  assert.equal(el.value, 42000);
  assert.equal(MMDApp.get('annualExpenses', null), 42000);
});

test('bindNumber leaves an empty input alone instead of saving 0', () => {
  // Store already has 60000 from another calculator: an empty field
  // must not wipe it (the field gets pre-filled instead).
  const el = makeElement('');
  const MMDApp = loadApp({ 'in-expenses': el });
  MMDApp.set('annualExpenses', 60000);
  MMDApp.bindNumber('in-expenses', 'annualExpenses', null);
  assert.equal(MMDApp.get('annualExpenses', null), 60000);
  // And with no stored value, an empty field saves nothing at all.
  const el2 = makeElement('');
  const MMDApp2 = loadApp({ 'in-expenses': el2 });
  MMDApp2.bindNumber('in-expenses', 'annualExpenses', null);
  assert.equal(MMDApp2.get('annualExpenses', null), null);
});

test('typing updates the store through the input listener', () => {
  const el = makeElement('60000');
  const MMDApp = loadApp({ 'in-expenses': el });
  MMDApp.bindNumber('in-expenses', 'annualExpenses', null);
  el.value = '75000';
  el._listeners.input();
  assert.equal(MMDApp.get('annualExpenses', null), 75000);
});
