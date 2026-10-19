export const foundationsOperations = {
  'coordinate-plane': ['show', 'move', 'highlight', 'simplify'],
  'line-table': ['show', 'replace', 'highlight', 'simplify'],
  'sequence-table': ['show', 'highlight', 'replace', 'simplify'],
};
const require = (condition, message) => {
  if (!condition) throw new Error(message);
};
const integer = (value, min, max) =>
  Number.isInteger(value) && value >= min && value <= max;
export function validateFoundationsScene(lesson, state) {
  const m = lesson.model,
    s = state.scene;
  if (lesson.kind === 'coordinate-plane') {
    require(m &&
      integer(m.xMagnitude, 1, 4) &&
      integer(m.yMagnitude, 1, 4) &&
      Array.isArray(m.points) &&
      m.points.length === 4, 'Invalid coordinate model.');
    const expected = [
      ['P', -m.xMagnitude, m.yMagnitude],
      ['Q', m.xMagnitude, m.yMagnitude],
      ['R', -m.xMagnitude, -m.yMagnitude],
      ['S', m.xMagnitude, -m.yMagnitude],
    ];
    require(m.points.every(
      (p, i) =>
        p.id === expected[i][0] &&
        p.x === expected[i][1] &&
        p.y === expected[i][2],
    ), 'Coordinates do not cover the four quadrants.');
    require(integer(s.revealed, 0, 4) &&
      typeof s.horizontal === 'boolean' &&
      typeof s.vertical === 'boolean' &&
      (!s.vertical ||
        (s.horizontal && s.revealed >= 1)), 'Invalid coordinate reveal.');
  }
  if (lesson.kind === 'line-table') {
    require(m &&
      integer(m.slope, 1, 2) &&
      integer(m.intercept, 1, 2) &&
      Array.isArray(m.xs) &&
      Array.isArray(m.ys) &&
      m.xs.length === 5 &&
      m.ys.length === 5 &&
      m.xs.every(
        (x, i) =>
          x === i - 2 &&
          m.ys[i] === m.slope * x + m.intercept &&
          integer(m.ys[i], -6, 6),
      ), 'Invalid line table.');
    require(integer(s.computed, 0, 5) &&
      integer(s.plotted, 0, s.computed) &&
      (s.active === null || integer(s.active, 0, s.computed - 1)) &&
      typeof s.line === 'boolean' &&
      (!s.line || s.plotted === 5), 'Invalid line-table reveal.');
  }
  if (lesson.kind === 'sequence-table') {
    require(m &&
      integer(m.first, 1, 20) &&
      integer(m.difference, -5, 5) &&
      m.difference !== 0 &&
      Array.isArray(m.values) &&
      m.values.length === 5 &&
      m.values.every((v, i) => v === m.first + i * m.difference) &&
      m.offset === m.first - m.difference, 'Invalid arithmetic sequence.');
    if (m.targetPosition !== undefined)
      require(integer(m.targetPosition, 6, 20) &&
        m.result ===
          m.difference * m.targetPosition +
            m.offset, 'Invalid nth-term result.');
    else require(m.result === m.values[4], 'Invalid next term.');
    require(integer(s.visible, 1, 5) &&
      integer(s.differences, 0, s.visible - 1) &&
      Array.isArray(s.selected) &&
      new Set(s.selected).size === s.selected.length &&
      s.selected.every((n) => integer(n, 1, s.visible)) &&
      typeof s.compare === 'boolean' &&
      (!s.compare || s.visible === 5), 'Invalid sequence reveal.');
  }
}
