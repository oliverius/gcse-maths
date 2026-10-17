import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Minimal DOM adapter exercises the actual application without browser dependencies.
class Node {
  constructor(name = 'div') { this.name = name; this.children = []; this.attrs = {}; this.listeners = {}; this.dataset = {}; this.classList = { add: () => {}, toggle: () => {} }; }
  setAttribute(key, value) { this.attrs[key] = String(value); if (key === 'data-term') this.dataset.term = value; }
  getAttribute(key) { return this.attrs[key] ?? null; }
  hasAttribute(key) { return key in this.attrs; }
  append(node) { node.parent = this; this.children.push(node); }
  closest(name) { return this.name === name ? this : this.parent?.closest(name); }
  removeAttribute(key) { delete this.attrs[key]; }
  focus() { document.activeElement = this; }
  replaceChildren(...nodes) { this.children = nodes; }
  get firstElementChild() { return this.children[0]; }
  addEventListener(event, handler) { this.listeners[event] = handler; }
  click() { if (!this.disabled) this.listeners.click?.(); }
  querySelectorAll(selector) {
    const matches = node => selector.startsWith('[') ? node.hasAttribute(selector.slice(1, -1)) : selector.split(', ').includes(node.name);
    return this.children.flatMap(node => [...(matches(node) ? [node] : []), ...node.querySelectorAll(selector)]);
  }
  animate() { animations++; return { finished: Promise.resolve() }; }
}
let animations = 0;
let reduce = true;
const nodes = new Map();
globalThis.document = {
  body: new Node('body'), documentElement: new Node('html'),
  addEventListener: () => {},
  getElementById: id => { if (!nodes.has(id)) nodes.set(id, new Node()); return nodes.get(id); },
  createElement: name => new Node(name),
  createElementNS: (_, name) => new Node(name)
};
let portrait = true;
globalThis.window = { matchMedia: query => ({ get matches() { return query.includes('reduced-motion') ? reduce : portrait; }, addEventListener: () => {} }) };
globalThis.fetch = async url => ({ ok: true, json: async () => JSON.parse(await readFile(url, 'utf8')) });
const settle = async () => { for (let i = 0; i < 25; i++) await Promise.resolve(); };

test('actual app handles progression, Back, Replay, lesson switching and reduced motion', async () => {
  const app = await import('../src/js/app.js');
  await app.ready;
  const get = id => document.getElementById(id);
  assert.equal(get('counter').textContent, 'Step 1 of 5');
  assert.equal(get('back').disabled, true);
  const buttons = get('lessons').querySelectorAll('button');
  assert.equal(buttons.length, 12);
  const { createLoader } = await import('../src/js/lesson-loader.js');
  const available = (await createLoader().load()).flatMap(a => a.lessons.filter(l => l.available));
  for (let lesson = 0; lesson < buttons.length; lesson++) {
    get('menu').click();
    buttons[lesson].click();
    await settle();
    assert.equal(get('sidebar').hidden, true, 'portrait selection closes drawer');
    assert.equal(document.activeElement, get('lesson-title'));
    const length = available[lesson].steps.length;
    for (let step = 2; step <= length; step++) {
      get('next').click();
      get('next').click(); // A rapid second click is ignored while busy.
      await settle();
      assert.equal(get('counter').textContent, `Step ${step} of ${length}`);
      if (available[lesson].kind === 'balance') assert.equal(get('visual').getAttribute('aria-label').includes('≠'), available[lesson].steps[step-1].unbalanced);
    }
    assert.equal(get('next').disabled, true);
    get('back').click();
    await settle();
    assert.equal(get('counter').textContent, `Step ${length - 1} of ${length}`);
    get('replay').click();
    await settle();
    assert.equal(get('counter').textContent, `Step 1 of ${length}`);
    assert.equal(get('back').disabled, true);
  }
  assert.equal(animations, 0, 'reduced motion must skip term animations');
  reduce = false;
  // Expression lesson uses Web Animations but needs no beam frame loop.
  const expressionIndex = available.findIndex(l => l.id === 'brackets');
  buttons[expressionIndex].click();
  await settle();
  get('next').click();
  await settle();
  assert.ok(animations > 0);
  assert.equal(get('counter').textContent, 'Step 2 of 5');
  assert.equal(get('next').disabled, false);
});
