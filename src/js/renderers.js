import { draw as drawBalance, element, terms } from './balance.js';
import { mathSVG } from './notation.js';
import { drawDiagram, diagramKinds } from './diagrams.js';
import {drawLearningDiagram,learningKinds} from './learning-diagrams.js';
function numberLine(lesson, state) {
  const svg = element('svg', { viewBox: '0 0 800 310', 'aria-hidden': 'true' });
  terms(svg, state.left, 400, 65, state.highlight);
  svg.append(element('line', { x1: 55, y1: 205, x2: 745, y2: 205, stroke: '#527766', 'stroke-width': 4 }));
  for (let value = -5; value <= 5; value++) {
    const x = 70 + (value + 5) * 66;
    svg.append(element('line', { x1: x, x2: x, y1: 197, y2: 215, stroke: '#527766', 'stroke-width': value === 0 ? 5 : 2 }));
    svg.append(mathSVG({latex:String(value),spoken:String(value).replace('-','minus ')},{x:x-30,y:222,width:60,height:50,size:32,className:`term ${value < 0 ? 'negative' : 'original'}`}));
  }
  svg.append(element('text', { x: 70 + (state.position + 5) * 66, y: 183, 'text-anchor': 'middle', 'data-term': 'number-line-marker', class: 'term operation' }, '▼'));
  return svg;
}
function fractions(lesson, state) {
  const svg = element('svg', { viewBox: '0 0 800 310', 'aria-hidden': 'true' });
  terms(svg, state.left, 400, 55);
  state.bars.forEach((bar, row) => {
    const y = 115 + row * 100;
    svg.append(element('rect', { x: 120, y, width: 560, height: 58, rx: 2, fill: '#fff', stroke: '#527766', 'stroke-width': 3 }));
    svg.append(element('rect', { x: 120, y, width: 560 * bar.shaded / bar.parts, height: 58, fill: '#dceaf5', stroke: '#174f7a', 'stroke-width': 2 }));
    for (let i = 1; i < bar.parts; i++) {
      const x = 120 + 560 * i / bar.parts;
      svg.append(element('line', { x1: x, x2: x, y1: y, y2: y + 58, stroke: '#527766', 'stroke-width': 3, 'data-object': `${bar.id}-partition-${i / bar.parts}` }));
    }
    svg.append(element('text', { x: 400, y: y + 86, 'text-anchor': 'middle', class: 'group-label' }, `${bar.shaded} of ${bar.parts} equal parts shaded`));
  });
  return svg;
}
const renderers = { balance: drawBalance, expression: drawBalance, 'number-line': numberLine, fractions, ...Object.fromEntries(diagramKinds.map(kind=>[kind,drawDiagram])), ...Object.fromEntries(learningKinds.map(kind=>[kind,drawLearningDiagram])) };
export function draw(lesson, state) { return renderers[lesson.kind](lesson, state); }
export function describe(lesson, state) {
  let text = state.left.map(term => term.spoken).join(' ');
  if (lesson.kind === 'balance') text += ` ${state.unbalanced ? 'not equal to' : 'equals'} ${state.right.map(term => term.spoken).join(' ')}. ${state.unbalanced ? 'Temporarily unequal; beam tilted.' : 'Equal sides; beam level.'}`;
  if (state.groups) text += '. ' + state.groups.map(g => `${g.label}: ${g.items.map(t => t.spoken).join(', ')}`).join('. ');
  if (lesson.kind === 'number-line') text += `. Marker at ${state.position}.`;
  if (state.bars) text += '. ' + state.bars.map(b => `${b.shaded} of ${b.parts} equal parts shaded`).join('. ');
  if (state.scene) text += '. ' + state.scene.description;
  return text;
}
