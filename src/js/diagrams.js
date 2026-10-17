import { element, label, math, entity } from './svg.js';
import { mathRow, mathSVG } from './notation.js';

const palette = {
  original: '#174f7a',
  operation: '#6740a0',
  negative: '#963d39',
};
export function counterGroups(svg, scene) {
  const width = 720 / scene.groups.length;
  scene.groups.forEach((group, index) => {
    const centre = 40 + width * (index + 0.5);
    svg.append(
      element('rect', {
        x: centre - width / 2 + 5,
        y: 116,
        width: width - 10,
        height: 218,
        rx: 12,
        fill: 'var(--sidebar)',
        stroke: 'var(--border)',
      }),
    );
    label(svg, group.label, centre, 142);
    const columns = Math.min(6, Math.max(1, Math.floor((width - 24) / 39)));
    group.items.forEach((item, i) => {
      const x =
        centre +
        ((i % columns) - (Math.min(columns, group.items.length) - 1) / 2) * 39;
      const y = 174 + Math.floor(i / columns) * 36;
      const node = entity(item.id, x, y);
      const tone = item.tone || 'original';
      node.append(
        element('rect', {
          x: x - 15,
          y: y - 15,
          width: 30,
          height: 30,
          rx: item.shape === 'circle' ? 15 : 5,
          fill: item.highlight
            ? 'var(--highlight)'
            : item.category === 'blue'
              ? '#dceaf5'
              : item.category === 'gold'
                ? '#fff3d7'
                : 'var(--surface)',
          stroke: item.highlight
            ? '#6740a0'
            : item.category === 'gold'
              ? '#8c5a00'
              : palette[tone],
          'stroke-width': item.highlight ? 4 : 2,
        }),
      );
      node.append(
        mathSVG(item, {
          x: x - 16,
          y: y - 16,
          width: 32,
          height: 32,
          size: 21,
          className: `term ${tone}`,
        }),
      );
      svg.append(node);
    });
    if (group.summary) label(svg, group.summary, centre, 322);
  });
}
export function anglePoint(cx, cy, radius, degrees) {
  const radians = (degrees * Math.PI) / 180;
  return [cx + radius * Math.cos(radians), cy - radius * Math.sin(radians)];
}
export function sectorPath(start, end, radius = 102, cx = 400, cy = 246) {
  const from = anglePoint(cx, cy, radius, start),
    to = anglePoint(cx, cy, radius, end);
  return `M ${cx} ${cy} L ${from.join(' ')} A ${radius} ${radius} 0 ${end - start > 180 ? 1 : 0} 0 ${to.join(' ')} Z`;
}
function angles(svg, scene) {
  if (scene.total === 180)
    svg.append(
      element('line', {
        x1: 245,
        x2: 555,
        y1: 246,
        y2: 246,
        stroke: 'var(--diagram-line)',
        'stroke-width': 4,
      }),
    );
  else
    svg.append(
      element('circle', {
        cx: 400,
        cy: 246,
        r: 102,
        fill: 'none',
        stroke: 'var(--border)',
        'stroke-width': 2,
      }),
    );
  for (const sector of scene.sectors) {
    const node = entity(sector.id, 400, 246);
    node.append(
      element('path', {
        d: sectorPath(sector.start, sector.end),
        fill: sector.tone === 'operation' ? '#eee5f7' : '#dceaf5',
        stroke: palette[sector.tone || 'original'],
        'stroke-width': 3,
      }),
    );
    const [x, y] = anglePoint(400, 246, 145, (sector.start + sector.end) / 2);
    node.append(
      mathSVG(
        {
          latex: sector.known ? `${sector.end - sector.start}^{\\circ}` : '?',
          spoken: sector.known
            ? `${sector.end - sector.start} degrees`
            : 'unknown angle',
        },
        {
          x: x - 45,
          // Keep a label near the bottom of a full turn inside the canvas.
          y: Math.min(y, 380) - 28,
          width: 90,
          height: 56,
          size: 28,
          className: `term ${sector.tone || 'original'}`,
        },
      ),
    );
    svg.append(node);
  }
  svg.append(
    element('circle', { cx: 400, cy: 246, r: 5, fill: 'var(--text)' }),
  );
}
function shapeGrid(svg, scene) {
  const size = Math.min(44, 300 / scene.width, 170 / scene.height);
  const w = scene.width * size,
    h = scene.height * size,
    x = 400 - w / 2,
    y = 145;
  math(svg, String(scene.width), `${scene.width} units`, 400, 116);
  math(svg, String(scene.height), `${scene.height} units`, x - 40, y + h / 2);
  if (scene.shape === 'triangle') {
    const first = entity('triangle-original', x, y);
    first.append(
      element('polygon', {
        points: `${x},${y} ${x},${y + h} ${x + w},${y + h}`,
        fill: '#dceaf5',
        stroke: '#174f7a',
        'stroke-width': 3,
      }),
    );
    svg.append(first);
    if (scene.copy) {
      const copy = entity('triangle-copy', x, y);
      copy.append(
        element('polygon', {
          points: `${x},${y} ${x + w},${y} ${x + w},${y + h}`,
          fill: '#eee5f7',
          stroke: '#6740a0',
          'stroke-width': 3,
        }),
      );
      svg.append(copy);
    }
    svg.append(
      element('path', {
        d: `M ${x} ${y + h - 15} h 15 v 15`,
        fill: 'none',
        stroke: '#174f7a',
        'stroke-width': 2,
      }),
    );
  } else {
    svg.append(
      element('rect', {
        x,
        y,
        width: w,
        height: h,
        fill: 'var(--surface)',
        stroke: 'var(--diagram-line)',
        'stroke-width': 2,
      }),
    );
    if (scene.grid)
      for (let row = 0; row < scene.height; row++)
        for (let col = 0; col < scene.width; col++) {
          const filled = row < scene.rows;
          const node = entity(
            `cell-${row}-${col}`,
            x + col * size,
            y + row * size,
          );
          node.append(
            element('rect', {
              x: x + col * size,
              y: y + row * size,
              width: size,
              height: size,
              fill: filled ? '#eee5f7' : 'var(--surface)',
              stroke: filled ? '#6740a0' : 'var(--diagram-grid)',
              'stroke-width': 2,
            }),
          );
          svg.append(node);
        }
    const sides = [
      ['top', x, y, x + w, y],
      ['right', x + w, y, x + w, y + h],
      ['bottom', x + w, y + h, x, y + h],
      ['left', x, y + h, x, y],
    ];
    for (const [id, x1, y1, x2, y2] of sides)
      if (scene.sides?.includes(id)) {
        const node = entity(`side-${id}`, x1, y1);
        node.append(
          element('line', {
            x1,
            y1,
            x2,
            y2,
            stroke: '#6740a0',
            'stroke-width': 7,
            'stroke-linecap': 'round',
          }),
        );
        svg.append(node);
      }
  }
}
function dataCards(svg, scene) {
  const gap = 105;
  scene.items.forEach((item, i) => {
    const x = 400 + (i - (scene.items.length - 1) / 2) * gap,
      y = 212;
    const node = entity(item.id, x, y);
    const chosen = scene.selected.includes(item.id),
      muted = scene.muted.includes(item.id);
    node.setAttribute('opacity', muted ? 0.35 : 1);
    node.append(
      element('rect', {
        x: x - 40,
        y: y - 42,
        width: 80,
        height: 84,
        rx: 12,
        fill: chosen ? 'var(--highlight)' : 'var(--sidebar)',
        stroke: chosen ? '#6740a0' : 'var(--diagram-line)',
        'stroke-width': chosen ? 4 : 2,
      }),
    );
    node.append(
      mathSVG(
        { latex: String(item.value), spoken: String(item.value) },
        { x: x - 37, y: y - 36, width: 74, height: 72, size: 40 },
      ),
    );
    if (muted)
      node.append(
        element('line', {
          x1: x - 33,
          y1: y + 30,
          x2: x + 33,
          y2: y - 30,
          stroke: 'var(--muted)',
          'stroke-width': 3,
        }),
      );
    svg.append(node);
  });
}
function barChart(svg, scene) {
  const x0 = 175,
    y0 = 310,
    step = 32;
  svg.append(
    element('path', {
      d: `M ${x0} 112 V ${y0} H 650`,
      fill: 'none',
      stroke: 'var(--diagram-line)',
      'stroke-width': 3,
    }),
  );
  label(svg, 'Number of votes', 125, 92);
  for (let value = 0; value <= 6; value++) {
    const y = y0 - value * step;
    svg.append(
      element('line', {
        x1: x0,
        x2: 650,
        y1: y,
        y2: y,
        stroke: 'var(--border)',
        'stroke-width': 1,
      }),
    );
    math(svg, String(value), `${value} votes`, 145, y, 50, 24);
  }
  scene.categories.forEach((category, i) => {
    const x = 240 + i * 160;
    const chosen = scene.active === category.id;
    const node = entity(category.id, x, y0);
    node.append(
      element('rect', {
        x: x - 35,
        y: y0 - category.value * step,
        width: 70,
        height: category.value * step,
        fill: chosen ? '#eee5f7' : '#dceaf5',
        stroke: chosen ? '#6740a0' : '#174f7a',
        'stroke-width': 3,
      }),
    );
    svg.append(node);
    label(svg, category.label, x, 348, {
      'font-weight': chosen ? 800 : 500,
      'text-decoration': chosen ? 'underline' : 'none',
    });
    if (chosen && scene.guide) {
      svg.append(
        element('line', {
          x1: x0,
          x2: x,
          y1: y0 - category.value * step,
          y2: y0 - category.value * step,
          stroke: '#6740a0',
          'stroke-width': 4,
          'stroke-dasharray': '8 5',
          'data-object': 'reading-guide',
        }),
      );
    }
  });
}
function probabilityScale(svg, scene) {
  svg.append(
    element('line', {
      x1: 90,
      x2: 710,
      y1: 202,
      y2: 202,
      stroke: 'var(--diagram-line)',
      'stroke-width': 4,
    }),
  );
  const points = [
    ['0', 'Impossible'],
    ['\\frac{1}{4}', 'Unlikely'],
    ['\\frac{1}{2}', 'Even chance'],
    ['\\frac{3}{4}', 'Likely'],
    ['1', 'Certain'],
  ];
  points.forEach(([latex, title], i) => {
    const x = 90 + i * 155;
    math(svg, latex, title, x, 145, 100, 29);
    svg.append(
      element('line', {
        x1: x,
        x2: x,
        y1: 194,
        y2: 210,
        stroke: 'var(--diagram-line)',
        'stroke-width': 3,
      }),
    );
    label(svg, title, x, 248);
  });
  const x = 90 + scene.probability * 620;
  const marker = entity('probability-marker', x, 280);
  marker.append(
    element('path', {
      d: `M ${x - 12} 295 L ${x} 274 L ${x + 12} 295 Z`,
      fill: '#6740a0',
    }),
  );
  svg.append(marker);
}
const diagrams = {
  'counter-groups': counterGroups,
  'angle-diagram': angles,
  'shape-grid': shapeGrid,
  'data-cards': dataCards,
  'bar-chart': barChart,
  'probability-scale': probabilityScale,
};
export const diagramKinds = Object.keys(diagrams);
export function drawDiagram(lesson, state) {
  const svg = element('svg', { viewBox: '0 0 800 400', 'aria-hidden': 'true' });
  mathRow(svg, state.left, 400, 53, state.highlight, { size: 38, height: 94 });
  diagrams[lesson.kind](svg, state.scene);
  if (state.scene.caption) label(svg, state.scene.caption, 400, 386);
  return svg;
}
