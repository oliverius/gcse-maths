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
const templates = (await readJSON('lessons/algebra.json')).lessons;
const examples = validateAlgebraExamples(
  await readJSON('examples/algebra.json'),
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

// Original complete lesson fingerprints, refreshed for Edexcel curriculum metadata.
const originalHashes = {
  'add-both':
    '9fc5a2bf62a17c5e7773bdb36658d3b683af33596111d3d7080fefd4fc90310c',
  'subtract-both':
    '3c4a72d2ff4e0a61516906ddfd2af0c58983888b2f779252d3915e2834995b89',
  'divide-three':
    '323185e6cde7fd160d730bdee651db070b518dabfd7ef87ccba21f7eed343233',
  'multiply-four':
    'e642dfe846c1d93cf4caffc197a79a000a6d2ea616aa16c1ce14a8582a957505',
  'two-step':
    '58b1a166f33cfcc64e976dadfb96e8f27927831afa459e9360f61c3552a1ae06',
  'like-terms':
    '7a45c40a7b01009f2cbf11fe1bc4454531ab5defc7c0c5226d086a5bf41e8f79',
  'distribute-three':
    '243b06997f7f29087300476fac2eef7a455e86862afa3fab9445c9676b11d311',
  substitution:
    '3ce5c2711e4d3f86c7ca25e51e0e519c8d25a663a3d6d978f397dd8a9411a080',
};

test('every algebra template retains exactly its original curated example and complete teaching states', () => {
  assert.equal(templates.length, 11);
  for (const entry of templates.filter((entry) =>
    Object.hasOwn(originalHashes, entry.id),
  )) {
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
      url.href.endsWith('/examples/algebra.json')
        ? collection
        : JSON.parse(await readFile(url, 'utf8')),
  })).load();
  const algebra = areas.find((area) => area.id === 'algebra');
  assert.equal(algebra.lessons.length, 11);
  assert.deepEqual(algebra.errors, []);
  assert.equal(algebra.lessons[0].exampleId, 'add-both-1');
  assert.equal(algebra.lessons[0].solution, 5);
});

test('missing algebra examples isolate algebra while other subjects still load', async (t) => {
  t.mock.method(console, 'error', () => {});
  const areas = await createLoader(async (url) => {
    if (url.href.endsWith('/examples/algebra.json'))
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
