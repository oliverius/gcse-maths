import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createLoader } from '../src/js/lesson-loader.js';
import { validateLesson } from '../src/js/lesson-validation.js';
import { pythagorasGeometry, isPrime } from '../src/js/learning-geometry.js';
import { pythagorasLayout } from '../src/js/learning-diagrams.js';
const areas = await createLoader(async (url) => ({
  ok: true,
  json: async () => JSON.parse(await readFile(url, 'utf8')),
})).load();
const lessons = areas.flatMap((a) => a.lessons.filter((l) => l.available));
const get = (id) => lessons.find((l) => l.id === id);
const ids = [
  'square-three',
  'cube-two',
  'square-root-25',
  'zero-power',
  'multiply-powers',
  'pythagoras-areas',
  'pythagoras-hypotenuse',
  'pythagoras-shorter',
  'prime-factors',
  'place-value-ten',
  'substitution',
  'coin-spinner-space',
];
test('mandatory powers/roots and Pythagoras lessons are available with acyclic prerequisites', () => {
  assert.equal(lessons.length, 57);
  assert.deepEqual(
    areas.flatMap((a) => a.errors),
    [],
  );
  for (const id of ids) {
    const l = get(id);
    assert.ok(l?.available, id);
    assert.ok(l.tutorNotes.checkQuestion);
    assert.ok(
      l.curriculum[0].url.startsWith(
        'https://qualifications.pearson.com/content/dam/pdf/GCSE/mathematics/2015/specification-and-sample-assesment/gcse-maths-2015-specification.pdf#page=',
      ),
    );
  }
  const visit = (id, path = []) => {
    assert.ok(!path.includes(id), 'cyclic prerequisite');
    const l = get(id);
    assert.ok(l, `unknown prerequisite ${id}`);
    (l.prerequisiteLessonIds || []).forEach((p) => visit(p, [...path, id]));
  };
  ids.forEach((id) => visit(id));
});
test('square and cube arrays count repeated multiplication, with one row/layer per transition', () => {
  for (const id of ['square-three', 'cube-two', 'square-root-25']) {
    const l = get(id),
      last = l.steps.at(-1).scene;
    assert.equal(
      last.rows * last.columns * last.layers,
      l.model.base ** l.model.exponent,
    );
    assert.equal(l.model.result, l.model.base ** l.model.exponent);
  }
  assert.deepEqual(
    get('square-three').steps.map((s) => s.scene.visibleRows),
    [0, 1, 2, 3, 3],
  );
  assert.deepEqual(
    get('cube-two').steps.map((s) => s.scene.visibleLayers),
    [1, 1, 2, 2],
  );
  assert.equal(get('square-root-25').model.root, Math.sqrt(25));
});
test('zero exponent pattern divides by the same nonzero base and same-base products count factors', () => {
  const zero = get('zero-power');
  assert.deepEqual(
    zero.steps.map((s) => s.scene.visible),
    [1, 2, 3, 4],
  );
  const values = zero.steps.at(-1).scene.exponents.map((p) => 5 ** p);
  assert.deepEqual(values, [125, 25, 5, 1]);
  values.slice(1).forEach((v, i) => assert.equal(values[i] / 5, v));
  const product = get('multiply-powers'),
    first = product.steps[0].scene.groups;
  assert.deepEqual(
    first.map((g) => g.items.length),
    [3, 2],
  );
  const last = product.steps.at(-1).scene.groups[0].items;
  assert.equal(last.length, 5);
  assert.equal(
    last.reduce((n, item) => n * item.value, 1),
    32,
  );
  assert.deepEqual(
    last.map((i) => i.id).sort(),
    first.flatMap((g) => g.items.map((i) => i.id)).sort(),
  );
});
function polygonArea(points) {
  return (
    Math.abs(
      points.reduce((sum, p, i) => {
        const q = points[(i + 1) % points.length];
        return sum + p[0] * q[1] - q[0] * p[1];
      }, 0),
    ) / 2
  );
}
test('Pythagoras polygons are exact outward squares attached to their true side lengths', () => {
  for (const [a, b, c] of [
    [3, 4, 5],
    [6, 8, 10],
    [5, 12, 13],
  ]) {
    const g = pythagorasGeometry(a, b);
    for (const id of ['a', 'b', 'c']) {
      const sq = g.squares[id],
        length = { a, b, c }[id];
      assert.ok(Math.abs(sq.length - length) < 1e-9);
      assert.ok(Math.abs(polygonArea(sq.points) - length ** 2) < 1e-9);
      assert.ok(Math.abs(sq.e[0] * sq.n[0] + sq.e[1] * sq.n[1]) < 1e-9);
      const points = pythagorasLayout(a, b).squares[id].points;
      for (const p of points) {
        const [x, y] = pythagorasLayout(a, b).map(p);
        assert.ok(x >= 100 && x <= 700 && y >= 120 && y <= 365);
      }
    }
    assert.equal(a * a + b * b, c * c);
  }
});
test('area transfer conserves twenty-five congruent unit squares, with no holes in the target grid', () => {
  const l = get('pythagoras-areas'),
    before = l.steps[3].scene,
    after = l.steps[4].scene;
  assert.equal(before.transfer, false);
  assert.equal(after.transfer, true);
  const g = pythagorasGeometry(3, 4),
    target = g.squares.c;
  const sourceIds = [...Array(9)]
    .map((_, i) => i)
    .concat([...Array(16)].map((_, i) => i + 9));
  const targetIds = [];
  for (let row = 0; row < 5; row++)
    for (let col = 0; col < 5; col++) {
      targetIds.push(row * 5 + col);
      const p = [
        target.origin[0] + target.e[0] * col + target.n[0] * row,
        target.origin[1] + target.e[1] * col + target.n[1] * row,
      ];
      const unit = [
        p,
        [p[0] + target.e[0], p[1] + target.e[1]],
        [p[0] + target.e[0] + target.n[0], p[1] + target.e[1] + target.n[1]],
        [p[0] + target.n[0], p[1] + target.n[1]],
      ];
      assert.ok(Math.abs(polygonArea(unit) - 1) < 1e-9);
    }
  assert.deepEqual(sourceIds, targetIds);
  assert.equal(new Set(targetIds).size, 25);
});
test('Pythagoras calculations take square roots of areas, and do not reveal unknown lengths early', () => {
  const hyp = get('pythagoras-hypotenuse'),
    short = get('pythagoras-shorter');
  assert.equal(Math.sqrt(6 ** 2 + 8 ** 2), hyp.model.result);
  assert.equal(Math.sqrt(13 ** 2 - 12 ** 2), short.model.result);
  assert.ok(
    hyp.steps.slice(0, -1).every((s) => !s.scene.knownSides.includes('c')),
  );
  assert.ok(
    short.steps.slice(0, -1).every((s) => !s.scene.knownSides.includes('a')),
  );
  assert.ok(hyp.steps.at(-1).scene.knownSides.includes('c'));
  assert.ok(short.steps.at(-1).scene.knownSides.includes('a'));
  assert.ok(short.steps.some((s) => s.left[0].latex === 'a^2=169-144'));
  assert.ok(hyp.steps.at(-1).left[0].latex.includes('\\sqrt{100}'));
});
test('prime decomposition, fixed decimal boundary and substitution have correct numeric models', () => {
  const prime = get('prime-factors'),
    s = prime.steps.at(-1).scene;
  const leaves = s.nodes.filter((n) => !n.children.length);
  assert.ok(leaves.every((n) => isPrime(n.value)));
  assert.equal(
    leaves.reduce((n, i) => n * i.value, 1),
    18,
  );
  assert.equal(isPrime(1), false);
  assert.equal(isPrime(9), false);
  const place = get('place-value-ten');
  assert.deepEqual(
    place.steps.at(-1).scene.digits.map((d) => [d.digit, d.place]),
    [
      [3, 1],
      [4, 0],
    ],
  );
  assert.equal(place.model.initial * 10, place.model.result);
  const sub = get('substitution');
  assert.equal(3 * sub.model.x + 2, sub.model.result);
  assert.ok(
    sub.steps.every(
      (s) =>
        s.scene.groups
          .flatMap((g) => g.items)
          .reduce((n, i) => n + i.value, 0) === 14,
    ),
  );
});
test('sample space reveals exactly one pair at a time and computes a fraction of six equal outcomes', () => {
  const l = get('coin-spinner-space');
  assert.deepEqual(
    l.steps.map((s) => s.scene.revealed),
    [0, 1, 2, 3, 4, 5, 6, 6, 6],
  );
  const pairs = l.steps
    .at(-1)
    .scene.rows.flatMap((r) =>
      l.steps.at(-1).scene.columns.map((c) => `${r}-${c}`),
    );
  assert.equal(new Set(pairs).size, 6);
  assert.deepEqual(l.steps.at(-1).scene.selected, ['H-2']);
  assert.equal(l.model.favourable / l.model.total, l.model.result);
});
test('schema rejects misleading arrays, triangles, factorisations, digit changes and hidden outcomes', () => {
  const invalid = (id, mutate) => {
    const copy = structuredClone(get(id));
    mutate(copy);
    assert.throws(() => validateLesson(copy, copy.subjectArea));
  };
  invalid('square-three', (l) => (l.steps[1].scene.rows = 2));
  invalid('zero-power', (l) => (l.steps[0].scene.base = 0));
  invalid('pythagoras-areas', (l) => (l.steps[0].scene.c = 6));
  invalid('pythagoras-areas', (l) => (l.steps[0].scene.transfer = true));
  invalid('prime-factors', (l) => (l.steps[0].scene.nodes[2].value = 8));
  invalid('place-value-ten', (l) => (l.steps[1].scene.digits[0].digit = 4));
  invalid('coin-spinner-space', (l) => (l.steps[0].scene.selected = ['H-1']));
});
