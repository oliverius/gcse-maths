import { createLoader } from './lesson-loader.js';
import { createLessonEngine } from './lesson-engine.js';
import { draw, describe } from './renderers.js';
import { cancelTerms, transition } from './animations.js';
import { createPresentation } from './presentation.js';
import { renderMath, renderContent, prepareNotation } from './notation.js';
const byId = id => document.getElementById(id);
const visual = byId('visual');
let current;
let engine;
let busy = false;
const lessonButtons = [];
const narrow = window.matchMedia('(max-width: 999px)');
let sidebarOpen = !narrow.matches;
function sidebar(open, restoreFocus = false) {
  sidebarOpen = open;
  byId('sidebar').hidden = !open;
  byId('menu').setAttribute('aria-expanded', String(open));
  byId('menu').textContent = open ? 'Close lessons' : 'Choose a lesson';
  if (restoreFocus) byId('menu').focus();
}
byId('menu').addEventListener('click', () => sidebar(!sidebarOpen));
narrow.addEventListener('change', () => sidebar(!narrow.matches));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && narrow.matches && sidebarOpen) sidebar(false, true); });
const presentation = createPresentation(document, active => {
  document.body.classList.toggle('presentation', active);
  byId('fullscreen').textContent = active ? 'Exit full screen' : 'Full screen';
  byId('fullscreen').setAttribute('aria-pressed', String(active));
  if (active) sidebar(false);
});
byId('fullscreen').addEventListener('click', () => presentation.toggle());
function controls() {
  lessonButtons.forEach(({ button, lesson }) => { button.disabled = busy; button.setAttribute('aria-pressed', String(lesson.id === current?.id)); });
  byId('back').disabled = busy || !engine || engine.index === 0;
  byId('replay').disabled = busy || !engine;
  byId('next').disabled = busy || !engine || engine.index === current.steps.length - 1;
  visual.setAttribute('aria-busy', String(busy));
}
function render() {
  const state = engine.state;
  byId('topic').textContent = `${current.subjectArea === 'algebra' ? 'Algebra' : 'Number'} · Foundation`;
  renderMath(byId('lesson-title'), current.notation);
  byId('counter').textContent = `Step ${engine.index + 1} of ${current.steps.length}`;
  renderContent(byId('step-title'), state.titleContent, state.title);
  renderContent(byId('explanation'), state.explanationContent, state.explanation);
  renderContent(byId('detail'), state.detailContent, state.detail || '');
  visual.setAttribute('aria-label', describe(current, state));
  visual.classList.toggle('has-groups', Boolean(state.groups));
  const svg = draw(current, state);
  visual.replaceChildren(svg);
  return svg;
}
function reference(ref) {
  const link = document.createElement('a');
  link.textContent = `${ref.provider}${ref.reference ? ` ${ref.reference}` : ''}: ${ref.title}`;
  link.href = ref.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
  return link;
}
function notes() {
  byId('references').replaceChildren(...current.curriculum.map(reference));
  byId('tutor-notes').open = false;
  const content = byId('tutor-content'); content.replaceChildren();
  const fields = [['Learning objective', current.objective], ['Prerequisites', current.prerequisites.join('; ')], ['Observe', current.tutorNotes.observe], ['Watch for', current.tutorNotes.misconception], ['Ask', current.tutorNotes.checkQuestion]];
  for (const [label, value] of fields) {
    const paragraph = document.createElement('p'); paragraph.textContent = `${label}: ${value}`; content.append(paragraph);
  }
  current.curriculum.forEach(ref => content.append(reference(ref)));
}
function choose(lesson, focus = true) {
  if (busy) return;
  current = lesson; engine = createLessonEngine(current);
  byId('error').hidden = true;
  render(); notes(); controls();
  lessonButtons.forEach(({ button, lesson: candidate }) => {
    if (candidate.id === current.id) {
      const area = button.closest('details'); area.open = true;
      byId('lessons').querySelectorAll('details').forEach(details => {
        if (details === area) details.setAttribute('data-active', 'true'); else details.removeAttribute('data-active');
      });
    }
  });
  if (narrow.matches) sidebar(false);
  if (focus) byId('lesson-title').focus();
}
async function navigate(target) {
  if (busy || !engine) return;
  busy = true; controls();
  try {
    await engine.go(target, async (state, forward, commit) => {
      const previous = visual.firstElementChild;
      if (forward && state.cancel) await cancelTerms(visual, state.cancel);
      commit();
      const next = render();
      if (forward) await transition(previous, next);
    });
  } catch {
    render();
    byId('error').textContent = 'That animation could not finish. Your previous step has been restored. Please try again.';
    byId('error').hidden = false;
  } finally { busy = false; controls(); }
}
byId('back').addEventListener('click', () => navigate(engine.index - 1));
byId('replay').addEventListener('click', () => navigate(0));
byId('next').addEventListener('click', () => navigate(engine.index + 1));
export const ready = (async () => {
  controls(); sidebar(sidebarOpen);
  try {
    await prepareNotation();
    const areas = await createLoader().load();
    for (const area of areas) {
      const details = document.createElement('details');
      const summary = document.createElement('summary'); summary.textContent = area.title; details.append(summary);
      for (const lesson of area.lessons) {
        if (lesson.available) {
          const button = document.createElement('button'); renderMath(button, lesson.notation);
          button.setAttribute('data-lesson', lesson.id);
          button.addEventListener('click', () => choose(lesson));
          details.append(button); lessonButtons.push({ button, lesson });
        } else {
          const planned = document.createElement('p'); planned.className = 'planned'; planned.textContent = `${lesson.title} · Coming later`; details.append(planned);
        }
      }
      for (const message of area.errors) { const p = document.createElement('p'); p.className = 'load-error'; p.textContent = message; details.append(p); }
      byId('lessons').append(details);
    }
    const initial = lessonButtons.find(entry => entry.lesson.kind === 'balance') || lessonButtons[0];
    if (!initial) throw new Error('No lessons available.');
    choose(initial.lesson, false);
  } catch {
    byId('error').textContent = 'Lessons could not be loaded. Please use the local HTTP server or reload the page to try again.';
    byId('error').hidden = false;
  }
})();
