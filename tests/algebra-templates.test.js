import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import {
  instantiateAlgebraLesson,
  validateAlgebraExamples,
} from '../src/js/algebra-templates.js';
import { createLoader } from '../src/js/lesson-loader.js';

const readJSON = async (name) =>
  JSON.parse(
    await readFile(new URL(`../src/data/${name}`, import.meta.url), 'utf8'),
  );
const templates = (await readJSON('algebra.json')).lessons;
const examples = validateAlgebraExamples(
  await readJSON('algebra-examples.json'),
  templates,
);
const template = (id) => templates.find((candidate) => candidate.id === id);
const make = (id, values) =>
  instantiateAlgebraLesson(template(id), { id: `${id}-2`, values });

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  return value;
}

// Captured from the original complete lessons before the template migration.
const originalHashes = {
  'add-both':
    '3d3f415c36da1e7193a1bacdcd8058486d38aefe7cde4858607c2348e8bf125c',
  'subtract-both':
    '06fa56d0dd5c74b1e854695042961d2e7f9cf401885e36ee6927a495eee6edbf',
  'divide-three':
    'c4b743be4c63f4f8bfe926cd17ca7111107fb20930edcdd7ba9c98373a895884',
  'multiply-four':
    '0548c1d97c5d26b0fb2fa3e83bf0e74678111c4468aa19c29906269170b2299f',
  'two-step':
    'e179698187670e85c173c8d0602ceaba85e0c286ccf3d59427eb6f869b368b53',
  'like-terms':
    '484ee261286d7eb949a12dd7a3f907add0017a4120784a6185b9c1b179ec9b59',
  'distribute-three':
    'e93ca851969ebf05e0e34e76663a1de6e29897854c8ad5bfce73cd26fc3d4abd',
  substitution:
    'd4c1778673b2657c3cd2d8eb3939ad6449ae564d8269e3429ac133dd1b50bbff',
};

test('every algebra template retains exactly its original curated example and complete teaching states', () => {
  assert.equal(templates.length, 8);
  for (const entry of templates) {
    assert.equal(examples.get(entry.id).length, 1);
    const lesson = instantiateAlgebraLesson(entry, examples.get(entry.id)[0]);
    assert.equal(lesson.id, entry.id);
    assert.equal(lesson.exampleId, `${entry.id}-1`);
    const { exampleId: _exampleId, ...body } = lesson;
    assert.equal(_exampleId, `${entry.id}-1`);
    const hash = createHash('sha256')
      .update(JSON.stringify(canonical(body)))
      .digest('hex');
    assert.equal(hash, originalHashes[entry.id], entry.id);
    assert.ok(!JSON.stringify(lesson).includes('{{'));
  }
});

test('fixed-sign addition and subtraction templates update maths, notation, speech and explanations', () => {
  const added = make('add-both', { a: 5, b: 7 });
  assert.equal(added.title, 'x − 5 = 7');
  assert.equal(added.solution, 12);
  assert.equal(added.steps[4].right[0].spoken, '12');
  assert.match(added.steps[0].detail, /Add 5 on both sides/);
  assert.deepEqual(added.steps[3].cancel, ['original-three', 'added-left']);
  for (const [a, b, solution, tone] of [
    [5, 7, 2, 'original'],
    [5, 5, 0, 'original'],
    [5, 2, -3, 'negative'],
  ]) {
    const lesson = make('subtract-both', { a, b });
    assert.equal(lesson.solution, solution);
    assert.equal(lesson.steps.at(-1).right[0].tone, tone);
    assert.equal(lesson.steps.at(-1).right[0].latex, String(solution));
    assert.equal(
      lesson.steps.at(-1).right[0].spoken,
      solution < 0 ? 'minus 3' : String(solution),
    );
  }
});

test('other algebra templates regenerate counts, grouping and worked values for simple alternatives', () => {
  const divided = make('divide-three', { a: 2, b: 6 });
  assert.equal(divided.solution, 3);
  assert.equal(divided.steps[0].groups[1].items.length, 6);
  assert.equal(divided.steps[1].groups.length, 2);
  assert.ok(divided.steps[1].groups.every((group) => group.items.length === 4));
  const multiplied = make('multiply-four', { a: 3, b: 2 });
  assert.equal(multiplied.solution, 6);
  assert.match(multiplied.steps[0].title, /third/);
  assert.equal(multiplied.steps[1].groups.length, 3);
  assert.equal(multiplied.steps[2].groups[0].items.length, 6);
  const twoStep = make('two-step', { a: 3, b: 2, c: 11 });
  assert.equal(twoStep.solution, 3);
  assert.equal(twoStep.steps[3].groups.length, 3);
  assert.equal(twoStep.steps[4].groups[0].items.length, 4);
  const collected = make('like-terms', { a: 2, b: 2, c: 8 });
  assert.equal(collected.solution, 2);
  assert.equal(collected.steps[2].groups.length, 4);
  assert.equal(collected.steps[2].right[0].text, '8 ÷ 4');
  assert.equal(collected.steps.at(-1).right[0].text, '2');
  const distributed = make('distribute-three', { a: 2, b: 3 });
  assert.equal(distributed.steps[1].groups.length, 2);
  assert.equal(distributed.steps[3].left[1].text, '+ 6');
  assert.equal(distributed.steps[3].groups[1].items.length, 6);
  const substituted = make('substitution', { a: 2, b: 3, x: 5 });
  assert.equal(substituted.model.result, 13);
  assert.equal(substituted.steps[0].scene.groups.length, 3);
  assert.equal(substituted.steps[1].scene.groups[0].items.length, 5);
  assert.equal(substituted.steps.at(-1).scene.groups[0].items.length, 13);
  assert.match(substituted.steps[1].explanation, /twenty-five/);
});

test('invalid parameters, fractional groups, excessive tiles and executable template content are rejected', () => {
  for (const value of [0, -1, 1.5, '3', Infinity, 100])
    assert.throws(() => make('add-both', { a: value, b: 2 }));
  assert.throws(() => make('add-both', { a: 3, b: 2, extra: 1 }));
  assert.throws(() => make('divide-three', { a: 3, b: 5 }), /whole-number/);
  assert.throws(
    () => make('multiply-four', { a: 4, b: 12 }),
    /repetition|tiles/,
  );
  assert.throws(() => make('like-terms', { a: 5, b: 3, c: 24 }), /groups/);
  const invalid = structuredClone(template('add-both'));
  invalid.derived.answer = { eval: ['a', 'b'] };
  assert.throws(
    () => instantiateAlgebraLesson(invalid, examples.get('add-both')[0]),
    /Unsupported/,
  );
});

test('example identities are unique and generated lessons do not mutate templates or each other', () => {
  const collection = exampleCollection();
  collection.lessons[0].examples.push(
    structuredClone(collection.lessons[0].examples[0]),
  );
  assert.throws(
    () => validateAlgebraExamples(collection, templates),
    /Duplicate/,
  );
  const before = structuredClone(template('add-both'));
  const first = make('add-both', { a: 5, b: 7 });
  first.steps[0].left[0].text = 'changed';
  assert.equal(make('add-both', { a: 3, b: 2 }).steps[0].left[0].text, 'x');
  assert.deepEqual(template('add-both'), before);
  assert.throws(() =>
    instantiateAlgebraLesson(before, { id: 'wrong-1', values: { a: 3, b: 2 } }),
  );
});

function exampleCollection() {
  return {
    id: 'algebra',
    lessons: [...examples].map(([id, values]) => ({
      template: id,
      examples: structuredClone(values),
    })),
  };
}

test('additional curated examples keep one lesson entry and preserve its first example as the default', async () => {
  const collection = exampleCollection();
  collection.lessons
    .find((entry) => entry.template === 'add-both')
    .examples.push({ id: 'add-both-2', values: { a: 5, b: 7 } });
  const selected = validateAlgebraExamples(collection, templates).get(
    'add-both',
  )[1];
  assert.equal(
    instantiateAlgebraLesson(template('add-both'), selected).solution,
    12,
  );
  const areas = await createLoader(async (url) => ({
    ok: true,
    json: async () =>
      url.href.endsWith('/algebra-examples.json')
        ? collection
        : JSON.parse(await readFile(url, 'utf8')),
  })).load();
  const algebra = areas.find((area) => area.id === 'algebra');
  assert.equal(algebra.lessons.length, 8);
  assert.deepEqual(algebra.errors, []);
  assert.equal(algebra.lessons[0].exampleId, 'add-both-1');
  assert.equal(algebra.lessons[0].solution, 5);
});

test('missing algebra examples isolate algebra while other subjects still load', async (t) => {
  t.mock.method(console, 'error', () => {});
  const areas = await createLoader(async (url) => {
    if (url.href.endsWith('/algebra-examples.json'))
      throw new Error('Missing example file');
    return {
      ok: true,
      json: async () => JSON.parse(await readFile(url, 'utf8')),
    };
  }).load();
  assert.equal(areas.find((area) => area.id === 'algebra').lessons.length, 0);
  assert.ok(
    areas
      .filter((area) => area.id !== 'algebra')
      .every((area) => area.lessons.length > 0 && area.errors.length === 0),
  );
});
