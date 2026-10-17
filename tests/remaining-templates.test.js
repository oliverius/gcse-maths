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
// Fingerprints of the complete original lessons, captured before conversion.
const originalHashes = {
  'straight-line':
    '2461b72856a259a40fe7b553a6ec84364fceed89cced34f587f43759971460c8',
  'rectangle-area':
    '3cb0f8861b55449b7d007f4d1f08b5900144c29f825f98241ea708d3a4f84968',
  'angles-point':
    '9d361493214784baecdaf1cf6b76d5d9e532578f7d74fec91f1c3ef341a1f340',
  'rectangle-perimeter':
    'c54dbe8ad8c6d3a8f610d84271d384128d4fc3dcbc4f07bb3b90452a41e9d41d',
  'triangle-area':
    'e08366a6798b0c4ee0d736fd1c45bdaea3f1833c7e52c6098148daf5b3f63ba8',
  'pythagoras-areas':
    'd54ce046fee0559513a1c0d4090304723f0baf00736957d10b0993a16846badf',
  'pythagoras-hypotenuse':
    '8d1bc4fe4f9644623f9000c3bacf6a001be5749fb1ee48a0fd38850c621fd1d7',
  'pythagoras-shorter':
    '78e20858cecc65c3338e490e8b3a72627d40719788621e30506e1c2a2cb285ab',
  'equally-likely':
    '068c5e1b12e8172678ecc4d2710f70b217b22de4b93dcb2f67775b43ce10cbe9',
  complement:
    '0e704655af3af968f19d49f8313b4f1a3bf53913b335870f1ae6021370cc2596',
  'probability-scale':
    '588e6410a88716f24747c94f8210ac40f8fb13c15d7680553e515a1fd2494f80',
  'coin-spinner-space':
    '76284d5c77f09615b40777610072f922a4f1f9083a999705192a1c4b325ad4d1',
  mean: 'a52bfab918b76896533ad504c43eccd07f1cdd61bb146714b79df3c457bf5773',
  median: '5990e1aa95f2c02e451e53ecc320f24540582667f5a617336f48a93c77415e43',
  mode: 'a7cef1094861e3eb2b516e640053c692cbc93aaa4ceefa3b18672da68f19f2a3',
  range: 'e3121634b3b7bfea4a7fb348a5425ebe6760ecb4b9e0a7e05e627efe7a220c7e',
  'read-bar-chart':
    'd88b7e1dc6e468c1f65078950f7004ba490b44a2d1e74617c3c822f30d963958',
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
