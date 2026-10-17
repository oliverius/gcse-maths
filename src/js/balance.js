const NS = 'http://www.w3.org/2000/svg';
export function element(name, attrs = {}, text) {
  const node = document.createElementNS(NS, name);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  if (text !== undefined) node.textContent = text;
  return node;
}
function terms(svg, items, centre, y, highlight = []) {
  const widths = items.map(t => t.text.length * 19 + 12);
  let position = centre - widths.reduce((a, b) => a + b, 0) / 2;
  items.forEach((term, i) => {
    svg.append(element('text', { x: position + widths[i] / 2, y, 'text-anchor': 'middle', 'data-term': term.id, class: `term ${term.tone}${highlight.includes(term.id) ? ' highlight' : ''}` }, term.text));
    position += widths[i];
  });
}
export function draw(lesson, state) {
  const svg = element('svg', { viewBox: '0 0 800 310', 'aria-hidden': 'true' });
  if (lesson.kind === 'balance') {
    const offset = state.balance * 24;
    svg.append(element('path', { d: 'M 355 282 L 400 180 L 445 282 Z', fill: '#dce8de', stroke: '#759386', 'stroke-width': 3 }));
    svg.append(element('line', { x1: 170, y1: 188 + offset, x2: 630, y2: 188 - offset, stroke: '#527766', 'stroke-width': 9, 'stroke-linecap': 'round', 'data-beam': '' }));
    for (const [cx, dy] of [[190, offset], [610, -offset]]) {
      svg.append(element('line', { x1: cx, x2: cx, y1: 188 + dy, y2: 148 + dy, stroke: '#527766', 'stroke-width': 6 }));
      svg.append(element('rect', { x: cx - 155, y: 140 + dy, width: 310, height: 10, rx: 5, fill: '#527766' }));
    }
    svg.append(element('circle', { cx: 400, cy: 188, r: 10, fill: '#225d48' }));
    terms(svg, state.left, 190, 120 + offset, state.highlight);
    terms(svg, state.right, 610, 120 - offset, state.highlight);
    svg.append(element('text', { x: 400, y: 115, 'text-anchor': 'middle' }, state.balance === 0 ? '=' : '≠'));
    svg.append(element('text', { x: 400, y: 306, 'text-anchor': 'middle', style: 'font-size:16px;fill:#54685f' }, state.balance === 0 ? 'Equal sides · balanced' : 'Unequal sides · temporarily unbalanced'));
  } else {
    terms(svg, state.left, 400, 165, state.highlight);
    if (state.working) svg.append(element('text', { x: 400, y: 235, 'text-anchor': 'middle', class: 'bracket-work' }, state.working));
  }
  return svg;
}
