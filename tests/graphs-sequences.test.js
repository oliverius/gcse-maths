import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { instantiateLesson } from '../src/js/lesson-templates.js';
import { validateLesson } from '../src/js/lesson-validation.js';
const templates = JSON.parse(
  await readFile(
    new URL('../src/data/lessons/algebra.json', import.meta.url),
    'utf8',
  ),
).lessons;
const make = (id, values) =>
  instantiateLesson(
    templates.find((l) => l.id === id),
    { id: `${id}-2`, values },
  );

test('coordinate plotting covers all four signed quadrants and moves along x before y', () => {
  for (const xMagnitude of [2, 3])
    for (const yMagnitude of [2, 3]) {
      const l = make('coordinates-four-quadrants', { xMagnitude, yMagnitude });
      assert.deepEqual(
        l.model.points.map((p) => [p.x, p.y]),
        [
          [-xMagnitude, yMagnitude],
          [xMagnitude, yMagnitude],
          [-xMagnitude, -yMagnitude],
          [xMagnitude, -yMagnitude],
        ],
      );
      assert.deepEqual(
        l.steps.map((s) => s.scene.revealed),
        [0, 0, 1, 1, 2, 3, 4],
      );
      assert.equal(l.steps[1].scene.horizontal, true);
      assert.equal(l.steps[1].scene.vertical, false);
      assert.equal(l.steps[2].scene.horizontal, true);
      assert.equal(l.steps[2].scene.vertical, true);
    }
});

test('line tables calculate before plotting and the final straight line contains every pair', () => {
  for (const slope of [1, 2])
    for (const intercept of [1, 2]) {
      const l = make('line-from-table', { slope, intercept });
      assert.deepEqual(l.model.xs, [-2, -1, 0, 1, 2]);
      assert.deepEqual(
        l.model.ys,
        l.model.xs.map((x) => slope * x + intercept),
      );
      assert.deepEqual(
        l.steps.map((s) => s.scene.computed),
        [0, 1, 2, 3, 4, 5, 5, 5, 5, 5, 5, 5],
      );
      assert.deepEqual(
        l.steps.map((s) => s.scene.plotted),
        [0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 5],
      );
      assert.ok(l.steps.slice(0, -1).every((s) => !s.scene.line));
      assert.equal(l.steps.at(-1).scene.line, true);
      assert.equal(l.practiceLinks, true);
      assert.ok(l.prerequisiteLessonIds.includes('coordinates-four-quadrants'));
    }
});

test('term-to-term rules continue increasing and decreasing sequences without revealing the answer early', () => {
  for (const [values, result] of [
    [{ first: 3, gap: 4, direction: 1 }, 19],
    [{ first: 12, gap: 3, direction: 2 }, 0],
    [{ first: 1, gap: 5, direction: 2 }, -19],
  ]) {
    const l = make('sequence-next-term', values),
      m = l.model;
    assert.equal(m.result, result);
    assert.ok(
      m.values.slice(1).every((v, i) => v - m.values[i] === m.difference),
    );
    assert.ok(l.steps.slice(0, 4).every((s) => s.scene.visible === 4));
    assert.equal(l.steps[4].scene.visible, 5);
    assert.equal(l.steps[4].scene.differences, 4);
    assert.deepEqual(
      l.steps.slice(1, 4).map((s) => s.scene.differences),
      [1, 2, 3],
    );
  }
});

test('linear nth-term rules adjust multiples for positive, negative and zero offsets', () => {
  for (const [values, expected] of [
    [{ first: 3, gap: 4, direction: 1, position: 10 }, 39],
    [{ first: 5, gap: 3, direction: 1, position: 10 }, 32],
    [{ first: 4, gap: 4, direction: 1, position: 10 }, 40],
    [{ first: 12, gap: 3, direction: 2, position: 6 }, -3],
  ]) {
    const l = make('sequence-nth-term', values),
      m = l.model;
    assert.equal(m.result, expected);
    assert.equal(m.offset, m.first - m.difference);
    for (let n = 1; n <= 5; n++)
      assert.equal(m.difference * n + m.offset, m.values[n - 1]);
    assert.equal(l.steps[2].scene.compare, true);
    assert.deepEqual(l.steps[4].scene.selected, [1]);
    const formula = l.steps[3].left[0].latex;
    assert.ok(!formula.includes('+-'));
    if (m.offset === 0) assert.equal(formula, `T_n=${m.difference}n`);
  }
});

test('foundations scenes reject swapped signs, invented table values and premature reveals', () => {
  const reject = (l, mutate) => {
    const copy = structuredClone(l);
    mutate(copy);
    assert.throws(() => validateLesson(copy, 'algebra'));
  };
  const c = make('coordinates-four-quadrants', {
    xMagnitude: 3,
    yMagnitude: 2,
  });
  reject(c, (l) => {
    l.model.points[0].x = 3;
  });
  reject(c, (l) => {
    l.steps[1].scene.vertical = true;
  });
  const graph = make('line-from-table', { slope: 2, intercept: 1 });
  reject(graph, (l) => {
    l.model.ys[0] = 3;
  });
  reject(graph, (l) => {
    l.steps[0].scene.plotted = 1;
  });
  reject(graph, (l) => {
    l.steps[0].scene.line = true;
  });
  const sequence = make('sequence-next-term', {
    first: 3,
    gap: 4,
    direction: 1,
  });
  reject(sequence, (l) => {
    l.model.values[4] = 20;
  });
  reject(sequence, (l) => {
    l.steps[0].scene.differences = 4;
  });
  reject(sequence, (l) => {
    l.steps[0].scene.selected = [5];
  });
  const nth = make('sequence-nth-term', {
    first: 3,
    gap: 4,
    direction: 1,
    position: 10,
  });
  reject(nth, (l) => {
    l.model.result = 40;
  });
  reject(nth, (l) => {
    l.model.offset = 1;
  });
});
