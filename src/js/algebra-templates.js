import { instantiateLesson, validateExamples } from './lesson-templates.js';

// Preserve the algebra API for callers selecting a curated algebra example.
export function instantiateAlgebraLesson(template, example) {
  return instantiateLesson(template, example, 'algebra');
}
export function validateAlgebraExamples(data, templates) {
  return validateExamples(data, templates, 'algebra');
}
