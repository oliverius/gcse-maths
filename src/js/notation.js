import katex from '../vendor/katex/katex.js';

const options = {
  displayMode: false,
  output: 'htmlAndMathml',
  throwOnError: true,
  trust: false,
  strict: 'error',
  maxExpand: 100,
  maxSize: 10,
};
const cache = new Map();
export function mathHTML(latex) {
  if (typeof latex !== 'string' || !latex.trim() || latex.length > 1000)
    throw new Error('Expected a short mathematical expression.');
  if (!cache.has(latex))
    cache.set(
      latex,
      katex.renderToString(`\\displaystyle ${latex}`, {
        ...options,
        macros: {},
      }),
    );
  return cache.get(latex);
}
export function validateNotation(value) {
  if (
    !value ||
    typeof value.latex !== 'string' ||
    typeof value.spoken !== 'string' ||
    !value.spoken.trim()
  )
    throw new Error(
      'Mathematical notation needs LaTeX and a spoken equivalent.',
    );
  mathHTML(value.latex);
  return value;
}
export function renderMath(node, notation) {
  node.innerHTML = mathHTML(notation.latex);
  node.setAttribute('aria-label', notation.spoken);
  node.setAttribute('data-latex', notation.latex);
}
export function renderContent(node, parts, fallback) {
  if (!parts) {
    node.textContent = fallback;
    return;
  }
  node.replaceChildren(
    ...parts.map((part) => {
      if (typeof part.text === 'string')
        return document.createTextNode(part.text);
      const span = document.createElement('span');
      span.className = 'inline-math';
      renderMath(span, part);
      return span;
    }),
  );
}

// Measure once, in unscaled CSS pixels, after loading the bundled math fonts.
const widths = new Map();
let probe;
export async function prepareNotation() {
  if (!document.fonts) return;
  await Promise.all(
    ['KaTeX_Main', 'KaTeX_Math', 'KaTeX_Size1', 'KaTeX_Size2'].map((font) =>
      document.fonts.load(`40px ${font}`),
    ),
  );
  await document.fonts.load('italic 40px KaTeX_Math');
}
function widthOf(notation, size) {
  const key = `${size}:${notation.latex}`;
  if (!widths.has(key)) {
    if (!probe && document.body.appendChild) {
      probe = document.createElement('span');
      probe.className = 'math-measure';
      probe.setAttribute('aria-hidden', 'true');
      document.body.appendChild(probe);
    }
    let width;
    if (probe) {
      probe.style.fontSize = `${size}px`;
      probe.innerHTML = mathHTML(notation.latex);
      width = probe.getBoundingClientRect().width;
    }
    // The fallback is for non-layout DOM tests only.
    widths.set(
      key,
      width || Math.max(30, notation.text?.length * size * 0.55 || 40),
    );
  }
  return widths.get(key);
}
export function mathWidth(notation, size = 40) {
  return Math.ceil(widthOf(notation, size)) + 16;
}

export function mathSVG(
  notation,
  { x, y, width, height = 100, size = 40, id, className = '' },
) {
  const node = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'foreignObject',
  );
  for (const [key, value] of Object.entries({
    x,
    y,
    width,
    height,
    class: `math-object ${className}`,
  }))
    node.setAttribute(key, value);
  if (id) node.setAttribute('data-term', id);
  const content = document.createElementNS(
    'http://www.w3.org/1999/xhtml',
    'div',
  );
  content.setAttribute('class', 'math-content');
  content.setAttribute('style', `font-size:${size}px`);
  renderMath(content, notation);
  node.append(content);
  return node;
}
export function mathRow(
  svg,
  items,
  centre,
  centreY,
  highlight = [],
  { maxWidth = 740, size = 40, height = 100 } = {},
) {
  const widths = items.map((t) => mathWidth(t, size));
  const total = widths.reduce((a, b) => a + b, 0);
  const scale = Math.min(1, maxWidth / total);
  let left = centre - (total * scale) / 2;
  items.forEach((term, index) => {
    const width = widths[index] * scale;
    svg.append(
      mathSVG(term, {
        x: left,
        y: centreY - height / 2,
        width,
        height,
        size: size * scale,
        id: term.id,
        className: `term ${term.tone || 'original'}${highlight.includes(term.id) ? ' highlight' : ''}`,
      }),
    );
    left += width;
  });
}
