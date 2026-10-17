import { validateNotation } from './notation.js';
import { learningOperations, validateLearningScene } from './learning-state.js';
export const diagramOperations = {
  'counter-groups': [
    'show',
    'group',
    'split',
    'distribute',
    'highlight',
    'simplify',
    'replace',
  ],
  'angle-diagram': ['show', 'highlight', 'replace', 'simplify'],
  'shape-grid': ['show', 'highlight', 'partition', 'simplify'],
  'data-cards': ['show', 'group', 'highlight', 'simplify'],
  'bar-chart': ['show', 'highlight', 'simplify'],
  'probability-scale': ['show', 'move'],
  ...learningOperations,
};
const require = (condition, message) => {
  if (!condition) throw new Error(message);
};
const finite = (value) => typeof value === 'number' && Number.isFinite(value);
const integer = (value, min, max) =>
  Number.isInteger(value) && value >= min && value <= max;
export function counterTotal(groups) {
  return groups.reduce(
    (sum, g) => sum + g.items.reduce((n, item) => n + item.value, 0),
    0,
  );
}
export function validateDiagram(lesson, state) {
  const s = state.scene;
  require(s &&
    typeof s === 'object' &&
    typeof s.description === 'string' &&
    s.description.length > 0, 'Missing diagram description.');
  require(s.caption === undefined ||
    typeof s.caption === 'string', 'Invalid caption.');
  if (learningOperations[lesson.kind]) validateLearningScene(lesson, state);
  if (lesson.kind === 'counter-groups') {
    require(Array.isArray(s.groups) &&
      s.groups.length >= 1 &&
      s.groups.length <= 5, 'Invalid counter groups.');
    const ids = [];
    for (const group of s.groups) {
      require(typeof group.id === 'string' &&
        typeof group.label === 'string' &&
        group.label.length <= 24 &&
        Array.isArray(group.items) &&
        group.items.length <= 24, 'Invalid counter group.');
      require(group.summary === undefined ||
        typeof group.summary === 'string', 'Invalid group summary.');
      ids.push(group.id);
      // Renderer capacity depends on the width of each group.
      const columns = Math.min(
        6,
        Math.max(1, Math.floor((720 / s.groups.length - 24) / 39)),
      );
      require(Math.ceil(group.items.length / columns) <=
        4, 'Too many counters for readable groups.');
      for (const item of group.items) {
        require(typeof item.id === 'string' &&
          finite(item.value) &&
          item.value > 0, 'Invalid counter value.');
        require(item.tone === undefined ||
          ['original', 'operation', 'negative'].includes(
            item.tone,
          ), 'Invalid counter colour.');
        require(item.highlight === undefined ||
          typeof item.highlight === 'boolean', 'Invalid counter highlight.');
        require(item.category === undefined ||
          ['blue', 'gold'].includes(
            item.category,
          ), 'Invalid counter category.');
        validateNotation(item);
        ids.push(item.id);
      }
    }
    require(new Set(ids).size === ids.length, 'Duplicate counter identity.');
    if (lesson.model?.total !== undefined)
      require(counterTotal(s.groups) ===
        lesson.model.total, 'Counter total changed.');
    if (lesson.model?.ratio) {
      const totals = ['A', 'B'].map((category) =>
        counterTotal(s.groups.filter((g) => g.category === category)),
      );
      require(totals[0] > 0 &&
        totals[1] > 0 &&
        totals[0] * lesson.model.ratio[1] ===
          totals[1] * lesson.model.ratio[0], 'Ratio is not equivalent.');
    }
  }
  if (lesson.kind === 'angle-diagram') {
    require([180, 360].includes(s.total) &&
      Array.isArray(s.sectors) &&
      s.sectors.length > 0, 'Invalid angle diagram.');
    let end = 0;
    const ids = [];
    for (const sector of s.sectors) {
      require(typeof sector.id === 'string' &&
        finite(sector.start) &&
        finite(sector.end) &&
        sector.start === end &&
        sector.end > sector.start &&
        sector.end <= s.total &&
        sector.end - sector.start < 360 &&
        typeof sector.known ===
          'boolean', 'Invalid or overlapping angle sector.');
      end = sector.end;
      ids.push(sector.id);
    }
    require(new Set(ids).size === ids.length, 'Duplicate angle identity.');
    if (state.operation.type === 'simplify')
      require(end === s.total &&
        s.sectors.every((a) => a.known), 'Incomplete angle total.');
  }
  if (lesson.kind === 'shape-grid') {
    require(['rectangle', 'triangle'].includes(s.shape) &&
      integer(s.width, 1, 8) &&
      integer(s.height, 1, 5), 'Invalid shape dimensions.');
    require(s.rows === undefined ||
      integer(s.rows, 0, s.height), 'Invalid shaded rows.');
    require(['grid', 'copy'].every(
      (key) => s[key] === undefined || typeof s[key] === 'boolean',
    ), 'Invalid shape state.');
    require(s.sides === undefined ||
      (Array.isArray(s.sides) &&
        s.sides.every((id) =>
          ['top', 'right', 'bottom', 'left'].includes(id),
        )), 'Invalid boundary segment.');
  }
  if (lesson.kind === 'data-cards') {
    require(Array.isArray(s.items) &&
      s.items.length >= 3 &&
      s.items.length <= 6 &&
      s.items.every(
        (i) => typeof i.id === 'string' && finite(i.value),
      ), 'Invalid data set.');
    const ids = s.items.map((i) => i.id);
    require(new Set(ids).size === ids.length &&
      Array.isArray(s.selected) &&
      s.selected.every((id) => ids.includes(id)) &&
      Array.isArray(s.muted) &&
      s.muted.every((id) => ids.includes(id)), 'Invalid data selection.');
    require(Array.isArray(lesson.model?.values) &&
      JSON.stringify(s.items.map((i) => i.value).sort((a, b) => a - b)) ===
        JSON.stringify(
          [...lesson.model.values].sort((a, b) => a - b),
        ), 'The data set changed.');
    const original = new Map(
      lesson.steps[0].scene.items.map((item) => [item.id, item.value]),
    );
    require(s.items.every(
      (item) => original.get(item.id) === item.value,
    ), 'A card identity changed value.');
  }
  if (lesson.kind === 'bar-chart') {
    require(Array.isArray(s.categories) &&
      s.categories.length === 3 &&
      s.categories.every(
        (c) =>
          typeof c.id === 'string' &&
          typeof c.label === 'string' &&
          integer(c.value, 0, 6),
      ), 'Invalid bar chart.');
    require(new Set(s.categories.map((c) => c.id)).size ===
      3, 'Duplicate chart category.');
    require(s.active === null ||
      s.categories.some((c) => c.id === s.active), 'Unknown chart category.');
    require(typeof s.guide === 'boolean', 'Invalid chart guide.');
  }
  if (lesson.kind === 'probability-scale')
    require(finite(s.probability) &&
      s.probability >= 0 &&
      s.probability <= 1, 'Probability must lie between zero and one.');
}
