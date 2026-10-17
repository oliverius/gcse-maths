import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lessons } from '../src/js/lessons.js';
test('all lessons have five deliberate steps with unique term identities', () => {
  assert.equal(lessons.length, 3);
  for (const lesson of lessons) {
    assert.equal(lesson.steps.length, 5);
    for (const state of lesson.steps) {
      const ids = [...state.left, ...state.right].map(t => t.id);
      assert.equal(new Set(ids).size, ids.length);
      assert.ok(state.explanation);
    }
  }
});
test('equations break equality only during the one-sided operation', () => {
  for (const lesson of lessons.slice(0, 2)) {
    assert.deepEqual(lesson.steps.map(s => s.balance === 0), [true, false, true, true, true]);
    assert.equal(lesson.steps[1].left.at(-1).text, lesson.steps[2].right.at(-1).text);
    assert.equal(lesson.steps[1].left.at(-1).tone, lesson.steps[2].right.at(-1).tone);
    assert.deepEqual(lesson.steps[3].cancel, ['original-three', 'added-left']);
    assert.equal(lesson.steps[3].left.at(-1).text, '+ 0');
  }
});
test('solutions and bracket evaluation are correct', () => {
  assert.equal(lessons[0].steps[4].right[0].text, '5');
  assert.equal(5 - 3, 2);
  assert.equal(lessons[1].steps[4].right[0].text, '−1');
  assert.equal(-1 + 3, 2);
  const brackets = lessons[2];
  assert.ok(brackets.steps.every(s => s.balance === null));
  assert.equal(brackets.steps[2].left.at(-1).text, '5');
  assert.equal(brackets.steps[4].left[0].text, String(6 * (2 + 3)));
});
