export function createLessonEngine(lesson) {
  let index = 0;
  let busy = false;
  return {
    get index() {
      return index;
    },
    get busy() {
      return busy;
    },
    get state() {
      return lesson.steps[index];
    },
    async go(target, present = async (_state, _forward, commit) => commit()) {
      if (
        busy ||
        !Number.isInteger(target) ||
        target < 0 ||
        target >= lesson.steps.length
      )
        return false;
      busy = true;
      const previous = index;
      try {
        await present(lesson.steps[target], target === previous + 1, () => {
          index = target;
        });
        return true;
      } catch (error) {
        index = previous;
        throw error;
      } finally {
        busy = false;
      }
    },
  };
}
