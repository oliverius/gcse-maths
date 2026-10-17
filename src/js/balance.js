import { mathRow, mathSVG } from './notation.js';
import { element } from './svg.js';
export function terms(svg, items, centre, y, highlight = []) {
  mathRow(svg, items, centre, y, highlight);
}
export function draw(lesson, state) {
  const svg = element('svg', { viewBox: '0 0 800 310', 'aria-hidden': 'true' });
  if (lesson.kind === 'balance') {
    const offset = state.balance * 24;
    svg.append(
      element('path', {
        d: 'M 355 282 L 400 180 L 445 282 Z',
        fill: 'var(--sidebar)',
        stroke: 'var(--diagram-line)',
        'stroke-width': 3,
      }),
    );
    svg.append(
      element('line', {
        x1: 170,
        y1: 188 + offset,
        x2: 630,
        y2: 188 - offset,
        stroke: 'var(--diagram-line)',
        'stroke-width': 9,
        'stroke-linecap': 'round',
        'data-beam': '',
      }),
    );
    for (const [cx, dy] of [
      [190, offset],
      [610, -offset],
    ]) {
      svg.append(
        element('line', {
          x1: cx,
          x2: cx,
          y1: 188 + dy,
          y2: 148 + dy,
          stroke: 'var(--diagram-line)',
          'stroke-width': 6,
        }),
      );
      svg.append(
        element('rect', {
          x: cx - 155,
          y: 140 + dy,
          width: 310,
          height: 10,
          rx: 5,
          fill: 'var(--diagram-line)',
        }),
      );
    }
    svg.append(
      element('circle', { cx: 400, cy: 188, r: 10, fill: 'var(--accent)' }),
    );
    mathRow(svg, state.left, 190, 76 + offset, state.highlight, {
      maxWidth: 300,
    });
    mathRow(svg, state.right, 610, 76 - offset, state.highlight, {
      maxWidth: 300,
    });
    svg.append(
      mathSVG(
        {
          latex: state.balance === 0 ? '=' : '\\ne',
          spoken: state.balance === 0 ? 'equals' : 'not equal to',
        },
        { x: 365, y: 26, width: 70, height: 100 },
      ),
    );
    svg.append(
      element(
        'text',
        {
          x: 400,
          y: 306,
          'text-anchor': 'middle',
          style: 'font-size:16px;fill:var(--muted)',
        },
        state.balance === 0
          ? 'Equal sides · balanced'
          : 'Unequal sides · temporarily unbalanced',
      ),
    );
  } else {
    terms(svg, state.left, 400, 165, state.highlight);
    if (state.working)
      mathRow(
        svg,
        [{ ...state.workingNotation, id: 'working' }],
        400,
        240,
        [],
        { size: 30 },
      );
  }
  if (state.groups) {
    svg.setAttribute('viewBox', '0 0 800 510');
    drawGroups(svg, state.groups);
  }
  return svg;
}

function drawGroups(svg, groups) {
  const width = 740 / groups.length;
  groups.forEach((group, index) => {
    const origin = 30 + index * width;
    const columns = Math.min(4, Math.max(1, Math.floor((width - 18) / 45)));
    svg.append(
      element('rect', {
        x: origin + 4,
        y: 328,
        width: width - 8,
        height: 172,
        rx: 10,
        fill: 'var(--sidebar)',
        stroke: 'var(--border)',
      }),
    );
    svg.append(
      element(
        'text',
        {
          x: origin + width / 2,
          y: 352,
          'text-anchor': 'middle',
          class: 'group-label',
        },
        group.label,
      ),
    );
    group.items.forEach((item, i) => {
      const x =
        origin +
        width / 2 +
        ((i % columns) - (Math.min(columns, group.items.length) - 1) / 2) * 42;
      const y = 390 + Math.floor(i / columns) * 35;
      svg.append(
        element('rect', {
          x: x - 18,
          y: y - 27,
          width: 36,
          height: 34,
          rx: 4,
          'data-term': `${item.id}-box`,
          fill: item.tone === 'operation' ? '#eee5f7' : '#dceaf5',
          stroke: item.tone === 'operation' ? '#6740a0' : '#174f7a',
        }),
      );
      svg.append(
        mathSVG(item, {
          x: x - 18,
          y: y - 27,
          width: 36,
          height: 34,
          size: item.latex.includes('\\frac') ? 16 : 22,
          id: item.id,
          className: `term ${item.tone || 'original'}`,
        }),
      );
    });
  });
}
