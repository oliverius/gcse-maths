import { element, label, math, entity } from './svg.js';

function grid(svg, originY, extent, unit) {
  const x = (value) => 400 + value * unit,
    y = (value) => originY - value * unit;
  for (let n = -extent; n <= extent; n++) {
    svg.append(
      element('line', {
        x1: x(n),
        x2: x(n),
        y1: y(-extent),
        y2: y(extent),
        stroke: 'var(--diagram-grid)',
        'stroke-width': 1,
      }),
    );
    svg.append(
      element('line', {
        x1: x(-extent),
        x2: x(extent),
        y1: y(n),
        y2: y(n),
        stroke: 'var(--diagram-grid)',
        'stroke-width': 1,
      }),
    );
    if (n !== 0 && (extent === 5 || n % 2 === 0)) {
      label(svg, String(n), x(n), y(0) + 16, { style: 'font-size:14px' });
      label(svg, String(n), x(0) - 14, y(n) + 4, { style: 'font-size:14px' });
    }
  }
  svg.append(
    element('line', {
      x1: x(-extent),
      x2: x(extent),
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
      y1: y(-extent),
      y2: y(extent),
      stroke: 'var(--text)',
      'stroke-width': 2,
    }),
  );
  label(svg, '0', x(0) + 8, y(0) + 16, { style: 'font-size:14px' });
  label(svg, 'x', x(extent) + 15, y(0) + 5);
  label(svg, 'y', x(0), y(extent) - 12);
  return { x, y };
}
function point(svg, id, px, py, selected = false) {
  const node = entity(id, px, py);
  node.append(
    element('circle', {
      cx: px,
      cy: py,
      r: 5,
      fill: selected ? 'var(--operation)' : 'var(--original)',
    }),
  );
  svg.append(node);
}
function coordinates(svg, s, lesson) {
  const { x, y } = grid(svg, 245, 5, 24),
    p = lesson.model.points[0];
  for (const [name, px, py] of [
    ['II', -4.4, 4.3],
    ['I', 4.4, 4.3],
    ['III', -4.4, -4.5],
    ['IV', 4.4, -4.5],
  ])
    label(svg, name, x(px), y(py), { style: 'font-size:14px' });
  if (s.horizontal) {
    svg.append(
      element('line', {
        x1: x(0),
        x2: x(p.x),
        y1: y(0),
        y2: y(0),
        stroke: 'var(--operation)',
        'stroke-width': 4,
        'stroke-dasharray': '5 3',
        'data-coordinate-horizontal': p.x,
      }),
    );
    point(svg, 'horizontal-stop', x(p.x), y(0), true);
  }
  if (s.vertical)
    svg.append(
      element('line', {
        x1: x(p.x),
        x2: x(p.x),
        y1: y(0),
        y2: y(p.y),
        stroke: 'var(--operation)',
        'stroke-width': 4,
        'stroke-dasharray': '5 3',
        'data-coordinate-vertical': p.y,
      }),
    );
  for (const p of lesson.model.points.slice(0, s.revealed)) {
    point(svg, `coordinate-${p.id}`, x(p.x), y(p.y));
    label(svg, p.id, x(p.x) - 12, y(p.y) - 10, { style: 'font-size:16px' });
  }
}
function lineTable(svg, s, lesson) {
  const m = lesson.model,
    left = 200,
    top = 112,
    rowHeight = 40;
  svg.append(
    element('rect', {
      x: left,
      y: top,
      width: 400,
      height: 80,
      fill: 'var(--surface)',
      stroke: 'var(--border)',
    }),
  );
  svg.append(
    element('line', {
      x1: left,
      x2: left + 400,
      y1: top + 40,
      y2: top + 40,
      stroke: 'var(--border)',
    }),
  );
  for (let i = 0; i <= 5; i++) {
    const edge = left + 80 + i * 64;
    if (i < 5)
      svg.append(
        element('line', {
          x1: edge,
          x2: edge,
          y1: top,
          y2: top + 80,
          stroke: 'var(--border)',
        }),
      );
  }
  math(svg, 'x', 'x', 240, top + 20, 70, 24);
  math(svg, 'y', 'y', 240, top + 60, 70, 24);
  for (let i = 0; i < 5; i++) {
    const centre = 312 + i * 64;
    math(
      svg,
      String(m.xs[i]),
      `x is ${m.xs[i]}`,
      centre,
      top + rowHeight / 2,
      58,
      24,
    );
    const cell = entity(`table-y-${i}`, centre, top + 60);
    if (s.active === i)
      cell.append(
        element('rect', {
          x: centre - 31,
          y: top + 41,
          width: 62,
          height: 38,
          fill: 'var(--highlight)',
        }),
      );
    math(
      cell,
      i < s.computed ? String(m.ys[i]) : '?',
      i < s.computed ? `y is ${m.ys[i]}` : 'y not calculated yet',
      centre,
      top + 60,
      58,
      24,
    );
    svg.append(cell);
  }
  const { x, y } = grid(svg, 370, 6, 20);
  if (s.line) {
    const clip = element('clipPath', { id: 'table-line-clip' });
    clip.append(
      element('rect', { x: x(-6), y: y(6), width: 240, height: 240 }),
    );
    const defs = element('defs');
    defs.append(clip);
    svg.append(defs);
    svg.append(
      element('line', {
        x1: x(-6),
        x2: x(6),
        y1: y(m.slope * -6 + m.intercept),
        y2: y(m.slope * 6 + m.intercept),
        stroke: 'var(--original)',
        'stroke-width': 3,
        'clip-path': 'url(#table-line-clip)',
        'data-plotted-line': 'true',
      }),
    );
  }
  for (let i = 0; i < s.plotted; i++)
    point(svg, `table-point-${i}`, x(m.xs[i]), y(m.ys[i]), s.active === i);
}
function sequence(svg, s, lesson) {
  const m = lesson.model,
    top = 150,
    h = 50,
    rows = s.compare ? 3 : 2;
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < 6; col++) {
      const left = 100 + col * 100;
      const node = entity(`sequence-cell-${row}-${col}`, left, top + row * h);
      node.append(
        element('rect', {
          x: left,
          y: top + row * h,
          width: 100,
          height: h,
          fill:
            row === 1 && s.selected.includes(col)
              ? 'var(--highlight)'
              : row === 2
                ? '#dceaf5'
                : 'var(--surface)',
          stroke: 'var(--border)',
        }),
      );
      let latex, spoken;
      if (col === 0) {
        latex =
          row === 0
            ? '\\text{Position}'
            : row === 1
              ? '\\text{Term}'
              : `${m.difference}n`;
        spoken =
          row === 0
            ? 'Position'
            : row === 1
              ? 'Term'
              : `${m.difference} times position`;
      } else {
        latex =
          row === 0
            ? String(col)
            : row === 2
              ? String(m.difference * col)
              : col <= s.visible
                ? String(m.values[col - 1])
                : '?';
        spoken =
          row === 1 && col > s.visible ? 'Next term not revealed yet' : latex;
      }
      math(
        node,
        latex,
        spoken,
        left + 50,
        top + row * h + h / 2,
        94,
        col === 0 ? 19 : 29,
      );
      svg.append(node);
    }
  for (let i = 0; i < s.differences; i++) {
    const centre = 300 + i * 100,
      arrowY = top + rows * h + 17;
    svg.append(
      element('path', {
        d: `M ${centre - 31} ${arrowY} h 62 l -7 -5 m 7 5 l -7 5`,
        fill: 'none',
        stroke: 'var(--operation)',
        'stroke-width': 2,
      }),
    );
    const text = m.difference > 0 ? `+${m.difference}` : String(m.difference);
    math(svg, text, `Change ${text}`, centre, arrowY + 22, 80, 23);
  }
}
export const foundationsRenderers = {
  'coordinate-plane': coordinates,
  'line-table': lineTable,
  'sequence-table': sequence,
};
