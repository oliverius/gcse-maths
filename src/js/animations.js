export const timing = { duration: 650, cancellation: 750, rotation: 1100 };
export const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
async function animate(node, frames, duration) {
  if (!node || reducedMotion() || typeof node.animate !== 'function') return;
  await node.animate(frames, { duration, easing: 'ease-in-out', fill: 'none' })
    .finished;
}
export async function cancelTerms(container, ids) {
  const nodes = [...container.querySelectorAll('[data-term]')].filter((node) =>
    ids.includes(node.dataset.term),
  );
  nodes.forEach((node) => node.classList.add('cancel'));
  await Promise.all(
    nodes.map((node) =>
      animate(
        node,
        [{ opacity: 1 }, { opacity: 1, offset: 0.5 }, { opacity: 0 }],
        timing.cancellation,
      ),
    ),
  );
}
export async function transition(previous, current) {
  const oldTerms = new Map(
    [...previous.querySelectorAll('[data-term]')].map((node) => [
      node.dataset.term,
      node,
    ]),
  );
  const tasks = [...current.querySelectorAll('[data-term]')].map((node) => {
    const old = oldTerms.get(node.dataset.term);
    if (!old)
      return animate(
        node,
        [
          { opacity: 0, transform: 'translateY(-10px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        timing.duration,
      );
    const dx = Number(old.getAttribute('x')) - Number(node.getAttribute('x'));
    const dy = Number(old.getAttribute('y')) - Number(node.getAttribute('y'));
    return animate(
      node,
      [
        { transform: `translate(${dx}px, ${dy}px)` },
        { transform: 'translate(0, 0)' },
      ],
      timing.duration,
    );
  });
  // Morph numeric SVG geometry so plates and text stay horizontal throughout.
  const oldShapes = previous.querySelectorAll('line, rect');
  const newShapes = current.querySelectorAll('line, rect');
  if (
    !reducedMotion() &&
    previous.querySelectorAll('[data-beam]').length &&
    current.querySelectorAll('[data-beam]').length &&
    oldShapes.length === newShapes.length &&
    oldShapes.length
  ) {
    const changes = [...newShapes].flatMap((node, i) =>
      ['y', 'y1', 'y2']
        .filter((key) => node.hasAttribute(key))
        .map((key) => ({
          node,
          key,
          from: Number(oldShapes[i].getAttribute(key)),
          to: Number(node.getAttribute(key)),
        })),
    );
    tasks.push(
      new Promise((resolve) => {
        const start = performance.now();
        function frame(now) {
          const progress = Math.min(1, (now - start) / timing.duration);
          const eased = progress * progress * (3 - 2 * progress);
          changes.forEach(({ node, key, from, to }) =>
            node.setAttribute(key, from + (to - from) * eased),
          );
          if (progress < 1 && !reducedMotion()) requestAnimationFrame(frame);
          else {
            changes.forEach(({ node, key, to }) => node.setAttribute(key, to));
            resolve();
          }
        }
        requestAnimationFrame(frame);
      }),
    );
  }
  const oldObjects = new Set(
    [...previous.querySelectorAll('[data-object]')].map((node) =>
      node.getAttribute('data-object'),
    ),
  );
  // Semantic diagram objects use the same deterministic offset animation as terms.
  const oldEntities = new Map(
    [...previous.querySelectorAll('[data-entity]')].map((node) => [
      node.getAttribute('data-entity'),
      node,
    ]),
  );
  for (const node of current.querySelectorAll('[data-entity]')) {
    const old = oldEntities.get(node.getAttribute('data-entity'));
    if (!old)
      tasks.push(
        animate(node, [{ opacity: 0 }, { opacity: 1 }], timing.duration),
      );
    else {
      const dx = Number(old.getAttribute('x')) - Number(node.getAttribute('x'));
      const dy = Number(old.getAttribute('y')) - Number(node.getAttribute('y'));
      // Opacity uses the destination attribute so crossed-out data stays muted.
      if (node.hasAttribute('data-angle') && old.hasAttribute('data-angle')) {
        const oldAngle = Number(old.getAttribute('data-angle'));
        const angle =
          oldAngle +
          (((Number(node.getAttribute('data-angle')) - oldAngle + 540) % 360) -
            180);
        node.setAttribute(
          'style',
          `transform-origin:${node.getAttribute('x')}px ${node.getAttribute('y')}px;transform:rotate(${Number(node.getAttribute('data-angle'))}deg)`,
        );
        tasks.push(
          animate(
            node,
            [
              {
                transform: `translate(${dx}px, ${dy}px) rotate(${oldAngle}deg)`,
              },
              { transform: `translate(0, 0) rotate(${angle}deg)` },
            ],
            timing.rotation,
          ),
        );
      } else
        tasks.push(
          animate(
            node,
            [
              { transform: `translate(${dx}px, ${dy}px)` },
              { transform: 'translate(0, 0)' },
            ],
            timing.duration,
          ),
        );
      const oldPaint = old.querySelectorAll('rect, path, polygon, line');
      const newPaint = node.querySelectorAll('rect, path, polygon, line');
      if (oldPaint.length === newPaint.length)
        newPaint.forEach((shape, i) => {
          const from = {},
            to = {};
          for (const attribute of ['fill', 'stroke'])
            if (
              shape.hasAttribute(attribute) &&
              oldPaint[i].hasAttribute(attribute) &&
              shape.getAttribute(attribute) !==
                oldPaint[i].getAttribute(attribute)
            ) {
              from[attribute] = oldPaint[i].getAttribute(attribute);
              to[attribute] = shape.getAttribute(attribute);
            }
          if (Object.keys(to).length)
            tasks.push(animate(shape, [from, to], timing.duration));
        });
      if (old.getAttribute('opacity') !== node.getAttribute('opacity'))
        tasks.push(
          animate(
            node,
            [
              { opacity: Number(old.getAttribute('opacity') || 1) },
              { opacity: Number(node.getAttribute('opacity') || 1) },
            ],
            timing.duration,
          ),
        );
    }
  }
  current.querySelectorAll('[data-object]').forEach((node) => {
    if (!oldObjects.has(node.getAttribute('data-object')))
      tasks.push(
        animate(node, [{ opacity: 0 }, { opacity: 1 }], timing.duration),
      );
  });
  await Promise.all(tasks);
}
