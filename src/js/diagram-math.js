// Keep positioned KaTeX HTML out of SVG foreignObject: Safari can paint its
// layers in the wrong coordinate system. Empty SVG slots retain the geometry
// and animation identities; ordinary HTML follows their screen matrices.
export function mountDiagramMath(host, svg) {
  // Non-layout DOM adapters retain the original notation for unit tests.
  if (!svg.getScreenCTM)
    return {
      dispose() {},
      async during(task) {
        return task();
      },
    };
  const layer = document.createElement('div');
  layer.className = 'diagram-math-layer';
  layer.setAttribute('aria-hidden', 'true');
  const entries = [...svg.querySelectorAll('foreignObject.math-object')].map(
    (slot) => {
      const overlay = document.createElement('div');
      overlay.append(slot.firstElementChild);
      layer.append(overlay);
      slot.mathOverlay = overlay;
      return { slot, overlay };
    },
  );
  host.append(layer);
  function sync() {
    const origin = layer.getBoundingClientRect();
    for (const { slot, overlay } of entries) {
      const matrix = slot.getScreenCTM();
      if (!matrix) continue;
      // foreignObject x/y locate the viewport inside its SVG coordinate system;
      // getScreenCTM maps that coordinate system, so apply the slot origin too.
      const x = Number(slot.getAttribute('x'));
      const y = Number(slot.getAttribute('y'));
      const left = matrix.a * x + matrix.c * y + matrix.e - origin.left;
      const top = matrix.b * x + matrix.d * y + matrix.f - origin.top;
      let opacity = 1;
      for (let node = slot; node && node !== svg; node = node.parentElement)
        opacity *= Number(getComputedStyle(node).opacity);
      overlay.className = `${slot.getAttribute('class')} math-overlay`;
      Object.assign(overlay.style, {
        width: `${slot.getAttribute('width')}px`,
        height: `${slot.getAttribute('height')}px`,
        transform: `matrix(${matrix.a},${matrix.b},${matrix.c},${matrix.d},${left},${top})`,
        opacity: String(opacity),
      });
    }
  }
  sync();
  const observer = new ResizeObserver(sync);
  observer.observe(host);
  observer.observe(svg);
  let frame;
  return {
    async during(task) {
      const tick = () => {
        sync();
        frame = requestAnimationFrame(tick);
      };
      tick();
      try {
        return await task();
      } finally {
        cancelAnimationFrame(frame);
        sync();
      }
    },
    dispose() {
      observer.disconnect();
      cancelAnimationFrame(frame);
      layer.remove();
    },
  };
}
