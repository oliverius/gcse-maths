import { validateLesson, validateManifest } from './lesson-engine.js';
export function createLoader(fetcher = fetch, base = new URL('../data/manifest.json', import.meta.url)) {
  const cache = new Map();
  async function json(url) {
    if (!cache.has(url.href)) cache.set(url.href, (async () => {
      const response = await fetcher(url);
      if (!response.ok) throw new Error('The lesson file could not be downloaded.');
      return response.json();
    })().catch(error => { cache.delete(url.href); throw error; }));
    return cache.get(url.href);
  }
  return {
    async load() {
      const manifest = validateManifest(await json(base));
      const seen = new Set();
      // Resolve in manifest order so duplicate handling is deterministic.
      const files = await Promise.allSettled(manifest.areas.map(area => json(new URL(area.file, base))));
      return manifest.areas.map((area, i) => {
        const result = files[i];
        const errors = [];
        const lessons = [];
        if (result.status === 'rejected' || result.value?.id !== area.id || !Array.isArray(result.value?.lessons)) return { ...area, lessons, errors: ['This subject could not be loaded. Please reload to try again.'] };
        for (const candidate of result.value.lessons) {
          try {
            const lesson = validateLesson(candidate, area.id);
            if (seen.has(lesson.id)) throw new Error('Duplicate lesson ID.');
            seen.add(lesson.id);
            lessons.push(lesson);
          } catch { errors.push('A lesson is unavailable because its data needs checking.'); }
        }
        return { ...area, lessons, errors };
      });
    }
  };
}
