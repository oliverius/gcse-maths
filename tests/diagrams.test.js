import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createLoader } from '../src/js/lesson-loader.js';
import { validateLesson } from '../src/js/lesson-validation.js';
import { counterTotal } from '../src/js/diagram-state.js';
import { anglePoint, sectorPath } from '../src/js/diagrams.js';
const areas = await createLoader(async (url) => ({
  ok: true,
  json: async () => JSON.parse(await readFile(url, 'utf8')),
})).load();
const lessons = areas.flatMap((a) => a.lessons.filter((l) => l.available));
const lesson = (id) => lessons.find((l) => l.id === id);
test('remaining sections contain implemented diagrams, not interactive placeholders', () => {
  assert.deepEqual(
    areas.map((a) => a.lessons.filter((l) => l.available).length),
    [15, 8, 4, 8, 4, 5],
  );
  for (const area of areas.slice(2))
    for (const l of area.lessons) {
      assert.equal(l.available, true);
      assert.ok(l.steps.length >= 3);
      assert.ok(l.steps.every((s) => s.scene?.description));
      assert.ok(l.curriculum[0].reference);
    }
});
test('ratios scale together; final shares use all twenty in the required ratio', () => {
  for (const id of ['equivalent-ratio', 'simplify-ratio'])
    for (const s of lesson(id).steps) {
      const a = counterTotal(s.scene.groups.filter((g) => g.category === 'A'));
      const b = counterTotal(s.scene.groups.filter((g) => g.category === 'B'));
      assert.equal(a * 3, b * 2);
    }
  const sharing = lesson('share-ratio');
  for (const s of sharing.steps) assert.equal(counterTotal(s.scene.groups), 20);
  const [a, b] = sharing.steps
    .at(-1)
    .scene.groups.map((g) => counterTotal([g]));
  assert.deepEqual([a, b], [8, 12]);
  assert.equal(a * 3, b * 2);
  const unitary = lesson('unitary-cost');
  assert.deepEqual(
    unitary.steps.map((s) => counterTotal(s.scene.groups)),
    [12, 12, 4, 20],
  );
});
test('angle sectors are contiguous, sum exactly to the intended turn and use true polar geometry', () => {
  for (const id of ['straight-line', 'angles-point']) {
    const l = lesson(id),
      s = l.steps.at(-1).scene;
    assert.equal(
      s.sectors.reduce((total, a) => total + a.end - a.start, 0),
      l.model.total,
    );
    assert.deepEqual(
      s.sectors.map((a) => a.end - a.start),
      l.model.angles,
    );
    s.sectors.forEach((a, i) =>
      assert.equal(a.start, i ? s.sectors[i - 1].end : 0),
    );
  }
  assert.deepEqual(anglePoint(0, 0, 10, 0), [10, 0]);
  const top = anglePoint(0, 0, 10, 90);
  assert.ok(Math.abs(top[0]) < 1e-9);
  assert.equal(top[1], -10);
  assert.ok(sectorPath(0, 110).includes('A 102 102'));
});
test('area, perimeter and congruent triangle formulas agree with the diagrams', () => {
  const area = lesson('rectangle-area'),
    perimeter = lesson('rectangle-perimeter'),
    triangle = lesson('triangle-area');
  assert.equal(area.model.width * area.model.height, area.model.result);
  assert.equal(area.steps.at(-1).scene.rows * area.model.width, 15);
  assert.equal(
    2 * (perimeter.model.width + perimeter.model.height),
    perimeter.model.result,
  );
  assert.deepEqual(
    perimeter.steps.map((s) => s.scene.sides.length),
    [0, 1, 2, 3, 4, 4],
  );
  assert.equal(
    (triangle.model.base * triangle.model.height) / 2,
    triangle.model.result,
  );
  assert.deepEqual(
    triangle.steps.map((s) => s.scene.copy),
    [false, true, true],
  );
});
test('probability uses labelled equally likely outcomes and exhaustive complements', () => {
  const event = lesson('equally-likely'),
    complement = lesson('complement');
  assert.equal(event.model.favourable / event.model.total, 0.75);
  const items = event.steps[0].scene.groups[0].items;
  assert.equal(items.filter((t) => t.category === 'blue').length, 3);
  assert.equal(items.filter((t) => t.category === 'gold').length, 1);
  assert.ok(
    items.every(
      (i) =>
        i.shape === 'circle' &&
        ['\\mathrm{B}', '\\mathrm{G}'].includes(i.latex),
    ),
  );
  assert.equal(
    (complement.model.favourable + complement.model.complement) /
      complement.model.total,
    1,
  );
  assert.deepEqual(
    lesson('probability-scale').steps.map((s) => s.scene.probability),
    [0, 0.25, 0.5, 0.75, 1],
  );
});
test('mean redistributes exactly one stable counter per step and preserves the total', () => {
  const mean = lesson('mean');
  const scenes = mean.steps.map((s) => s.scene.groups);
  const original = scenes[0].flatMap((g) => g.items.map((i) => i.id)).sort();
  for (const groups of scenes) {
    assert.equal(counterTotal(groups), 12);
    assert.deepEqual(
      groups.flatMap((g) => g.items.map((i) => i.id)).sort(),
      original,
    );
  }
  assert.deepEqual(
    scenes.map((groups) => groups.map((g) => g.items.length)),
    [
      [2, 4, 6],
      [3, 4, 5],
      [4, 4, 4],
      [4, 4, 4],
    ],
  );
  for (let index = 1; index <= 2; index++) {
    const before = new Map(
      scenes[index - 1].flatMap((g) => g.items.map((i) => [i.id, g.id])),
    );
    const moved = scenes[index].flatMap((g) =>
      g.items.filter((i) => before.get(i.id) !== g.id),
    );
    assert.equal(moved.length, 1);
  }
});
test('median, mode and range are correct, and sorting never changes card values or IDs', () => {
  for (const id of ['median', 'mode', 'range']) {
    const l = lesson(id),
      source = l.steps[0].scene.items;
    const sorted = [...l.model.values].sort((a, b) => a - b);
    const frequency = new Map(
      sorted.map((value) => [value, sorted.filter((x) => x === value).length]),
    );
    const mode = [...frequency].sort((a, b) => b[1] - a[1])[0][0];
    const expected =
      id === 'median'
        ? sorted[Math.floor(sorted.length / 2)]
        : id === 'range'
          ? sorted.at(-1) - sorted[0]
          : mode;
    assert.equal(l.model.result, expected);
    for (const s of l.steps)
      assert.deepEqual(
        [...s.scene.items].sort((a, b) => a.id.localeCompare(b.id)),
        [...source].sort((a, b) => a.id.localeCompare(b.id)),
      );
  }
  assert.equal(
    lesson('read-bar-chart')
      .steps.at(-1)
      .scene.categories.find((c) => c.id === 'dogs').value,
    5,
  );
});
test('fraction and percentage grouping uses the same whole and correct selected value', () => {
  for (const id of ['fraction-amount', 'percentage-amount', 'add-sixths']) {
    const l = lesson(id);
    assert.ok(
      l.steps.every((s) => counterTotal(s.scene.groups) === l.model.total),
    );
    const selected = counterTotal(
      l.steps.at(-1).scene.groups.map((g) => ({
        ...g,
        items: g.items.filter((t) => t.highlight),
      })),
    );
    assert.equal(id === 'add-sixths' ? selected / 6 : selected, l.model.result);
    assert.ok(
      l.steps.some((s) => s.left.some((t) => t.latex.includes('\\frac'))),
    );
  }
});
test('schema rejects invalid diagrams and isolates bad mathematical state', () => {
  const invalid = (id, mutate) => {
    const copy = structuredClone(lesson(id));
    mutate(copy);
    assert.throws(() => validateLesson(copy, copy.subjectArea));
  };
  invalid('mean', (l) => l.steps[1].scene.groups[0].items.pop());
  invalid('equivalent-ratio', (l) => l.steps[0].scene.groups[0].items.pop());
  invalid('straight-line', (l) => (l.steps[1].scene.sectors[1].start = 100));
  invalid('rectangle-area', (l) => (l.steps[0].scene.width = 0));
  invalid('median', (l) => (l.steps[1].scene.items[0].value = 99));
  invalid('median', (l) => {
    const items = l.steps[1].scene.items;
    [items[0].value, items[1].value] = [items[1].value, items[0].value];
  });
  invalid('probability-scale', (l) => (l.steps[0].scene.probability = 1.2));
  invalid('read-bar-chart', (l) => (l.steps[0].scene.categories[0].value = 7));
});
