import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyInput, freshRecord, restoreRecord, stats, formatTime, loadState } from '../core.js';

test('correction preserves historical errors and completion requires exact punctuation/case', () => {
  const r = freshRecord('Hi!');
  applyInput(r, 'Hx');
  assert.equal(stats(r).accuracy, 50);
  assert.equal(stats(r).firstError, 1);
  applyInput(r, 'H');
  assert.equal(r.attempts, 2);
  applyInput(r, 'Hi!');
  assert.equal(r.completed, true);
  assert.equal(r.attempts, 4);
  assert.equal(stats(r).accuracy, 75);
  const lower = freshRecord('Hi!'); applyInput(lower, 'hi!'); assert.equal(lower.completed, false);
});
test('selection replacement counts only new characters, even identical characters', () => {
  const r = freshRecord('aaaa');
  applyInput(r, 'aaaa');
  applyInput(r, 'aaaa', { start: 1, end: 2 });
  assert.equal(r.attempts, 5);
  applyInput(r, 'axaa', { start: 1, end: 2 });
  assert.equal(r.attempts, 6);
  assert.equal(r.correctAttempts, 5);
  assert.equal(stats(r).firstError, 1);
});
test('backspace and forward deletion of repeated characters do not add attempts', () => {
  const r = freshRecord('aaaa!'); applyInput(r, 'aaaa'); applyInput(r, 'aaa');
  assert.equal(r.attempts, 4);
  applyInput(r, 'aa'); assert.equal(r.attempts, 4);
});
test('extra characters count as errors and do not complete a passage', () => {
  const r = freshRecord('Hi'); applyInput(r, 'Hi ');
  assert.equal(r.completed, false); assert.equal(stats(r).firstError, 2);
  applyInput(r, 'Hi'); assert.equal(r.completed, true); assert.equal(stats(r).accuracy, 67);
});
test('WPM uses current correct characters and active elapsed time', () => {
  const r = freshRecord('hello world'); applyInput(r, 'hello worlx'); r.elapsed = 60000;
  assert.equal(stats(r).wpm, 2); assert.equal(stats(r).correct, 10);
  r.elapsed = 30000; assert.equal(stats(r).wpm, 4);
  assert.equal(formatTime(65001), '01:05'); assert.equal(formatTime(3600000), '60:00');
});
test('restores a valid attempt, rejects changed content and invalid data', () => {
  const r = freshRecord('hello'); applyInput(r, 'hx'); r.elapsed = 5432;
  assert.deepEqual(restoreRecord(JSON.parse(JSON.stringify(r)), 'hello'), r);
  assert.deepEqual(restoreRecord(r, 'changed'), freshRecord('changed'));
  assert.deepEqual(restoreRecord({ ...r, elapsed: -1 }, 'hello'), freshRecord('hello'));
  assert.deepEqual(restoreRecord({ ...r, attempts: 'NaN' }, 'hello'), freshRecord('hello'));
  assert.deepEqual(restoreRecord(null, 'hello'), freshRecord('hello'));
});
test('blocked, corrupt, and incompatible storage falls back to empty state', () => {
  for (const storage of [{ getItem: () => { throw new Error('Blocked'); } }, { getItem: () => '{' }, { getItem: () => '{"version":2}' }, { getItem: () => '{"version":1,"records":[]}' }]) {
    assert.deepEqual(loadState(storage), { version: 1, records: {}, current: null });
  }
});
test('all six books have 10 unique source-attributed passages of 40–100 words', () => {
  const catalog = JSON.parse(readFileSync(new URL('../data/catalog.json', import.meta.url)));
  assert.equal(catalog.length, 6);
  const ids = new Set();
  for (const item of catalog) {
    const book = JSON.parse(readFileSync(new URL(`../${item.file}`, import.meta.url)));
    assert.equal(book.paragraphs.length, 10);
    assert.match(book.source, /^https:\/\/www\.gutenberg\.org\/ebooks\/\d+$/);
    assert.equal(book.id, item.id);
    for (const p of book.paragraphs) {
      assert.equal(p.text.split(/\s+/).length, p.words);
      assert.ok(p.words >= 40 && p.words <= 100);
      assert.ok(p.chapter && p.sourceParagraph > 0);
      assert.doesNotMatch(p.text, /[“”‘’—\n]|\[\d+\]|\{\d+\}/);
      assert.ok(!ids.has(p.id)); ids.add(p.id);
    }
  }
});
