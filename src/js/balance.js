const NS = 'http://www.w3.org/2000/svg';
export function element(name, attrs = {}, text) {
  const node = document.createElementNS(NS, name);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  if (text !== undefined) node.textContent = text;
  return node;
}
export function terms(svg, items, centre, y, highlight = []) {
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
    svg.append(element('rect', { x: origin + 4, y: 328, width: width - 8, height: 172, rx: 10, fill: '#f4f7f2', stroke: '#ccd7ce' }));
    svg.append(element('text', { x: origin + width / 2, y: 352, 'text-anchor': 'middle', class: 'group-label' }, group.label));
    group.items.forEach((item, i) => {
      const x = origin + width / 2 + ((i % columns) - (Math.min(columns, group.items.length) - 1) / 2) * 42;
      const y = 390 + Math.floor(i / columns) * 35;
      svg.append(element('rect', { x: x - 14.5, y: y - 22, width: 29, height: 29, rx: 4, 'data-term': `${item.id}-box`, fill: item.tone === 'operation' ? '#eee5f7' : '#dceaf5', stroke: item.tone === 'operation' ? '#6740a0' : '#174f7a' }));
      svg.append(element('text', { x, y, 'text-anchor': 'middle', 'data-term': item.id, class: `term tile-text ${item.tone || 'original'}` }, item.text));
    });
  });
}
