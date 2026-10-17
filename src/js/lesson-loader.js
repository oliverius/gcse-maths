import { validateLesson, validateManifest } from './lesson-validation.js';
import { instantiateLesson, validateExamples } from './lesson-templates.js';
export function createLoader(
  fetcher = fetch,
  base = new URL('../data/manifest.json', import.meta.url),
) {
  const cache = new Map();
  async function json(url) {
    if (!cache.has(url.href))
      cache.set(
        url.href,
        (async () => {
          const response = await fetcher(url);
          if (!response.ok)
            throw new Error('The lesson file could not be downloaded.');
          return response.json();
        })().catch((error) => {
          cache.delete(url.href);
          throw error;
        }),
      );
    return cache.get(url.href);
  }
  return {
    async load() {
      const manifest = validateManifest(await json(base));
      const seen = new Set();
      // Resolve in manifest order so duplicate handling is deterministic.
      const files = await Promise.allSettled(
        manifest.areas.map(async (area) => {
          const subject = await json(new URL(area.file, base));
          if (!['algebra', 'number', 'ratio'].includes(area.id)) return subject;
          const examples = validateExamples(
            await json(new URL(`./${area.id}-examples.json`, base)),
            subject.lessons,
            area.id,
          );
          return { ...subject, examples };
        }),
      );
      return manifest.areas.map((area, i) => {
        const result = files[i];
        const errors = [];
        const lessons = [];
        if (result.status === 'rejected')
          console.error(
            `Subject ${area.id} could not be loaded.`,
            result.reason,
          );
        if (
          result.status === 'rejected' ||
          result.value?.id !== area.id ||
          !Array.isArray(result.value?.lessons)
        )
          return {
            ...area,
            lessons,
            errors: [
              'This subject could not be loaded. Please reload to try again.',
            ],
          };
        for (const candidate of result.value.lessons) {
          try {
            let lesson;
            if (result.value.examples && candidate.available) {
              const examples = result.value.examples.get(candidate.id);
              if (!examples?.length)
                throw new Error('Missing curated lesson examples.');
              // Validate the whole curated set; the existing lesson shows the first.
              lesson = examples.map((example) =>
                instantiateLesson(candidate, example),
              )[0];
            } else {
              lesson = validateLesson(candidate, area.id);
            }
            if (seen.has(lesson.id)) throw new Error('Duplicate lesson ID.');
            seen.add(lesson.id);
            lessons.push(lesson);
          } catch (error) {
            console.error(
              `Lesson ${candidate?.id ?? '(unknown)'} is unavailable.`,
              error,
            );
            errors.push(
              'A lesson is unavailable because its data needs checking.',
            );
          }
        }
        return { ...area, lessons, errors };
      });
    },
  };
}
