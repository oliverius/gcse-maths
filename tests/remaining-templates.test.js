import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import {
  instantiateLesson,
  validateExamples,
} from '../src/js/lesson-templates.js';
import { createLoader } from '../src/js/lesson-loader.js';
import { validateManifest } from '../src/js/lesson-validation.js';
import { counterTotal } from '../src/js/diagram-state.js';

const readJSON = async (path) =>
  JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const cases = await readJSON('./fixtures/template-cases.json');
const templates = new Map();
const examples = new Map();
for (const subject of ['geometry', 'probability', 'statistics']) {
  const lessons = (await readJSON(`../src/data/lessons/${subject}.json`))
    .lessons;
  templates.set(subject, lessons);
  examples.set(
    subject,
    validateExamples(
      await readJSON(`../src/data/examples/${subject}.json`),
      lessons,
      subject,
    ),
  );
}
const find = (id) =>
  [...templates.values()].flat().find((template) => template.id === id);
const make = (id, values = cases[find(id).subjectArea][id]) =>
  instantiateLesson(find(id), { id: `${id}-2`, values });
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
  'straight-line':
    '3ce2789680ee396bc8e1598d172fd7318ced077f1f2eec012f66ffcf0d3413b6',
  'rectangle-area':
    '8dfce52437eb8c556450b7a22212ea100ecc1bc4aac10636b087ea4cff5d0f1d',
  'angles-point':
    '4405beab9ac209cf5c4036fa9d16ef9b3a157cbdd553224e812f6c3be0c1efe0',
  'rectangle-perimeter':
    '5db972c8da989f7905dc7356dbd04dbc514c93c04c4f614e3d7a218468737771',
  'triangle-area':
    'd557ec7912a8855e0386ed998efbce9801595ff12058e53101c12e211fb6b516',
  'pythagoras-areas':
    'd4d292b2db3cb5c4e873eefe26cf0dc6eb7ad1f397082379ba8a27e4cd8d4cf7',
  'pythagoras-hypotenuse':
    '12393e27eeba6600e4b153eaa824bc780666f97ce89b21a69f0482e60c702354',
  'pythagoras-shorter':
    'ba9228347de0c0005758a62a83d3197c7abe7678f5dd5e83db64d727356c070c',
  'equally-likely':
    '0c71f5b7588f1a5c7b29ce6924ad6d02c6cb1e5f46fda72b16ab5fc2ccd31231',
  complement:
    '43030efeaf377743926dbe519766c662f31c234155e14d3704137699e25de91f',
  'probability-scale':
    '846ca9a71c06ad2ac614ad86d0773df828a38d09de428a76b47fa86878600721',
  'coin-spinner-space':
    'e8a652f6dd7b90e5627d248b2a8a0e42a3019d84414bc049b64e8a077bb38735',
  mean: 'b4956aa5f171c5d7b1c4e1af9f443b389f27163d6118f66e8c6ffb841d593bb1',
  median: '415ca67e189ea142fcc9396b70d5e5b76ec05db070deeba94b2db98051439701',
  mode: 'a1d90fa1f6752626d6843a5c010fff8ee68ed8c2cdb8b5991b964810d6b0f1fd',
  range: '77fffb7103c1566def9da4f10bc6ec26f9bb0ac9604d97bf7d2829ed0859d62f',
  'read-bar-chart':
    '87cae57fc6e9f5a172730ba5073f05d622df234e1b529ee7cec7df92212cad47',
};

test('all 17 remaining templates preserve the original teaching states, wording and identities exactly', () => {
  assert.equal([...templates.values()].flat().length, 17);
  for (const [subject, lessons] of templates)
    for (const template of lessons) {
      const collection = examples.get(subject).get(template.id);
      assert.equal(collection.length, 1);
      const lesson = instantiateLesson(template, collection[0]);
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

test('every remaining template generates an alternate example without changing the source template', () => {
  for (const entries of templates.values())
    for (const template of entries) {
      const before = structuredClone(template);
      const lesson = make(template.id);
      assert.ok(!JSON.stringify(lesson).includes('{{'), template.id);
      assert.deepEqual(template, before);
    }
});

test('angle, area and perimeter examples retain exact geometry and matching worked numbers', () => {
  for (const id of ['straight-line', 'angles-point']) {
    const lesson = make(id);
    const sectors = last(lesson).scene.sectors;
    assert.equal(sectors[0].start, 0);
    assert.equal(sectors.at(-1).end, lesson.model.total);
    assert.deepEqual(
      sectors.map((sector) => sector.end - sector.start),
      lesson.model.angles,
    );
  }
  const rectangle = make('rectangle-area');
  assert.equal(rectangle.model.result, 8);
  assert.deepEqual(
    rectangle.steps.slice(1, -1).map((step) => step.scene.rows),
    [1, 2],
  );
  assert.equal(last(rectangle).left[0].latex, '4\\times2=8');
  const perimeter = make('rectangle-perimeter');
  assert.equal(perimeter.model.result, 16);
  assert.equal(
    perimeter.steps[0].explanation,
    'Walk around the outside. Count each of the four sides once.',
  );
  assert.equal(last(perimeter).left[0].latex, '5+3+5+3=16');
  const triangle = make('triangle-area');
  assert.equal(triangle.model.result, 6);
  assert.equal(last(triangle).left[0].latex, '\\frac{12}{2}=6');
});

test('Pythagoras templates preserve whole-number triangles and reveal unknown lengths only at the final step', () => {
  const areas = make('pythagoras-areas');
  assert.deepEqual(areas.model, { a: 4, b: 3, c: 5 });
  assert.equal(areas.steps[4].left[0].latex, '16+9=25');
  for (const id of ['pythagoras-hypotenuse', 'pythagoras-shorter']) {
    const lesson = make(id);
    const { a, b, c } = lesson.model;
    assert.equal(a * a + b * b, c * c);
    const unknown = id === 'pythagoras-hypotenuse' ? 'c' : 'a';
    assert.ok(
      lesson.steps
        .slice(0, -1)
        .every((step) => !step.scene.knownSides.includes(unknown)),
    );
    assert.ok(last(lesson).scene.knownSides.includes(unknown));
  }
  assert.equal(
    last(make('pythagoras-hypotenuse')).left[0].latex,
    'c=\\sqrt{169}=13',
  );
  assert.equal(last(make('pythagoras-shorter')).left[0].latex, 'a=\\sqrt{9}=3');
});

test('bag probabilities and complements count every equally likely outcome with matching highlights and speech', () => {
  const likely = make('equally-likely');
  assert.deepEqual(likely.model, { favourable: 2, total: 5 });
  assert.equal(last(likely).left[0].latex, 'P(\\text{blue})=\\frac{2}{5}');
  assert.equal(
    last(likely).left[0].spoken,
    'probability of blue equals two fifths',
  );
  assert.equal(
    last(likely).scene.groups[0].items.filter((item) => item.highlight).length,
    2,
  );
  const complement = make('complement');
  assert.equal(complement.model.complement, 3);
  assert.equal(
    complement.steps[1].scene.groups[0].items.filter((item) => item.highlight)
      .length,
    3,
  );
  assert.equal(last(complement).left[0].latex, '\\frac{2}{5}+\\frac{3}{5}=1');
  assert.equal(
    last(complement).left[0].spoken,
    'two fifths plus three fifths equals one',
  );
  const scale = make('probability-scale');
  assert.deepEqual(
    scale.steps.map((step) => step.scene.probability),
    [0, 0.2, 0.5, 0.8, 1],
  );
  assert.equal(scale.steps[1].left[0].latex, '\\frac{1}{5}');
  assert.equal(scale.steps[3].left[0].latex, '\\frac{4}{5}');
});

test('coin/spinner examples change labels, column names and the selected pair together', () => {
  const lesson = make('coin-spinner-space');
  for (const step of lesson.steps) {
    assert.deepEqual(step.scene.columns, ['2', '3', '4']);
    assert.deepEqual(step.scene.columnNames, {
      2: 'spinner two',
      3: 'spinner three',
      4: 'spinner four',
    });
  }
  assert.deepEqual(
    lesson.steps.slice(1, 7).map((step) => step.left[0].latex),
    ['(H,2)', '(H,3)', '(H,4)', '(T,2)', '(T,3)', '(T,4)'],
  );
  assert.deepEqual(last(lesson).scene.selected, ['H-4']);
  assert.equal(last(lesson).left[0].latex, 'P(H,4)=\\frac{1}{6}');
  assert.match(lesson.tutorNotes.checkQuestion, /heads and four/);
});

test('mean templates move one stable counter at a time and conserve the total for every move count', () => {
  for (const distance of [1, 2, 3]) {
    const lesson = make('mean', { mean: 5, distance });
    assert.equal(lesson.steps.length, distance + 2);
    assert.ok(
      lesson.steps.every((step) => counterTotal(step.scene.groups) === 15),
    );
    const ids = lesson.steps[0].scene.groups
      .flatMap((group) => group.items.map((item) => item.id))
      .sort();
    for (let index = 1; index <= distance; index++) {
      const before = lesson.steps[index - 1].scene.groups;
      const after = lesson.steps[index].scene.groups;
      assert.equal(after[0].items.length, before[0].items.length + 1);
      assert.equal(after[2].items.length, before[2].items.length - 1);
      assert.deepEqual(
        after.flatMap((group) => group.items.map((item) => item.id)).sort(),
        ids,
      );
    }
    assert.deepEqual(
      last(lesson).scene.groups.map((group) => group.items.length),
      [5, 5, 5],
    );
  }
});

test('statistical rank patterns keep sorting, median, mode, range, selections and chart readings correct', () => {
  const median = make('median');
  const sorted = [...median.model.values].sort((a, b) => a - b);
  assert.deepEqual(
    median.steps[1].scene.items.map((item) => item.value),
    sorted,
  );
  assert.equal(median.model.result, sorted[2]);
  assert.equal(
    last(median).scene.items.find((item) =>
      last(median).scene.selected.includes(item.id),
    ).value,
    6,
  );
  const mode = make('mode');
  assert.equal(mode.model.result, 3);
  assert.match(last(mode).explanation, /repeated value three/);
  assert.doesNotMatch(last(mode).explanation, /three, not three/);
  assert.equal(last(mode).scene.selected.length, 3);
  const range = make('range');
  assert.equal(
    range.model.result,
    Math.max(...range.model.values) - Math.min(...range.model.values),
  );
  assert.equal(last(range).left[0].latex, '13-2=11');
  for (const lesson of [median, mode, range]) {
    const initial = new Map(
      lesson.steps[0].scene.items.map((item) => [item.id, item.value]),
    );
    assert.ok(
      lesson.steps.every((step) =>
        step.scene.items.every((item) => initial.get(item.id) === item.value),
      ),
    );
  }
  const chart = make('read-bar-chart');
  assert.equal(chart.model.result, 3);
  assert.equal(
    last(chart).scene.categories.find(
      (category) => category.id === last(chart).scene.active,
    ).value,
    3,
  );
  assert.equal(last(chart).left[0].latex, '\\text{Dogs}:3');
});

test('invalid geometry, probability classifications, target outcomes and statistical ranks are rejected', () => {
  assert.throws(
    () => make('triangle-area', { base: 3, height: 3 }),
    /whole-number/,
  );
  assert.throws(() => make('straight-line', { angle: 180 }), /parameter/);
  assert.throws(
    () => make('pythagoras-hypotenuse', { a: 3, b: 3 }),
    /whole-number/,
  );
  assert.throws(() => make('pythagoras-shorter', { b: 12, c: 5 }), /range/);
  assert.throws(
    () => make('probability-scale', { blue: 2, gold: 3 }),
    /unlikely/,
  );
  assert.throws(
    () => make('coin-spinner-space', { first: 3, target: 2 }),
    /outcome/,
  );
  assert.throws(() => make('mean', { mean: 3, distance: 3 }), /positive/);
  assert.throws(
    () => make('median', { a: 1, b: 3, c: 3, d: 8, e: 10 }),
    /ascending/,
  );
  assert.throws(() => make('mode', { low: 1, mode: 3, high: 3 }), /between/);
  assert.throws(
    () => make('range', { min: 2, b: 4, c: 7, d: 7, max: 13 }),
    /ordered/,
  );
  assert.throws(
    () => make('read-bar-chart', { cats: 2, dogs: 7, fish: 3 }),
    /parameter/,
  );
});

test('matching lesson/example filenames stay distinct, cached and safe under a project subpath', async () => {
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
  assert.equal(new Set(requests).size, 13);
  for (const area of areas) {
    assert.ok(requests.includes(`/maths/data/lessons/${area.id}.json`));
    assert.ok(requests.includes(`/maths/data/examples/${area.id}.json`));
    assert.deepEqual(area.errors, []);
    assert.ok(
      area.lessons.every((lesson) => lesson.exampleId === `${lesson.id}-1`),
    );
  }
  const manifest = await readJSON('../src/data/manifest.json');
  for (const field of ['file', 'examples']) {
    const bad = structuredClone(manifest);
    bad.areas[0][field] = '../outside.json';
    assert.throws(() => validateManifest(bad), /curriculum/);
    bad.areas[0][field] =
      `./${field === 'file' ? 'lessons' : 'examples'}/algebra.json`;
    assert.throws(() => validateManifest(bad), /curriculum/);
  }
});
