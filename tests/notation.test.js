import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { mathHTML, validateNotation } from '../src/js/notation.js';
import { validateLesson } from '../src/js/lesson-engine.js';
import { linearExpression } from '../src/js/mathematics.js';
const subjects = await Promise.all(['algebra','number','ratio','geometry','probability','statistics'].map(async area => JSON.parse(await readFile(new URL(`../src/data/${area}.json`,import.meta.url),'utf8'))));
const lessons = subjects.flatMap(s => s.lessons.filter(l => l.available));
test('KaTeX renders stacked fractions, implicit products, powers, roots and negatives with MathML', () => {
  for (const [latex, markup] of [['\\frac{x}{4}','<mfrac>'],['3x','<mi>x</mi>'],['x^2','<msup>'],['\\sqrt{x}','<msqrt>'],['-1','<mo>−</mo>'],['6 \\times (2+3)','×']]) {
    const html=mathHTML(latex);
    assert.ok(html.includes(markup),latex);
    assert.ok(html.includes('katex-mathml'));
    assert.ok(html.includes('katex-html'));
  }
});
test('all implemented mathematical terms and lesson titles have valid notation and spoken equivalents', () => {
  for (const lesson of lessons) {
    validateNotation(lesson.notation);
    for(const state of lesson.steps) {
      for(const term of [...state.left,...state.right,...(state.groups||[]).flatMap(g=>g.items)]) {
        validateNotation(term);
        if(/[\/÷]/.test(term.text)) assert.ok(term.latex.includes('\\frac'),`${lesson.id}: ${term.text}`);
      }
      if(state.working)validateNotation(state.workingNotation);
    }
  }
});
test('schema rejects malformed or missing notation without changing animation IDs', () => {
  const lesson=structuredClone(lessons[0]);
  assert.deepEqual(lesson.steps[3].cancel,['original-three','added-left']);
  lesson.steps[0].left[0].latex='\\frac{x';
  assert.throws(()=>validateLesson(lesson,'algebra'));
  assert.throws(()=>validateNotation({latex:'x'}));
  assert.throws(()=>mathHTML('\\unknownCommand{x}'));
});
test('stacked-division LaTeX has the same linear meaning as every existing balance state', () => {
  // The lesson engine retains its separate arithmetic model. Verify the new
  // presentation fields agree with it, including nested fraction multiplication.
  function arithmetic(latex) {
    let value=latex.replaceAll('\\left','').replaceAll('\\right','').replaceAll('\\times','*');
    while(value.includes('\\frac')) value=value.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g,'(($1)/($2))');
    return value;
  }
  for(const lesson of lessons.filter(l=>l.kind==='balance'))for(const state of lesson.steps)for(const side of ['left','right']) {
    const actual=linearExpression(state[side].map(t=>arithmetic(t.latex)).join(' '));
    assert.ok(Math.abs(actual.coefficient-state.math[side].coefficient)<1e-9);
    assert.ok(Math.abs(actual.constant-state.math[side].constant)<1e-9);
  }
});
