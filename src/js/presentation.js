export function createPresentation(doc, onChange) {
  let fallback = false;
  let pending = false;
  const active = () => fallback || Boolean(doc.fullscreenElement);
  const notify = () => onChange(active());
  doc.addEventListener('fullscreenchange', () => {
    if (doc.fullscreenElement) fallback = false;
    notify();
  });
  doc.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && fallback) {
      fallback = false;
      notify();
    }
  });
  return {
    get active() {
      return active();
    },
    async toggle() {
      if (pending) return;
      pending = true;
      try {
        if (active()) {
          if (doc.fullscreenElement && doc.exitFullscreen) {
            try {
              await doc.exitFullscreen();
            } catch (error) {
              console.warn('Could not exit native fullscreen.', error);
            }
          }
          fallback = false;
        } else {
          try {
            if (doc.documentElement.requestFullscreen) {
              await doc.documentElement.requestFullscreen();
              fallback = !doc.fullscreenElement;
            } else {
              fallback = true;
            }
          } catch (error) {
            console.warn(
              'Native fullscreen failed; using in-page presentation.',
              error,
            );
            fallback = true;
          }
        }
      } finally {
        pending = false;
        notify();
      }
    },
  };
}
