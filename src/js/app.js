import { lessons } from './lessons.js';
import { draw } from './balance.js';
import { cancelTerms, transition } from './animations.js';
let lessonIndex = 0;
let stepIndex = 0;
let busy = false;
const byId = id => document.getElementById(id);
const visual = byId('visual');
const lessonButtons = lessons.map((lesson, index) => {
  const button = document.createElement('button');
  button.textContent = lesson.label;
  button.addEventListener('click', () => navigate(index, 0));
  byId('lessons').append(button);
  return button;
});
function controls() {
  lessonButtons.forEach((button, index) => { button.disabled = busy; button.setAttribute('aria-pressed', String(index === lessonIndex)); });
  byId('back').disabled = busy || stepIndex === 0;
  byId('replay').disabled = busy;
  byId('next').disabled = busy || stepIndex === lessons[lessonIndex].steps.length - 1;
  visual.setAttribute('aria-busy', String(busy));
}
function render() {
  const lesson = lessons[lessonIndex];
  const state = lesson.steps[stepIndex];
  byId('topic').textContent = lesson.topic;
  byId('counter').textContent = `Step ${stepIndex + 1} of ${lesson.steps.length}`;
  byId('step-title').textContent = state.title;
  byId('explanation').textContent = state.explanation;
  byId('detail').textContent = state.detail;
  const expression = `${state.left.map(t => t.text).join(' ')}${lesson.kind === 'balance' ? ` ${state.balance === 0 ? '=' : '≠'} ${state.right.map(t => t.text).join(' ')}` : ''}`;
  visual.setAttribute('aria-label', `${expression}. ${lesson.kind === 'balance' ? state.balance === 0 ? 'The balance is level.' : 'The balance is tilted. The sides are unequal.' : ''}`);
  const svg = draw(lesson, state);
  visual.replaceChildren(svg);
  return svg;
}
async function navigate(nextLesson, nextStep) {
  if (busy || nextStep < 0 || nextStep >= lessons[nextLesson].steps.length) return;
  busy = true;
  controls();
  const previous = visual.firstElementChild;
  try {
    const forward = nextLesson === lessonIndex && nextStep === stepIndex + 1;
    const target = lessons[nextLesson].steps[nextStep];
    if (forward && target.cancel) await cancelTerms(visual, target.cancel);
    lessonIndex = nextLesson;
    stepIndex = nextStep;
    const current = render();
    if (forward) await transition(previous, current);
  } finally { busy = false; controls(); }
}
byId('back').addEventListener('click', () => navigate(lessonIndex, stepIndex - 1));
byId('replay').addEventListener('click', () => navigate(lessonIndex, 0));
byId('next').addEventListener('click', () => navigate(lessonIndex, stepIndex + 1));
render();
controls();
