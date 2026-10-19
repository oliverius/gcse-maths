import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { instantiateLesson } from '../src/js/lesson-templates.js';
import { validateLesson } from '../src/js/lesson-validation.js';

const read = async (area, id) =>
  JSON.parse(
    await readFile(
      new URL(`../src/data/lessons/${area}.json`, import.meta.url),
      'utf8',
    ),
  ).lessons.find((l) => l.id === id);
const gradient = await read('algebra', 'gradient-two-points');
const earnings = await read('combined', 'earnings-tax-savings');
const make = (template, values) =>
  instantiateLesson(template, { id: `${template.id}-1`, values });
const jessica = {
  income: 24000,
  allowance: 12500,
  taxRate: 12,
  numerator: 3,
  denominator: 8,
};

test('combined problems declare their skills, prerequisites and curriculum areas', async () => {
  const examples = JSON.parse(
    await readFile(
      new URL('../src/data/examples/combined.json', import.meta.url),
      'utf8',
    ),
  );
  assert.deepEqual(examples.lessons[0].examples[0].values, jessica);
  assert.equal(earnings.subjectArea, 'combined');
  assert.equal(earnings.skills.length, 4);
  assert.deepEqual(earnings.prerequisiteLessonIds, [
    'percentage-one-percent',
    'fraction-amount',
  ]);
  assert.deepEqual(
    earnings.curriculum.map((ref) => ref.reference),
    ['R9', 'N12'],
  );
  const ratio = JSON.parse(
    await readFile(
      new URL('../src/data/lessons/ratio.json', import.meta.url),
      'utf8',
    ),
  );
  assert.ok(!ratio.lessons.some((l) => l.id === earnings.id));
  for (const change of [
    (l) => {
      l.skills = [];
    },
    (l) => {
      l.prerequisiteLessonIds = [];
    },
  ]) {
    const copy = structuredClone(earnings);
    change(copy);
    assert.throws(() => make(copy, jessica), /Combined problems/);
  }
});

test('gradient uses the same point order for rising, falling, horizontal and fractional slopes', () => {
  for (const [points, expected] of [
    [{ x1: 1, y1: 3, x2: 4, y2: 9 }, 2],
    [{ x1: 1, y1: 8, x2: 5, y2: 2 }, -1.5],
    [{ x1: 2, y1: 5, x2: 7, y2: 5 }, 0],
    [{ x1: 2, y1: 3, x2: 6, y2: 4 }, 0.25],
  ]) {
    const lesson = make(gradient, points);
    assert.equal(lesson.model.result, expected);
    assert.equal(lesson.model.run, points.x2 - points.x1);
    assert.equal(lesson.model.rise, points.y2 - points.y1);
    assert.deepEqual(
      lesson.steps.map((s) => [s.scene.run, s.scene.rise]),
      [
        [false, false],
        [true, false],
        [true, true],
        [true, true],
        [true, true],
      ],
    );
    for (const state of lesson.steps)
      for (const key of ['x1', 'y1', 'x2', 'y2'])
        assert.equal(state.scene[key], points[key]);
  }
  assert.throws(() => make(gradient, { x1: 2, y1: 3, x2: 2, y2: 7 }));
  assert.throws(() => make(gradient, { x1: 4, y1: 3, x2: 2, y2: 7 }));
});

test('Jessica pays tax only on earnings over the allowance and saves from after-tax income', () => {
  const lesson = make(earnings, jessica);
  assert.equal(lesson.model.taxable, 11500);
  assert.equal(lesson.model.tax, 1380);
  assert.equal(lesson.model.afterTax, 22620);
  assert.equal(lesson.model.share, 2827.5);
  assert.equal(lesson.model.savings, 8482.5);
  assert.equal(lesson.model.result, 14137.5);
  assert.equal(
    lesson.model.tax + lesson.model.savings + lesson.model.result,
    jessica.income,
  );
  assert.equal(
    lesson.steps.at(-1).scene.rows.reduce((sum, row) => sum + row.value, 0),
    jessica.income,
  );
  assert.match(lesson.steps.at(-1).left[0].latex, /14,137\.50/);
  const alternative = make(earnings, { ...jessica, income: 32000 });
  assert.equal(alternative.model.tax, 2340);
  assert.equal(alternative.model.result, 18537.5);
});

test('classroom diagrams reject changed points, wrong gradients and mismatched financial amounts', () => {
  const reject = (original, mutate) => {
    const copy = structuredClone(original);
    mutate(copy);
    assert.throws(() => validateLesson(copy, copy.subjectArea));
  };
  const graph = make(gradient, { x1: 1, y1: 3, x2: 4, y2: 9 });
  reject(graph, (l) => {
    l.model.result = 0.5;
  });
  reject(graph, (l) => {
    l.steps[2].scene.y2 = 8;
  });
  reject(graph, (l) => {
    l.steps[1].scene.rise = true;
    l.steps[1].scene.run = false;
  });
  const money = make(earnings, jessica);
  reject(money, (l) => {
    l.model.tax = 28800;
  });
  reject(money, (l) => {
    l.model.savings = 90000;
  });
  reject(money, (l) => {
    l.steps[2].scene.rows[1].value = 12;
  });
  reject(money, (l) => {
    l.steps[1].scene.rows[0].value = -1;
  });
});

test('money formatting preserves pennies and earnings examples keep their bounded arithmetic', () => {
  const lesson = make(earnings, jessica);
  assert.match(lesson.steps[0].left[0].latex, /24,000\.00/);
  assert.match(lesson.steps[4].left[0].latex, /2,827\.50/);
  assert.throws(() => make(earnings, { ...jessica, income: 2000000 }));
  assert.throws(() =>
    make(earnings, { ...jessica, income: 20000, allowance: 25000 }),
  );
  assert.throws(() =>
    make(earnings, { ...jessica, numerator: 7, denominator: 3 }),
  );
  const unsafe = structuredClone(earnings);
  unsafe.derived.taxable = { multiply: ['income', 100] };
  assert.throws(() => make(unsafe, jessica), /out of range/);
});
