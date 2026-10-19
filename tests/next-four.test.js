import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { instantiateLesson } from '../src/js/lesson-templates.js';
import { validateLesson } from '../src/js/lesson-validation.js';
const subjects = await Promise.all(
  ['number', 'algebra'].map(async (area) =>
    JSON.parse(
      await readFile(
        new URL(`../src/data/lessons/${area}.json`, import.meta.url),
        'utf8',
      ),
    ),
  ),
);
const templates = subjects.flatMap((s) => s.lessons);
const make = (id, values) =>
  instantiateLesson(
    templates.find((l) => l.id === id),
    { id: `${id}-1`, values },
  );

test('line equations use the y-axis crossing, with positive, negative and zero intercepts', () => {
  for (const [points, m, n] of [
    [{ x1: 1, y1: 3, x2: 4, y2: 9 }, 2, 1],
    [{ x1: 2, y1: 1, x2: 4, y2: 3 }, 1, -1],
    [{ x1: 1, y1: 2, x2: 4, y2: 8 }, 2, 0],
    [{ x1: 1, y1: 3, x2: 5, y2: 3 }, 0, 3],
    [{ x1: 1, y1: 8, x2: 3, y2: 4 }, -2, 10],
  ]) {
    const l = make('line-intercept', points);
    assert.equal(l.model.result, m);
    assert.equal(l.model.intercept, n);
    assert.equal(m * points.x1 + n, points.y1);
    assert.equal(m * points.x2 + n, points.y2);
    assert.deepEqual(
      l.steps.map((s) => [s.scene.intercept, s.scene.knownIntercept]),
      [
        [false, false],
        [true, false],
        [true, true],
        [true, true],
        [true, true],
      ],
    );
    const equation = l.steps[3].left[0].latex;
    if (m === 0) assert.equal(equation, 'y=3');
    assert.ok(!equation.includes('+-'));
    if (n < 0) assert.ok(equation.endsWith(`-${-n}`));
    if (n === 0) assert.ok(!equation.includes('+0'));
  }
  assert.throws(
    () => make('line-intercept', { x1: 3, y1: 1, x2: 4, y2: 9 }),
    /visible grid/,
  );
  const bad = make('line-intercept', { x1: 1, y1: 3, x2: 4, y2: 9 });
  bad.model.intercept = 2;
  assert.throws(() => validateLesson(bad, 'algebra'), /intercept/);
});

test('unlike-denominator addition preserves each fraction when repartitioned and simplifies the sum', () => {
  for (const values of [
    { a: 1, b: 2, c: 1, d: 3 },
    { a: 1, b: 2, c: 1, d: 6 },
    { a: 1, b: 3, c: 1, d: 4 },
    { a: 2, b: 3, c: 1, d: 6 },
  ]) {
    const l = make('add-unlike-fractions', values);
    const expected = values.a / values.b + values.c / values.d;
    for (const s of l.steps)
      assert.ok(
        Math.abs(
          s.bars.reduce((sum, b) => sum + b.shaded / b.parts, 0) - expected,
        ) < 1e-9,
      );
    for (const i of [0, 1])
      assert.equal(
        l.steps[0].bars[i].shaded / l.steps[0].bars[i].parts,
        l.steps[2].bars[i].shaded / l.steps[2].bars[i].parts,
      );
    assert.equal(l.model.numerator / l.model.denominator, l.model.result);
  }
  assert.equal(
    make('add-unlike-fractions', { a: 1, b: 2, c: 1, d: 3 }).model.numerator,
    5,
  );
  const reduced = make('add-unlike-fractions', { a: 1, b: 2, c: 1, d: 6 });
  assert.equal(reduced.model.numerator, 2);
  assert.equal(reduced.model.denominator, 3);
  assert.throws(
    () => make('add-unlike-fractions', { a: 1, b: 3, c: 1, d: 5 }),
    /twelve/,
  );
  assert.throws(
    () => make('add-unlike-fractions', { a: 2, b: 2, c: 1, d: 3 }),
    /one whole/,
  );
});

test('decimal-to-fraction conversion keeps the shaded proportion when tenths become larger parts', () => {
  for (const digit of [2, 4, 5, 6, 8]) {
    const l = make('decimal-to-fraction', { digit });
    for (const s of l.steps)
      assert.equal(s.bars[0].shaded / s.bars[0].parts, digit / 10);
    assert.equal(l.model.numerator / l.model.denominator, digit / 10);
    assert.ok(l.steps.at(-1).bars[0].parts < 10);
  }
  const l = make('decimal-to-fraction', { digit: 6 });
  assert.equal(l.model.numerator, 3);
  assert.equal(l.model.denominator, 5);
});

test('the one-percent method supports any integer percentage from one to one hundred', () => {
  for (const whole of [100, 200, 11500])
    for (let percent = 1; percent <= 100; percent++) {
      const l = make('percentage-one-percent', { whole, percent });
      assert.equal(l.model.onePercent, whole / 100);
      assert.equal(l.model.result, (whole / 100) * percent);
      assert.deepEqual(
        l.steps.map((s) => s.scene.selected),
        [0, 1, percent, percent],
      );
    }
  assert.equal(
    make('percentage-one-percent', { whole: 11500, percent: 12 }).model.result,
    1380,
  );
  for (const percent of [0, 101, 1.5])
    assert.throws(() =>
      make('percentage-one-percent', { whole: 200, percent }),
    );
  assert.throws(
    () => make('percentage-one-percent', { whole: 150, percent: 12 }),
    /whole-number/,
  );
  const bad = make('percentage-one-percent', { whole: 200, percent: 12 });
  bad.steps[2].scene.selected = 13;
  assert.throws(() => validateLesson(bad, 'number'), /percentage grid/);
});
