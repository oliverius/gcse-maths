export function createPresentation(doc, onChange) {
  let fallback = false;
  let pending = false;
  const active = () => fallback || Boolean(doc.fullscreenElement);
  const notify = () => onChange(active());
  doc.addEventListener('fullscreenchange', () => { if (doc.fullscreenElement) fallback = false; notify(); });
  doc.addEventListener('keydown', event => { if (event.key === 'Escape' && fallback) { fallback = false; notify(); } });
  return {
    get active() { return active(); },
    async toggle() {
      if (pending) return;
      pending = true;
      try {
        if (active()) {
          if (doc.fullscreenElement && doc.exitFullscreen) {
            try { await doc.exitFullscreen(); } catch { /* Keep the exit control visible if the browser rejects exiting. */ }
          }
          fallback = false;
        } else {
          try {
            if (!doc.documentElement.requestFullscreen) throw new Error('Use in-page presentation.');
            await doc.documentElement.requestFullscreen();
            fallback = !doc.fullscreenElement;
          } catch { fallback = true; }
        }
      } finally { pending = false; notify(); }
    }
  };
}
