import { test } from 'node:test';
import assert from 'node:assert/strict';

// Minimal DOM adapter exercises the actual application without browser dependencies.
class Node {
  constructor(name = 'div') { this.name = name; this.children = []; this.attrs = {}; this.listeners = {}; this.dataset = {}; this.classList = { add: () => {} }; }
  setAttribute(key, value) { this.attrs[key] = String(value); if (key === 'data-term') this.dataset.term = value; }
  getAttribute(key) { return this.attrs[key] ?? null; }
  hasAttribute(key) { return key in this.attrs; }
  append(node) { this.children.push(node); }
  replaceChildren(...nodes) { this.children = nodes; }
  get firstElementChild() { return this.children[0]; }
  addEventListener(event, handler) { this.listeners[event] = handler; }
  click() { if (!this.disabled) this.listeners.click?.(); }
  querySelectorAll(selector) {
    const matches = node => selector === '[data-term]' ? node.hasAttribute('data-term') : selector.split(', ').includes(node.name);
    return this.children.flatMap(node => [...(matches(node) ? [node] : []), ...node.querySelectorAll(selector)]);
  }
  animate() { animations++; return { finished: Promise.resolve() }; }
}
let animations = 0;
let reduce = true;
const nodes = new Map();
globalThis.document = {
  getElementById: id => { if (!nodes.has(id)) nodes.set(id, new Node()); return nodes.get(id); },
  createElement: name => new Node(name),
  createElementNS: (_, name) => new Node(name)
};
globalThis.window = { matchMedia: () => ({ matches: reduce }) };
const settle = async () => { for (let i = 0; i < 25; i++) await Promise.resolve(); };

test('actual app handles progression, Back, Replay, lesson switching and reduced motion', async () => {
  await import('../src/js/app.js');
  const get = id => document.getElementById(id);
  assert.equal(get('counter').textContent, 'Step 1 of 5');
  assert.equal(get('back').disabled, true);
  for (let lesson = 0; lesson < 3; lesson++) {
    get('lessons').children[lesson].click();
    await settle();
    for (let step = 2; step <= 5; step++) {
      get('next').click();
      get('next').click(); // A rapid second click is ignored while busy.
      await settle();
      assert.equal(get('counter').textContent, `Step ${step} of 5`);
      if (lesson < 2) assert.equal(get('visual').getAttribute('aria-label').includes('≠'), step === 2);
    }
    assert.equal(get('next').disabled, true);
    get('back').click();
    await settle();
    assert.equal(get('counter').textContent, 'Step 4 of 5');
    get('replay').click();
    await settle();
    assert.equal(get('counter').textContent, 'Step 1 of 5');
    assert.equal(get('back').disabled, true);
  }
  assert.equal(animations, 0, 'reduced motion must skip term animations');
  reduce = false;
  // Expression lesson uses Web Animations but needs no beam frame loop.
  get('next').click();
  await settle();
  assert.ok(animations > 0);
  assert.equal(get('counter').textContent, 'Step 2 of 5');
  assert.equal(get('next').disabled, false);
});
