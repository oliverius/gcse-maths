import { linearExpression } from './mathematics.js';
import { validateNotation } from './notation.js';
import { diagramOperations, validateDiagram } from './diagram-state.js';
export const operations = new Set([
  'show',
  'apply-left',
  'apply-right',
  'apply-both',
  'cancel',
  'simplify',
  'highlight',
  'replace',
  'group',
  'split',
  'distribute',
  'move',
  'partition',
]);
export const renderers = new Set([
  'balance',
  'expression',
  'number-line',
  'fractions',
  ...Object.keys(diagramOperations),
]);
const fail = (message) => {
  throw new Error(message);
};
const text = (value) => typeof value === 'string' && value.trim().length > 0;
const finite = (value) => typeof value === 'number' && Number.isFinite(value);
export function validateManifest(manifest) {
  if (
    !manifest ||
    !Array.isArray(manifest.areas) ||
    manifest.areas.length !== 6
  )
    fail('Expected six curriculum areas.');
  const ids = new Set();
  for (const area of manifest.areas) {
    if (
      !text(area.id) ||
      ids.has(area.id) ||
      !text(area.title) ||
      !/^\.\/[a-z-]+\.json$/.test(area.file)
    )
      fail('Invalid curriculum area.');
    ids.add(area.id);
  }
  return manifest;
}
export function validateLesson(lesson, area) {
  if (
    !lesson ||
    !text(lesson.id) ||
    !text(lesson.title) ||
    lesson.subjectArea !== area ||
    lesson.tier !== 'Foundation' ||
    typeof lesson.available !== 'boolean'
  )
    fail('Invalid lesson metadata.');
  if (!lesson.available) return lesson;
  validateNotation(lesson.notation);
  if (
    !text(lesson.objective) ||
    !text(lesson.initialExpression) ||
    !renderers.has(lesson.kind) ||
    !Array.isArray(lesson.steps) ||
    lesson.steps.length < 2
  )
    fail('Incomplete lesson.');
  if (!Array.isArray(lesson.curriculum) || !lesson.curriculum.length)
    fail('Missing curriculum reference.');
  for (const ref of lesson.curriculum) {
    if (
      !text(ref.provider) ||
      !text(ref.title) ||
      !/^https:\/\/(www\.aqa\.org\.uk|www\.gov\.uk)\//.test(ref.url)
    )
      fail('Invalid official curriculum reference.');
  }
  if (
    !lesson.tutorNotes ||
    !text(lesson.tutorNotes.checkQuestion) ||
    !text(lesson.tutorNotes.misconception) ||
    !text(lesson.tutorNotes.observe)
  )
    fail('Missing tutor notes.');
  if (!Array.isArray(lesson.prerequisites) || !lesson.prerequisites.every(text))
    fail('Invalid prerequisites.');
  if (
    lesson.prerequisiteLessonIds !== undefined &&
    (!Array.isArray(lesson.prerequisiteLessonIds) ||
      !lesson.prerequisiteLessonIds.every(text) ||
      lesson.prerequisiteLessonIds.includes(lesson.id))
  )
    fail('Invalid prerequisite lesson IDs.');
  for (const state of lesson.steps) {
    if (
      !operations.has(state.operation?.type) ||
      !text(state.title) ||
      !text(state.explanation) ||
      !Array.isArray(state.left) ||
      !Array.isArray(state.right)
    )
      fail('Invalid step or unsupported operation.');
    const supported = {
      balance: [
        'show',
        'apply-left',
        'apply-right',
        'apply-both',
        'cancel',
        'simplify',
        'highlight',
        'group',
        'split',
      ],
      expression: [
        'show',
        'highlight',
        'replace',
        'simplify',
        'group',
        'distribute',
      ],
      'number-line': ['show', 'move', 'simplify'],
      fractions: ['show', 'partition'],
      ...diagramOperations,
    };
    if (
      !supported[lesson.kind].includes(state.operation.type) ||
      !state.left.length
    )
      fail('This renderer does not support that operation.');
    if ('value' in state.operation && !finite(state.operation.value))
      fail('Invalid operation value.');
    if (diagramOperations[lesson.kind]) validateDiagram(lesson, state);
    const terms = [...state.left, ...state.right];
    terms.forEach(validateNotation);
    for (const field of [
      'titleContent',
      'explanationContent',
      'detailContent',
    ]) {
      if (state[field] !== undefined) {
        if (!Array.isArray(state[field])) fail('Invalid text content.');
        state[field].forEach((part) => {
          if (typeof part.text !== 'string') validateNotation(part);
        });
      }
    }
    if (state.working) validateNotation(state.workingNotation);
    const ids = terms.map((t) => t.id);
    if (
      new Set(ids).size !== ids.length ||
      !terms.every(
        (t) =>
          text(t.id) &&
          text(t.text) &&
          ['original', 'negative', 'operation'].includes(t.tone),
      )
    )
      fail('Invalid term identities.');
    if (
      state.highlight &&
      (!Array.isArray(state.highlight) ||
        !state.highlight.every((id) => ids.includes(id)))
    )
      fail('Unknown highlighted term.');
    if (lesson.kind === 'balance') {
      if (
        ![-1, 0, 1].includes(state.balance) ||
        typeof state.unbalanced !== 'boolean' ||
        state.unbalanced !== (state.balance !== 0)
      )
        fail('Balance must explicitly declare inequality.');
      const m = state.math;
      if (
        !m ||
        ![
          m.left?.coefficient,
          m.left?.constant,
          m.right?.coefficient,
          m.right?.constant,
        ].every(finite)
      )
        fail('Missing affine equation state.');
      for (const side of ['left', 'right']) {
        const visible = linearExpression(
          state[side].map((t) => t.text).join(' '),
        );
        if (
          Math.abs(visible.coefficient - m[side].coefficient) > 1e-9 ||
          Math.abs(visible.constant - m[side].constant) > 1e-9
        )
          fail('Visible equation does not match mathematical state.');
      }
      const coefficient = m.left.coefficient - m.right.coefficient;
      const constant = m.right.constant - m.left.constant;
      if (!finite(lesson.solution)) fail('Missing solution.');
      const equal = Math.abs(coefficient * lesson.solution - constant) < 1e-9;
      if (equal === state.unbalanced)
        fail('Equation does not match its balance state.');
      if (
        !state.unbalanced &&
        (coefficient === 0 ||
          Math.abs(constant / coefficient - lesson.solution) > 1e-9)
      )
        fail('Equation is not equivalent to the initial solution.');
    } else if (state.balance !== null)
      fail('Expressions must not show a balance.');
    if (
      lesson.kind === 'number-line' &&
      (!finite(state.position) || state.position < -5 || state.position > 5)
    )
      fail('Invalid number-line position.');
    if (
      lesson.kind === 'fractions' &&
      (!Array.isArray(state.bars) ||
        !state.bars.every(
          (b) =>
            text(b.id) &&
            Number.isInteger(b.parts) &&
            b.parts > 0 &&
            b.parts <= 12 &&
            Number.isInteger(b.shaded) &&
            b.shaded >= 0 &&
            b.shaded <= b.parts,
        ))
    )
      fail('Invalid fraction bars.');
    if (
      state.groups &&
      (!Array.isArray(state.groups) ||
        !state.groups.every(
          (g) =>
            text(g.id) &&
            text(g.label) &&
            Array.isArray(g.items) &&
            g.items.every((t) => text(t.id) && text(t.text)),
        ))
    )
      fail('Invalid groups.');
    if (state.groups) {
      state.groups.flatMap((g) => g.items).forEach(validateNotation);
      const objectIds = [
        ...ids,
        ...state.groups.flatMap((g) => g.items.map((t) => t.id)),
      ];
      if (
        new Set(objectIds).size !== objectIds.length ||
        new Set(state.groups.map((g) => g.id)).size !== state.groups.length
      )
        fail('Duplicate visual object IDs.');
    }
  }
  lesson.steps.forEach((state, index) => {
    if (
      state.cancel &&
      (!index ||
        !Array.isArray(state.cancel) ||
        !state.cancel.every((id) =>
          [
            ...lesson.steps[index - 1].left,
            ...lesson.steps[index - 1].right,
          ].some((t) => t.id === id),
        ))
    )
      fail('Unknown cancellation pair.');
    if (state.cancel) {
      const preceding = [
        ...lesson.steps[index - 1].left,
        ...lesson.steps[index - 1].right,
      ];
      const pair = state.cancel.map((id) =>
        linearExpression(preceding.find((t) => t.id === id).text),
      );
      if (
        pair.length !== 2 ||
        pair[0].coefficient + pair[1].coefficient !== 0 ||
        pair[0].constant + pair[1].constant !== 0
      )
        fail('Cancellation requires opposite terms.');
    }
  });
  return lesson;
}
