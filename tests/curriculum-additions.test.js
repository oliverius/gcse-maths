import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createLoader } from '../src/js/lesson-loader.js';
import { instantiateLesson } from '../src/js/lesson-templates.js';
import { validateLesson } from '../src/js/lesson-validation.js';
import { counterTotal } from '../src/js/diagram-state.js';

const readJSON = async (path) =>
  JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const areas = await createLoader(async (url) => ({
  ok: true,
  json: async () => JSON.parse(await readFile(url, 'utf8')),
})).load();
const lessons = areas.flatMap((area) => area.lessons);
const get = (id) => lessons.find((lesson) => lesson.id === id);
const templates = (
  await Promise.all(
    ['number', 'algebra', 'ratio', 'statistics'].map(
      async (area) =>
        (await readJSON(`../src/data/lessons/${area}.json`)).lessons,
    ),
  )
).flat();
const make = (id, values) =>
  instantiateLesson(
    templates.find((l) => l.id === id),
    { id: `${id}-2`, values },
  );
const last = (l) => l.steps.at(-1);

test('percentage selections preserve the original whole and select the correct amount', () => {
  for (const total of [10, 40, 60, 100])
    for (const percent of [10, 20, 50]) {
      const lesson = make(`percentage-${percent}`, { total });
      const identities = lesson.steps[0].scene.groups
        .flatMap((g) => g.items.map((i) => i.id))
        .sort();
      for (const step of lesson.steps) {
        assert.equal(counterTotal(step.scene.groups), total);
        assert.deepEqual(
          step.scene.groups.flatMap((g) => g.items.map((i) => i.id)).sort(),
          identities,
        );
      }
      const selected = last(lesson)
        .scene.groups.flatMap((g) => g.items)
        .filter((i) => i.highlight);
      assert.equal(
        selected.reduce((sum, item) => sum + item.value, 0),
        (total * percent) / 100,
      );
      assert.equal(lesson.model.result, (total * percent) / 100);
    }
  assert.throws(() => make('percentage-10', { total: 13 }), /whole-number/);
});

test('percentage changes use the original amount and show the changed total separately', () => {
  for (const total of [10, 40, 100])
    for (const increase of [true, false]) {
      const lesson = make(
        increase ? 'percentage-increase' : 'percentage-decrease',
        { total },
      );
      assert.equal(lesson.model.change, total / 10);
      assert.equal(counterTotal(lesson.steps[0].scene.groups), total);
      const result = total + ((increase ? 1 : -1) * total) / 10;
      assert.equal(counterTotal(last(lesson).scene.groups), result);
      assert.equal(lesson.model.result, result);
    }
});

test('place-value operations move stable digits through every intermediate column with concise decimals', () => {
  for (const [id, power] of [
    ['place-value-divide-ten', -1],
    ['place-value-hundred', 2],
    ['place-value-divide-hundred', -2],
  ])
    for (let a = 1; a <= 9; a++)
      for (let b = 1; b <= 9; b++) {
        const lesson = make(id, { a, b });
        const first = lesson.steps[0].scene.digits;
        const shifts = lesson.steps
          .filter((s) => s.operation.type === 'move')
          .map((s) => s.scene.shift);
        assert.deepEqual(
          shifts,
          Array.from(
            { length: Math.abs(power) },
            (_, i) => Math.sign(power) * (i + 1),
          ),
        );
        for (const step of lesson.steps)
          assert.deepEqual(
            step.scene.digits,
            first.map((d) => ({ ...d, place: d.place + step.scene.shift })),
          );
        const expected =
          id === 'place-value-hundred'
            ? (10 * a + b) * 10
            : (10 * a + b) / 10 ** -power;
        assert.equal(lesson.model.result, expected);
        assert.ok(String(lesson.model.result).length <= 4);
        assert.equal(last(lesson).scene.shift, power);
      }
  const invalid = structuredClone(get('place-value-divide-hundred'));
  invalid.steps[1].scene.shift = 1;
  assert.throws(() => validateLesson(invalid, 'number'));
});

test('fraction subtraction preserves the denominator and removes exactly the specified number of parts', () => {
  for (const [a, b, d] of [
    [5, 2, 6],
    [7, 3, 8],
    [10, 9, 12],
  ]) {
    const lesson = make('subtract-fractions', { a, b, d });
    assert.ok(lesson.steps.every((s) => s.bars[0].parts === d));
    assert.equal(
      lesson.steps[0].bars[0].shaded - last(lesson).bars[0].shaded,
      b,
    );
    assert.equal(last(lesson).bars[0].shaded / d, (a - b) / d);
  }
  assert.throws(() => make('subtract-fractions', { a: 5, b: 6, d: 8 }));
  assert.throws(() => make('subtract-fractions', { a: 9, b: 2, d: 8 }));
});

test('even median sorts six unchanged cards and averages the two middle values, including repeats', () => {
  for (const values of [
    { a: 1, b: 2, c: 4, d: 7, e: 9, f: 12 },
    { a: 2, b: 4, c: 4, d: 6, e: 8, f: 10 },
    { a: 3, b: 3, c: 3, d: 3, e: 3, f: 3 },
  ]) {
    const lesson = make('median-even', values);
    const sorted = [...lesson.model.values].sort((a, b) => a - b);
    assert.equal(lesson.model.result, (sorted[2] + sorted[3]) / 2);
    const final = last(lesson).scene;
    assert.deepEqual(
      final.items.map((i) => i.value),
      sorted,
    );
    assert.deepEqual(
      final.selected.map((id) => final.items.find((i) => i.id === id).value),
      [sorted[2], sorted[3]],
    );
    assert.deepEqual(
      [...final.items].sort((a, b) => a.id.localeCompare(b.id)),
      [...lesson.steps[0].scene.items].sort((a, b) => a.id.localeCompare(b.id)),
    );
  }
  assert.throws(() =>
    make('median-even', { a: 1, b: 2, c: 7, d: 4, e: 9, f: 12 }),
  );
});

test('factorisation conserves every tile and expanding the bracket recovers both terms', () => {
  for (const k of [2, 3])
    for (const a of [1, 2])
      for (const b of [1, 2, 3]) {
        const lesson = make('factorise-common', { k, a, b });
        const original = lesson.steps[0].groups.flatMap((g) => g.items);
        const grouped = last(lesson).groups;
        assert.equal(grouped.length, k);
        for (const group of grouped) {
          assert.equal(group.items.filter((i) => i.text === 'x').length, a);
          assert.equal(group.items.filter((i) => i.text === '1').length, b);
        }
        assert.deepEqual(
          grouped
            .flatMap((g) => g.items)
            .map((i) => i.id)
            .sort(),
          original.map((i) => i.id).sort(),
        );
        assert.equal(lesson.model.coefficient, k * a);
        assert.equal(lesson.model.constant, k * b);
      }
});
