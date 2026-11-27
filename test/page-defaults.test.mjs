// Static checks: every live calculator page carries the spec §7 worked
// example as real input defaults (value=, not placeholder=), so each page
// demos itself on load and the Wealth Report aggregates without typing.
// Regression: net-worth.html used placeholders only, so the report said
// "no net-worth numbers yet" for a page the user only looked at.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..');

function inputValue(page, id) {
  const html = readFileSync(join(dir, page), 'utf8');
  const m = html.match(new RegExp(`id="${id}"[^>]*value="([^"]*)"`));
  assert.ok(m, `${page}: input #${id} must have a value= default`);
  return m[1];
}

test('net-worth defaults are the spec worked example (780k)', () => {
  assert.equal(inputValue('net-worth.html', 'in-cash'), '50000');
  assert.equal(inputValue('net-worth.html', 'in-investments'), '200000');
  assert.equal(inputValue('net-worth.html', 'in-cpf'), '150000');
  assert.equal(inputValue('net-worth.html', 'in-property'), '800000');
  assert.equal(inputValue('net-worth.html', 'in-mortgage'), '400000');
  assert.equal(inputValue('net-worth.html', 'in-other'), '20000');
});

test('passive-income defaults are the spec worked example (2m @ 8%)', () => {
  assert.equal(inputValue('passive-income.html', 'in-portfolio'), '2000000');
  assert.equal(inputValue('passive-income.html', 'in-yield'), '8');
});

test('fire defaults are the spec worked example (60k @ 4%)', () => {
  assert.equal(inputValue('fire.html', 'in-expenses'), '60000');
  assert.equal(inputValue('fire.html', 'in-portfolio'), '500000');
  assert.equal(inputValue('fire.html', 'in-wr'), '4');
});
