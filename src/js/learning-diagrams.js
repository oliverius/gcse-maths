import { element, label, math, entity } from './svg.js';
import { mathRow, mathSVG } from './notation.js';
import { pythagorasGeometry, isPrime } from './learning-geometry.js';
import { foundationsRenderers } from './foundations-diagrams.js';

function tileArray(svg, s) {
  const cell = Math.min(42, 185 / s.rows),
    gap = 82;
  const total = s.columns * cell * s.layers + gap * (s.layers - 1);
  for (let layer = 0; layer < s.visibleLayers; layer++) {
    const x0 = 400 - total / 2 + layer * (s.columns * cell + gap),
      y0 = 145;
    if (s.layers > 1)
      label(svg, `Layer ${layer + 1}`, x0 + (s.columns * cell) / 2, 120);
    for (let row = 0; row < s.rows; row++)
      for (let col = 0; col < s.columns; col++) {
        const x = x0 + col * cell,
          y = y0 + row * cell;
        const node = entity(`array-${layer}-${row}-${col}`, x, y);
        const visible = row < s.visibleRows;
        node.append(
          element('rect', {
            x,
            y,
            width: cell,
            height: cell,
            fill: visible
              ? row === s.highlightRow
                ? 'var(--highlight)'
                : layer
                  ? '#eee5f7'
                  : '#dceaf5'
              : 'var(--surface)',
            stroke: visible ? '#6740a0' : 'var(--diagram-grid)',
            'stroke-width': 2,
          }),
        );
        svg.append(node);
      }
    if (s.edges) {
      math(
        svg,
        String(s.columns),
        `${s.columns} tiles across`,
        x0 + (s.columns * cell) / 2,
        y0 + s.rows * cell + 26,
        70,
        27,
      );
      math(
        svg,
        String(s.rows),
        `${s.rows} tiles high`,
        x0 - 30,
        y0 + (s.rows * cell) / 2,
        50,
        27,
      );
    }
  }
}
function powerPattern(svg, s) {
  const gap = 180;
  for (let i = 0; i < s.visible; i++) {
    const x = 130 + i * gap;
    const node = entity(`power-${s.exponents[i]}`, x, 206);
    node.append(
      element('rect', {
        x: x - 64,
        y: 145,
        width: 128,
        height: 130,
        rx: 12,
        fill: i === s.visible - 1 ? '#fff3d7' : 'var(--sidebar)',
        stroke: i === s.visible - 1 ? '#6740a0' : 'var(--diagram-line)',
        'stroke-width': 2,
      }),
    );
    math(
      node,
      `${s.base}^{${s.exponents[i]}}`,
      `${s.base} to the power ${s.exponents[i]}`,
      x,
      176,
      110,
      31,
    );
    math(
      node,
      String(s.base ** s.exponents[i]),
      String(s.base ** s.exponents[i]),
      x,
      238,
      110,
      32,
    );
    svg.append(node);
    if (i > 0) {
      const arrow = entity(`divide-${i}`, x - 90, 206);
      math(arrow, `\\div${s.base}`, `divide by ${s.base}`, x - 90, 207, 70, 25);
      svg.append(arrow);
    }
  }
}
export function pythagorasLayout(a, b) {
  const geometry = pythagorasGeometry(a, b);
  const points = Object.values(geometry.squares).flatMap((s) => s.points);
  const xs = points.map((p) => p[0]),
    ys = points.map((p) => p[1]);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = Math.min(...ys),
    maxY = Math.max(...ys);
  const scale = Math.min(540 / (maxX - minX), 238 / (maxY - minY));
  const map = (p) => [
    400 + (p[0] - (minX + maxX) / 2) * scale,
    244 + (p[1] - (minY + maxY) / 2) * scale,
  ];
  return { ...geometry, scale, map };
}
function pythagoras(svg, s) {
  const g = pythagorasLayout(s.a, s.b);
  const points = Object.values(g.vertices).map(g.map);
  label(svg, 'c is the hypotenuse, opposite the right angle', 400, 108);
  const triangle = entity('right-triangle', ...points[0]);
  triangle.append(
    element('polygon', {
      points: points.map((p) => p.join(',')).join(' '),
      fill: 'var(--sidebar)',
      stroke: 'var(--text)',
      'stroke-width': 3,
    }),
  );
  svg.append(triangle);
  for (const id of s.squares) {
    const square = g.squares[id],
      mapped = square.points.map(g.map);
    const node = entity(`square-${id}`, ...mapped[0]);
    node.append(
      element('polygon', {
        points: mapped.map((p) => p.join(',')).join(' '),
        fill: s.unitTiles
          ? 'var(--surface)'
          : s.knownAreas.includes(id)
            ? id === 'c'
              ? '#eee5f7'
              : '#dceaf5'
            : 'var(--surface)',
        stroke: id === 'c' ? '#6740a0' : '#174f7a',
        'stroke-width': 2,
      }),
    );
    svg.append(node);
  }
  if (s.unitTiles) {
    const ids = s.transfer ? ['c'] : s.squares.filter((id) => id !== 'c');
    for (const id of ids) {
      const square = g.squares[id],
        side = Math.round(square.length);
      for (let row = 0; row < side; row++)
        for (let col = 0; col < side; col++) {
          const index = row * side + col + (id === 'b' ? s.a * s.a : 0);
          const origin = [
            square.origin[0] + square.e[0] * col + square.n[0] * row,
            square.origin[1] + square.e[1] * col + square.n[1] * row,
          ];
          const [x, y] = g.map(origin),
            node = entity(`area-unit-${index}`, x, y);
          node.setAttribute('data-angle', square.angle);
          node.setAttribute(
            'style',
            `transform-origin:${x}px ${y}px;transform:rotate(${square.angle}deg)`,
          );
          node.append(
            element('rect', {
              x,
              y,
              width: g.scale,
              height: g.scale,
              fill: index < s.a * s.a ? '#dceaf5' : '#eee5f7',
              stroke: index < s.a * s.a ? '#174f7a' : '#6740a0',
              'stroke-width': 1.2,
            }),
          );
          svg.append(node);
        }
    }
  }
  const [ax, ay] = points[0];
  svg.append(
    element('path', {
      d: `M ${ax + 10} ${ay} v -10 h -10`,
      fill: 'none',
      stroke: 'var(--text)',
      'stroke-width': 2,
      'data-right-angle': '90',
    }),
  );
  for (const id of ['a', 'b', 'c']) {
    const sq = g.squares[id],
      along = id === 'a' ? 0.5 : 0.2;
    const mid = [
      sq.origin[0] + sq.e[0] * sq.length * along,
      sq.origin[1] + sq.e[1] * sq.length * along,
    ];
    const mapped = g.map(mid),
      offset = id === 'a' ? -12 : 24;
    const x = mapped[0] + sq.n[0] * offset,
      y = mapped[1] + sq.n[1] * offset;
    svg.append(
      mathSVG(
        {
          latex: s.knownSides.includes(id) ? String(s[id]) : id,
          spoken: s.knownSides.includes(id)
            ? `${id} is ${s[id]}`
            : `unknown side ${id}`,
        },
        {
          x: x - 21,
          y: y - 28,
          width: 42,
          height: 56,
          size: 22,
          className: 'pythagoras-side-label',
        },
      ),
    );
    if (s.squares.includes(id)) {
      const [cx, cy] = g.map(sq.centre);
      math(
        svg,
        s.knownAreas.includes(id) ? String(s[id] ** 2) : `${id}^{2}`,
        s.knownAreas.includes(id)
          ? `square area ${s[id] ** 2}`
          : `square area ${id} squared`,
        cx,
        cy,
        58,
        28,
        !s.unitTiles,
      );
    }
  }
}
function factorTree(svg, s) {
  const nodes = new Map(s.nodes.map((n) => [n.id, n])),
    positions = new Map();
  const root = s.nodes.find(
    (n) => !s.nodes.some((p) => p.children.includes(n.id)),
  );
  function position(n, x, y, spread) {
    positions.set(n.id, [x, y]);
    n.children.forEach((id, i) =>
      position(nodes.get(id), x + (i ? spread : -spread), y + 86, spread / 2),
    );
  }
  position(root, 400, 145, 155);
  for (const node of s.nodes)
    if (s.visible.includes(node.id)) {
      const [x, y] = positions.get(node.id);
      for (const child of node.children)
        if (s.visible.includes(child)) {
          const [cx, cy] = positions.get(child);
          svg.append(
            element('line', {
              x1: x,
              y1: y + 23,
              x2: cx,
              y2: cy - 23,
              stroke: 'var(--diagram-line)',
              'stroke-width': 3,
              'data-object': `branch-${child}`,
            }),
          );
        }
      const wrapper = entity(node.id, x, y),
        selected = s.selected.includes(node.id);
      wrapper.append(
        element('circle', {
          cx: x,
          cy: y,
          r: 27,
          fill: selected ? 'var(--highlight)' : 'var(--surface)',
          stroke: selected ? '#6740a0' : '#174f7a',
          'stroke-width': selected ? 4 : 2,
        }),
      );
      math(wrapper, String(node.value), String(node.value), x, y, 50, 29);
      if (selected && isPrime(node.value)) label(wrapper, 'prime', x, y + 48);
      svg.append(wrapper);
    }
}
function placeValue(svg, s) {
  const names = ['Hundreds', 'Tens', 'Ones', 'Tenths', 'Hundredths'];
  const powers = [2, 1, 0, -1, -2];
  powers.forEach((_place, i) => {
    const x = 180 + i * 110;
    svg.append(
      element('rect', {
        x: x - 54,
        y: 146,
        width: 108,
        height: 153,
        fill: 'var(--sidebar)',
        stroke: 'var(--border)',
      }),
    );
    label(svg, names[i], x, 134);
  });
  // The decimal boundary is fixed; only digit identities change columns.
  svg.append(
    element('line', {
      x1: 455,
      x2: 455,
      y1: 144,
      y2: 300,
      stroke: 'var(--accent)',
      'stroke-width': 3,
      'data-decimal-boundary': 'fixed',
    }),
  );
  svg.append(
    element('circle', { cx: 455, cy: 259, r: 5, fill: 'var(--accent)' }),
  );
  for (const digit of s.digits) {
    const x = 180 + powers.indexOf(digit.place) * 110,
      y = 224,
      node = entity(digit.id, x, y);
    node.append(
      element('rect', {
        x: x - 34,
        y: y - 36,
        width: 68,
        height: 72,
        rx: 8,
        fill: s.shift ? '#fff3d7' : 'var(--surface)',
        stroke: s.shift ? '#6740a0' : '#174f7a',
        'stroke-width': 3,
      }),
    );
    math(
      node,
      String(digit.digit),
      `${digit.digit} in place ten to power ${digit.place}`,
      x,
      y,
      62,
      39,
    );
    svg.append(node);
  }
}
function outcomeGrid(svg, s) {
  const x0 = 270,
    y0 = 142,
    w = 120,
    h = 83;
  s.columns.forEach((c, i) =>
    math(svg, c, s.columnNames[c], x0 + (i + 0.5) * w, 116, 75, 28),
  );
  s.rows.forEach((r, row) => {
    math(svg, r, s.rowNames[r], x0 - 47, y0 + (row + 0.5) * h, 75, 28);
    s.columns.forEach((c, col) => {
      const id = `${r}-${c}`,
        x = x0 + col * w,
        y = y0 + row * h;
      svg.append(
        element('rect', {
          x,
          y,
          width: w,
          height: h,
          fill: 'var(--surface)',
          stroke: 'var(--diagram-grid)',
          'stroke-width': 2,
        }),
      );
      if (row * s.columns.length + col < s.revealed) {
        const node = entity(`outcome-${id}`, x, y);
        node.append(
          element('rect', {
            x: x + 4,
            y: y + 4,
            width: w - 8,
            height: h - 8,
            rx: 6,
            fill: s.selected.includes(id) ? 'var(--highlight)' : '#dceaf5',
            stroke: s.selected.includes(id) ? '#6740a0' : '#174f7a',
            'stroke-width': 2,
          }),
        );
        math(
          node,
          `(${r},${c})`,
          `${s.rowNames[r]} and ${s.columnNames[c]}`,
          x + w / 2,
          y + h / 2,
          104,
          27,
        );
        svg.append(node);
      }
    });
  });
  label(
    svg,
    s.rows.map((r) => `${r} = ${s.rowNames[r]}`).join(' · '),
    450,
    345,
  );
}
function coordinateGradient(svg, s, lesson) {
  const unit = 20,
    x = (value) => 320 + value * unit,
    y = (value) => 322 - value * unit;
  const clip = element('clipPath', { id: 'gradient-grid-clip' });
  clip.append(element('rect', { x: x(-2), y: y(10), width: 240, height: 240 }));
  const defs = element('defs');
  defs.append(clip);
  svg.append(defs);
  for (let value = -2; value <= 10; value++) {
    svg.append(
      element('line', {
        x1: x(value),
        x2: x(value),
        y1: y(-2),
        y2: y(10),
        stroke: 'var(--diagram-grid)',
        'stroke-width': 1,
      }),
    );
    svg.append(
      element('line', {
        x1: x(-2),
        x2: x(10),
        y1: y(value),
        y2: y(value),
        stroke: 'var(--diagram-grid)',
        'stroke-width': 1,
      }),
    );
    if (value !== 0 && value % 2 === 0) {
      label(svg, String(value), x(value), y(0) + 17, { 'font-size': 12 });
      label(svg, String(value), x(0) - 14, y(value) + 4, { 'font-size': 12 });
    }
  }
  svg.append(
    element('line', {
      x1: x(-2),
      x2: x(10),
      y1: y(0),
      y2: y(0),
      stroke: 'var(--text)',
      'stroke-width': 2,
    }),
  );
  svg.append(
    element('line', {
      x1: x(0),
      x2: x(0),
      y1: y(-2),
      y2: y(10),
      stroke: 'var(--text)',
      'stroke-width': 2,
    }),
  );
  label(svg, 'x', x(10) + 15, y(0) + 5);
  label(svg, 'y', x(0), y(10) - 10);
  const slope = (s.y2 - s.y1) / (s.x2 - s.x1);
  svg.append(
    element('line', {
      x1: x(-2),
      x2: x(10),
      y1: y(s.y1 + slope * (-2 - s.x1)),
      y2: y(s.y1 + slope * (10 - s.x1)),
      stroke: '#174f7a',
      'stroke-width': 3,
      'clip-path': 'url(#gradient-grid-clip)',
    }),
  );
  if (s.run) {
    svg.append(
      element('line', {
        x1: x(s.x1),
        x2: x(s.x2),
        y1: y(s.y1),
        y2: y(s.y1),
        stroke: '#6740a0',
        'stroke-width': 4,
        'stroke-dasharray': '6 3',
        'data-gradient-run': s.x2 - s.x1,
      }),
    );
    math(
      svg,
      `\\Delta x=${s.x2 - s.x1}`,
      `Change in x: ${s.x2 - s.x1}`,
      (x(s.x1) + x(s.x2)) / 2,
      y(s.y1) + 25,
      100,
      20,
      true,
    );
  }
  if (s.rise) {
    svg.append(
      element('line', {
        x1: x(s.x2),
        x2: x(s.x2),
        y1: y(s.y1),
        y2: y(s.y2),
        stroke: '#963d39',
        'stroke-width': 4,
        'stroke-dasharray': '6 3',
        'data-gradient-rise': s.y2 - s.y1,
      }),
    );
    math(
      svg,
      `\\Delta y=${s.y2 - s.y1}`,
      `Change in y: ${s.y2 - s.y1}`,
      x(s.x2) + 75,
      (y(s.y1) + y(s.y2)) / 2,
      110,
      20,
      true,
    );
  }
  for (const [name, px, py] of [
    ['A', s.x1, s.y1],
    ['B', s.x2, s.y2],
  ]) {
    const node = entity(`gradient-point-${name}`, x(px), y(py));
    node.append(
      element('circle', { cx: x(px), cy: y(py), r: 5, fill: '#174f7a' }),
    );
    label(node, name, x(px) - 13, y(py) - 11);
    svg.append(node);
  }
  if (s.intercept) {
    const intercept = lesson.model.intercept;
    svg.append(
      element('circle', {
        cx: x(0),
        cy: y(intercept),
        r: 6,
        fill: 'var(--operation)',
        'data-intercept': intercept,
      }),
    );
    svg.append(
      mathSVG(
        {
          latex: s.knownIntercept ? `n=${intercept}` : 'n=?',
          spoken: s.knownIntercept
            ? `y-intercept n is ${intercept}`
            : 'Find the y-intercept n',
        },
        {
          x: x(0) - 115,
          y: y(intercept) - 28,
          width: 100,
          height: 56,
          size: 22,
          className: 'operation',
        },
      ),
    );
  }
}

function percentageGrid(svg, s) {
  for (let i = 0; i < 100; i++) {
    const x = 290 + (i % 10) * 22,
      y = 125 + Math.floor(i / 10) * 22;
    const node = entity(`percent-square-${i}`, x, y);
    node.append(
      element('rect', {
        x,
        y,
        width: 22,
        height: 22,
        fill: i < s.selected ? 'var(--highlight)' : '#dceaf5',
        stroke: 'var(--diagram-line)',
        'stroke-width': 1,
        'data-percent-selected': i < s.selected ? 'true' : 'false',
      }),
    );
    svg.append(node);
  }
}

function moneyBars(svg, s, lesson) {
  s.rows.forEach((row, index) => {
    const top = 130 + index * 78;
    label(svg, row.label, 110, top, { 'text-anchor': 'start' });
    svg.append(
      element('rect', {
        x: 110,
        y: top + 10,
        width: 400,
        height: 24,
        rx: 3,
        fill: 'var(--sidebar)',
        stroke: 'var(--border)',
      }),
    );
    const node = entity(row.id, 110, top + 10);
    node.append(
      element('rect', {
        x: 110,
        y: top + 10,
        width: (400 * row.value) / lesson.model.income,
        height: 24,
        rx: 3,
        fill:
          row.tone === 'negative'
            ? '#963d39'
            : row.tone === 'operation'
              ? '#6740a0'
              : '#174f7a',
      }),
    );
    svg.append(node);
    const amount = row.value.toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    math(svg, `\\pounds${amount}`, `${amount} pounds`, 625, top + 22, 195, 27);
  });
}

const renderers = {
  ...foundationsRenderers,
  'percentage-grid': percentageGrid,
  'coordinate-gradient': coordinateGradient,
  'money-bars': moneyBars,
  'tile-array': tileArray,
  'power-pattern': powerPattern,
  pythagoras,
  'factor-tree': factorTree,
  'place-value': placeValue,
  'outcome-grid': outcomeGrid,
};
export const learningKinds = Object.keys(renderers);
export function drawLearningDiagram(lesson, state) {
  const graph = [
    'coordinate-gradient',
    'percentage-grid',
    'coordinate-plane',
    'line-table',
  ].includes(lesson.kind);
  const height = lesson.kind === 'line-table' ? 540 : 400;
  const sequence = lesson.kind === 'sequence-table';
  const svg = element('svg', {
    viewBox: graph
      ? `160 0 480 ${height}`
      : sequence
        ? '60 0 680 400'
        : '0 0 800 400',
    'aria-hidden': 'true',
  });
  mathRow(svg, state.left, 400, 53, state.highlight, {
    maxWidth: graph ? 440 : sequence ? 640 : 740,
    size: 38,
    height: 94,
  });
  renderers[lesson.kind](svg, state.scene, lesson);
  if (state.scene.caption) label(svg, state.scene.caption, 400, height - 14);
  return svg;
}
