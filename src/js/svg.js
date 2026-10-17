import { mathSVG } from './notation.js';
const NS = 'http://www.w3.org/2000/svg';
export function element(name, attrs = {}, text) {
  const node = document.createElementNS(NS, name);
  Object.entries(attrs).forEach(([key, value]) =>
    node.setAttribute(key, value),
  );
  if (text !== undefined) node.textContent = text;
  return node;
}

export function label(svg, text, x, y, extra = {}) {
  svg.append(
    element(
      'text',
      { x, y, 'text-anchor': 'middle', class: 'diagram-label', ...extra },
      text,
    ),
  );
}
export function math(
  svg,
  latex,
  spoken,
  x,
  y,
  width = 100,
  size = 29,
  background = false,
) {
  if (background)
    svg.append(
      element('rect', {
        x: x - width / 2,
        y: y - 21,
        width,
        height: 42,
        rx: 5,
        fill: 'var(--surface)',
        'fill-opacity': 0.94,
      }),
    );
  svg.append(
    mathSVG(
      { latex, spoken },
      { x: x - width / 2, y: y - 28, width, height: 56, size },
    ),
  );
}
export function entity(id, x, y) {
  // Absolute geometry stays stable while animations offset the wrapper.
  return element('g', { 'data-entity': id, x, y });
}
