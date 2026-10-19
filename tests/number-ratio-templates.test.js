import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import {
  instantiateLesson,
  validateExamples,
} from '../src/js/lesson-templates.js';
import { createLoader } from '../src/js/lesson-loader.js';
import { linearExpression } from '../src/js/mathematics.js';
import { counterTotal } from '../src/js/diagram-state.js';

const readJSON = async (path) =>
  JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const alternatives = await readJSON('./fixtures/template-cases.json');
const templates = new Map();
const examples = new Map();
for (const subject of ['number', 'ratio']) {
  const entries = (await readJSON(`../src/data/lessons/${subject}.json`))
    .lessons;
  templates.set(subject, entries);
  examples.set(
    subject,
    validateExamples(
      await readJSON(`../src/data/examples/${subject}.json`),
      entries,
      subject,
    ),
  );
}
const find = (id) =>
  [...templates.values()].flat().find((template) => template.id === id);
const make = (id, values) =>
  instantiateLesson(find(id), { id: `${id}-2`, values });
const alternate = (id) => make(id, alternatives[find(id).subjectArea][id]);
const last = (lesson) => lesson.steps.at(-1);
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
  brackets: '2fb53090d7040114ba7f00c09144b13cdd9c6c8ee4a0e886e9dd8512b26ad76d',
  'subtract-five':
    'fef6da185200064963fa4103d68579290bd568df16db9fcd16109f9d21c6f805',
  'add-negative':
    '82f67c1fe151122a3b0b8ef98bf87b93d7c64d1e697abbe2812abfc25c0b3c67',
  'multiply-before-add':
    'af41fa6f074fc5aa318114936c8f44d171e3f64b269c18fc2eeedd13f3c0e482',
  'equivalent-halves':
    '753db76b535752e7d10a22202b887666e3e120b05acc90373b6d950476ac73d8',
  'fraction-amount':
    '945e538d24442285ae1cb8b654f1614b762b89566de3ff98cec28e40d15e454b',
  'percentage-amount':
    '655f29ad2c2be4a4d2e99685adb26f94a609e7bdb27a0971bb209aeb538758f3',
  'add-sixths':
    '1870a72686a87cd9136fe1cc4374b05dc7816ee74142240629f04a5fe58d5b96',
  'square-three':
    '2c2df23b1d82fba4a153615b3c95f0418550f257bbd8ba5dcb51d169759164e4',
  'cube-two':
    '3fb53359c609a5a5c95179697710f66ea30f50fbc4834d3930ef08c41fb1fbcb',
  'square-root-25':
    '0a096759de63643a34edc40b7221b9d1417501e749fc524d6a857e7f218fee76',
  'zero-power':
    '0c7f56e3d254790f3e586701145dc62c8e7770c423c69135c6aaf0ae1cfb8b48',
  'multiply-powers':
    '0ef681b597624b0c0f809cb4715631e95ace12569cbc87d12b56975415ccf7fc',
  'prime-factors':
    '4c634b9007b4624ae0e2501eb5e94e633ff40e0084d78eb0429de6856cffc679',
  'place-value-ten':
    'b2d05754db73846371bbc9ec6febe23cfbffbe43c2f18348f3008701b8c5533b',
  'share-ratio':
    '5d9dcda99ca224dd3b9bc4e8adcfa95f698ef7bbc9f8fb6aaebcf546791b1504',
  'equivalent-ratio':
    'e46780fa95b5e46fdb476ce44446cc55d127a4ee7a5812cba9568533de98efd8',
  'simplify-ratio':
    '9c448696001b096ab80b0e423a577f04ab326d907242e57c81b35aa0793199c4',
  'unitary-cost':
    '31969c8f5916eae09d76a7029b12936db6f220b0227066fc4d289e073fbd9121',
};

test('all 19 Number and Ratio templates reproduce their complete original example states', () => {
  assert.equal([...templates.values()].flat().length, 28);
  for (const [subject, entries] of templates)
    for (const template of entries.filter((template) =>
      Object.hasOwn(originalHashes, template.id),
    )) {
      const curated = examples.get(subject).get(template.id);
      assert.equal(curated.length, 1);
      const lesson = instantiateLesson(template, curated[0]);
      assert.equal(lesson.exampleId, `${template.id}-1`);
      const body = structuredClone(lesson);
      delete body.exampleId;
      assert.equal(
        createHash('sha256')
          .update(JSON.stringify(canonical(body)))
          .digest('hex'),
        originalHashes[template.id],
        template.id,
      );
    }
});

test('every template generates a different simple example without unresolved parameters', () => {
  for (const [subject, cases] of Object.entries(alternatives).filter(
    ([subject]) => ['number', 'ratio'].includes(subject),
  ))
    for (const [id, values] of Object.entries(cases)) {
      const before = structuredClone(find(id));
      const lesson = make(id, values);
      assert.equal(lesson.subjectArea, subject);
      assert.equal(lesson.exampleId, `${id}-2`);
      assert.ok(!JSON.stringify(lesson).includes('{{'), id);
      assert.deepEqual(find(id), before);
    }
});

test('order-of-operations templates keep expressions, intermediate workings and prose consistent', () => {
  const brackets = alternate('brackets');
  assert.equal(brackets.title, '4 × (1 + 2)');
  assert.equal(brackets.steps[1].explanation, 'First, focus on 1 + 2.');
  assert.equal(brackets.steps[2].working, '1 + 2 = 3');
  assert.equal(
    brackets.steps[2].explanation,
    '1 + 2 = 3. Replace the bracketed group with 3.',
  );
  assert.equal(last(brackets).left[0].text, '12');
  assert.equal(last(brackets).explanationContent[0].latex, '4 \\times  3 = 12');
  const multiplication = alternate('multiply-before-add');
  assert.equal(multiplication.steps[0].title, 'Look at the two operations');
  assert.equal(
    multiplication.steps[1].explanation,
    'Work out 2 × 4 before adding 3.',
  );
  assert.equal(
    multiplication.steps[2].explanation,
    '2 × 4 is 8. Now we have 3 + 8.',
  );
  assert.equal(last(multiplication).left[0].text, '11');
  for (const lesson of [brackets, multiplication]) {
    assert.equal(
      linearExpression(lesson.title).constant,
      Number(last(lesson).left[0].text),
    );
  }
});

test('number-line templates generate one move per unit with correct positions and crossing-zero explanations', () => {
  for (const id of ['subtract-five', 'add-negative']) {
    for (const values of [
      { a: 3, b: 4 },
      { a: 2, b: 2 },
      { a: 5, b: 2 },
    ]) {
      const lesson = make(id, values);
      assert.equal(lesson.steps.length, values.b + 2);
      assert.deepEqual(
        lesson.steps.slice(0, -1).map((step) => step.position),
        Array.from({ length: values.b + 1 }, (_, index) => values.a - index),
      );
      assert.equal(last(lesson).position, values.a - values.b);
      assert.equal(
        last(lesson).left[0].tone,
        values.a < values.b ? 'negative' : 'original',
      );
      for (const step of lesson.steps.slice(1, -1))
        assert.equal(Boolean(step.detail), step.position < 0);
    }
  }
});

test('fraction and percentage examples preserve the whole, equal parts and selected quantities', () => {
  const halves = alternate('equivalent-halves');
  assert.equal(halves.title, '1/2 = 3/6');
  assert.ok(
    halves.steps.every((step) =>
      step.bars.every((bar) => bar.shaded / bar.parts === 0.5),
    ),
  );
  const fraction = alternate('fraction-amount');
  assert.equal(fraction.model.result, 8);
  assert.equal(fraction.steps[1].scene.groups.length, 3);
  assert.ok(
    fraction.steps.every((step) => counterTotal(step.scene.groups) === 12),
  );
  assert.equal(
    last(fraction)
      .scene.groups.flatMap((group) => group.items)
      .filter((item) => item.highlight).length,
    8,
  );
  assert.equal(fraction.title, 'Two thirds of 12');
  const percentage = alternate('percentage-amount');
  assert.equal(
    percentage.steps[0].left[0].latex,
    '25\\%=\\frac{25}{100}=\\frac{1}{4}',
  );
  assert.ok(
    percentage.steps.every((step) => counterTotal(step.scene.groups) === 40),
  );
  assert.equal(
    last(percentage)
      .scene.groups.flatMap((group) => group.items)
      .filter((item) => item.highlight)
      .reduce((sum, item) => sum + item.value, 0),
    10,
  );
  const eighths = alternate('add-sixths');
  assert.equal(last(eighths).left[0].latex, '\\frac{4}{8}=\\frac{1}{2}');
  assert.equal(
    last(eighths).scene.groups[0].items.filter((item) => item.highlight).length,
    4,
  );
  assert.equal(last(eighths).scene.groups[0].items.length, 8);
  assert.equal(
    make('add-sixths', { b: 1 }).steps[2].title,
    'Add one more quarter',
  );
});

test('arrays, powers, factor trees and digit shifts regenerate their underlying mathematical models', () => {
  const square = alternate('square-three');
  assert.equal(square.steps.length, 6);
  assert.deepEqual(
    square.steps.slice(1, -1).map((step) => step.scene.visibleRows),
    [1, 2, 3, 4],
  );
  assert.equal(square.model.result, 16);
  const cube = alternate('cube-two');
  assert.equal(cube.steps.length, 5);
  assert.deepEqual(
    cube.steps.slice(1, -1).map((step) => step.scene.visibleLayers),
    [1, 2, 3],
  );
  assert.equal(cube.steps[2].left[0].latex, '2\\times9=18');
  assert.equal(last(cube).scene.layers, 3);
  assert.equal(cube.model.result, 27);
  assert.equal(alternate('square-root-25').model.result, 16);
  const zero = alternate('zero-power');
  assert.equal(zero.steps[0].left[0].latex, '3^3=27');
  assert.equal(last(zero).left[0].latex, '\\frac{3}{3}=1=3^0');
  const powers = alternate('multiply-powers');
  assert.equal(powers.model.result, 243);
  assert.deepEqual(powers.model.exponents, [3, 2]);
  assert.equal(last(powers).scene.groups[0].items.length, 5);
  assert.ok(
    last(powers).scene.groups[0].items.every((item) => item.value === 3),
  );
  const factors = alternate('prime-factors');
  assert.equal(factors.model.value, 12);
  assert.deepEqual(factors.model.primeFactors, [3, 2, 2]);
  assert.equal(
    last(factors).scene.description,
    'Visible factor nodes: 12, 3, 4, 2, 2. Selected prime factors: 3, 2, 2.',
  );
  assert.equal(last(factors).left[0].latex, '12=3\\times2\\times2=3\\times2^2');
  const digits = alternate('place-value-ten');
  assert.equal(digits.model.initial, 2.5);
  assert.equal(digits.model.result, 25);
  assert.deepEqual(
    last(digits).scene.digits.map((digit) => [digit.digit, digit.place]),
    [
      [2, 1],
      [5, 0],
    ],
  );
});

test('ratio examples preserve equal shares, scale both sides, simplify fully and keep a constant unit cost', () => {
  const shared = alternate('share-ratio');
  assert.deepEqual(shared.model.shares, [4, 8]);
  assert.equal(shared.steps[1].scene.groups.length, 3);
  assert.equal(shared.steps[3].title, 'Give A one part');
  assert.equal(
    shared.steps[3].explanation,
    'A gets one part. One group of four makes four.',
  );
  assert.ok(
    shared.steps.every((step) => counterTotal(step.scene.groups) === 12),
  );
  const equivalent = alternate('equivalent-ratio');
  assert.deepEqual(equivalent.model.ratio, [3, 4]);
  assert.deepEqual(
    last(equivalent).scene.groups.map((group) => group.items.length),
    [6, 8],
  );
  assert.equal(
    last(equivalent)
      .scene.groups.flatMap((group) => group.items)
      .filter((item) => item.highlight).length,
    7,
  );
  const simplified = alternate('simplify-ratio');
  assert.deepEqual(simplified.model.ratio, [2, 3]);
  assert.equal(simplified.steps[1].scene.groups.length, 5);
  assert.ok(
    simplified.steps[1].scene.groups.every((group) => group.items.length === 2),
  );
  assert.equal(last(simplified).left[0].latex, '\\frac{4}{2}:\\frac{6}{2}=2:3');
  const cost = alternate('unitary-cost');
  assert.equal(cost.model.unitPrice, 3);
  assert.equal(cost.model.result, 9);
  assert.equal(last(cost).scene.groups.length, 3);
  assert.equal(counterTotal(last(cost).scene.groups), 9);
  assert.equal(cost.steps[1].left[0].latex, '\\frac{\\pounds6}{2}=\\pounds3');
});

test('invalid, fractional, out-of-bounds or misleading Number and Ratio examples are rejected', () => {
  assert.throws(() => make('subtract-five', { a: 1, b: 8 }), /number line/);
  assert.throws(() => make('equivalent-halves', { scale: 7 }), /parameter/);
  assert.throws(
    () => make('fraction-amount', { numerator: 3, denominator: 3, total: 12 }),
    /fewer/,
  );
  assert.throws(
    () => make('fraction-amount', { numerator: 2, denominator: 3, total: 10 }),
    /whole-number/,
  );
  assert.throws(() => make('percentage-amount', { total: 41 }), /whole-number/);
  assert.throws(() => make('cube-two', { base: 4 }), /parameter/);
  assert.throws(() => make('prime-factors', { p: 4, q: 3 }), /parameter/);
  assert.throws(() => make('share-ratio', { a: 2, b: 4, total: 12 }), /parts/);
  assert.throws(
    () => make('share-ratio', { a: 2, b: 2, total: 12 }),
    /simplest/,
  );
  assert.throws(() => make('simplify-ratio', { a: 5, b: 7 }), /common factor/);
  assert.throws(
    () => make('unitary-cost', { items: 3, cost: 10, wanted: 4 }),
    /whole-number/,
  );
  assert.throws(() => make('zero-power', { base: 0 }), /parameter/);
});

test('Number and Ratio examples load under project subpaths, keep their defaults and isolate a missing collection', async (t) => {
  t.mock.method(console, 'error', () => {});
  const requests = [];
  const loader = createLoader(async (url) => {
    requests.push(url.pathname);
    return {
      ok: true,
      json: async () =>
        readJSON(`../src/data/${url.pathname.split('/data/').at(-1)}`),
    };
  }, new URL('https://example.com/maths/data/manifest.json'));
  const areas = await loader.load();
  await loader.load();
  assert.equal(requests.length, 13);
  assert.ok(requests.every((path) => path.startsWith('/maths/data/')));
  for (const subject of ['number', 'ratio'])
    assert.ok(
      areas
        .find((area) => area.id === subject)
        .lessons.every((lesson) => lesson.exampleId === `${lesson.id}-1`),
    );
  for (const subject of ['number', 'ratio']) {
    const failed = await createLoader(async (url) => {
      if (url.href.endsWith(`/examples/${subject}.json`))
        throw new Error('Unavailable');
      return {
        ok: true,
        json: async () => JSON.parse(await readFile(url, 'utf8')),
      };
    }).load();
    assert.equal(failed.find((area) => area.id === subject).lessons.length, 0);
    assert.ok(
      failed
        .filter((area) => area.id !== subject)
        .every((area) => area.lessons.length > 0),
    );
  }
});
