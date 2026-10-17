import { validateLesson } from './lesson-validation.js';

const own = (object, key) => Object.hasOwn(object, key);
const words = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
];
function numberWords(value) {
  if (value < 0) return `minus ${numberWords(-value)}`;
  if (value < 20) return words[value];
  const tens = [
    '',
    '',
    'twenty',
    'thirty',
    'forty',
    'fifty',
    'sixty',
    'seventy',
    'eighty',
    'ninety',
  ];
  if (value < 100)
    return (
      tens[Math.floor(value / 10)] + (value % 10 ? `-${words[value % 10]}` : '')
    );
  if (value < 1000)
    return `${words[Math.floor(value / 100)]} hundred${value % 100 ? ` and ${numberWords(value % 100)}` : ''}`;
  return String(value);
}

function gcd(a, b) {
  while (b) [a, b] = [b, a % b];
  return Math.abs(a);
}

// A small data-only vocabulary; template JSON never executes JavaScript.
function calculate(expression, values) {
  if (typeof expression === 'number') return expression;
  if (typeof expression === 'string' && own(values, expression))
    return values[expression];
  if (
    !expression ||
    typeof expression !== 'object' ||
    Array.isArray(expression) ||
    Object.keys(expression).length !== 1
  )
    throw new Error('Invalid lesson calculation.');
  const [operation, operands] = Object.entries(expression)[0];
  if (!Array.isArray(operands) || operands.length !== 2)
    throw new Error('Expected two lesson operands.');
  const [a, b] = operands.map((operand) => calculate(operand, values));
  const operations = {
    add: () => a + b,
    subtract: () => a - b,
    multiply: () => a * b,
    divide: () => a / b,
    power: () => a ** b,
    gcd: () => {
      if (!Number.isInteger(a) || !Number.isInteger(b))
        throw new Error('GCD needs integers.');
      return gcd(a, b);
    },
  };
  if (!own(operations, operation))
    throw new Error('Unsupported lesson calculation.');
  const result = operations[operation]();
  if (!Number.isFinite(result) || Math.abs(result) > 10000)
    throw new Error('Lesson calculation is out of range.');
  return result;
}

function condition(test, values) {
  if (!test || typeof test !== 'object' || Object.keys(test).length !== 1)
    throw new Error('Invalid lesson condition.');
  const [operator, operands] = Object.entries(test)[0];
  if (!Array.isArray(operands) || operands.length !== 2)
    throw new Error('Expected two condition operands.');
  const [a, b] = operands.map((value) => calculate(value, values));
  switch (operator) {
    case 'less':
      return a < b;
    case 'equal':
      return a === b;
    case 'atMost':
      return a <= b;
    default:
      throw new Error('Unsupported lesson condition.');
  }
}

function format(value, style = 'number') {
  const display = String(value).replace('-', '−');
  switch (style) {
    case 'number':
      return String(value);
    case 'display':
      return display;
    case 'spoken':
      return value < 0 ? `minus ${-value}` : String(value);
    case 'words':
      return numberWords(value);
    case 'wordsSpaced':
      return numberWords(value).replaceAll('-', ' ');
    case 'WordsSpaced': {
      const text = format(value, 'wordsSpaced');
      return text[0].toUpperCase() + text.slice(1);
    }
    case 'Words': {
      const text = numberWords(value);
      return text[0].toUpperCase() + text.slice(1);
    }
    case 'position':
      return value === 0
        ? 'to zero'
        : `${numberWords(Math.abs(value))} ${value < 0 ? 'below' : 'above'} zero`;
    case 'negativeNote':
      return value < 0 ? 'A negative answer is allowed. ' : '';
    case 'tone':
      return value < 0 ? 'negative' : 'original';
    case 'part':
      return ['', '', 'half', 'third', 'quarter'][value];
    case 'Part': {
      const part = format(value, 'part');
      return part[0].toUpperCase() + part.slice(1);
    }
    case 'parts':
      return ['', '', 'halves', 'thirds', 'quarters'][value];
    case 'fraction':
      return [
        '',
        '',
        'half',
        'third',
        'quarter',
        'fifth',
        'sixth',
        'seventh',
        'eighth',
        'ninth',
        'tenth',
        'eleventh',
        'twelfth',
      ][value];
    case 'fractions':
      return value === 2 ? 'halves' : `${format(value, 'fraction')}s`;
    case 'Fraction': {
      const text = format(value, 'fraction');
      return text[0].toUpperCase() + text.slice(1);
    }
    case 'ordinal':
      return ['zeroth', 'first', 'second', 'third', 'fourth', 'fifth'][value];
    case 's':
      return value === 1 ? '' : 's';
    case 'verbS':
      return value === 1 ? 's' : '';
    default:
      throw new Error('Unsupported lesson text format.');
  }
}

function expand(node, values) {
  if (typeof node === 'string')
    return node.replace(
      /\{\{([a-zA-Z][a-zA-Z0-9]*)(?:\|([a-zA-Z]+))?\}\}/g,
      (_match, name, style) => {
        if (!own(values, name))
          throw new Error(`Unknown lesson value: ${name}`);
        return format(values[name], style);
      },
    );
  if (Array.isArray(node))
    return node.flatMap((item) => {
      if (!item || !own(item, '$repeat')) return [expand(item, values)];
      const {
        count,
        as,
        item: repeated,
        start = 0,
        derived = {},
      } = item.$repeat;
      const length = calculate(count, values);
      const offset = calculate(start, values);
      if (
        !Number.isInteger(length) ||
        length < 0 ||
        length > 40 ||
        !Number.isInteger(offset) ||
        !/^[a-zA-Z][a-zA-Z0-9]*$/.test(as) ||
        own(values, as)
      )
        throw new Error('Invalid lesson repetition.');
      return Array.from({ length }, (_, index) => {
        const local = { ...values, [as]: offset + index };
        for (const [name, expression] of Object.entries(derived)) {
          if (own(local, name)) throw new Error('Duplicate repetition value.');
          local[name] = calculate(expression, local);
        }
        return expand(repeated, local);
      }).flat();
    });
  if (node && typeof node === 'object') {
    if (own(node, '$value')) return calculate(node.$value, values);
    if (own(node, '$test')) return condition(node.$test, values);
    if (own(node, '$if')) {
      const { test, then: yes, else: no } = node.$if;
      return expand(condition(test, values) ? yes : no, values);
    }
    if (own(node, '$join')) {
      const { items, separator } = node.$join;
      if (!Array.isArray(items) || typeof separator !== 'string')
        throw new Error('Invalid lesson text list.');
      return expand(items, values).join(separator);
    }
    return Object.fromEntries(
      Object.entries(node).map(([key, value]) => [
        expand(key, values),
        expand(value, values),
      ]),
    );
  }
  return node;
}

/** Produce an ordinary lesson from one explicitly selected curated example. */
export function instantiateLesson(
  template,
  example,
  subject = template?.subjectArea,
) {
  if (
    !template?.available ||
    !template.parameters ||
    typeof example?.id !== 'string' ||
    !example.id.startsWith(`${template.id}-`) ||
    !/^[1-9][0-9]*$/.test(example.id.slice(template.id.length + 1))
  )
    throw new Error('Invalid lesson template or example identity.');
  const values = {};
  const parameters = Object.keys(template.parameters);
  if (
    !example.values ||
    Object.keys(example.values).length !== parameters.length
  )
    throw new Error('Unexpected lesson example parameters.');
  for (const name of parameters) {
    const value = example.values[name];
    const { min, max, choices } = template.parameters[name];
    if (
      !Number.isSafeInteger(value) ||
      value <= 0 ||
      value < min ||
      value > max ||
      (choices && !choices.includes(value))
    )
      throw new Error(`Invalid positive integer parameter: ${name}`);
    values[name] = value;
  }
  for (const [name, expression] of Object.entries(template.derived ?? {})) {
    if (own(values, name)) throw new Error('Duplicate lesson value.');
    values[name] = calculate(expression, values);
  }
  for (const name of template.integers ?? [])
    if (!Number.isSafeInteger(values[name]))
      throw new Error('This example requires whole-number groups.');
  for (const constraint of template.constraints ?? []) {
    if (!condition(constraint.test, values))
      throw new Error(
        constraint.message || 'Example does not fit this lesson.',
      );
  }
  const body = Object.fromEntries(
    Object.entries(template).filter(
      ([key]) =>
        !['parameters', 'derived', 'integers', 'constraints'].includes(key),
    ),
  );
  const lesson = expand(body, values);
  lesson.exampleId = example.id;
  for (const state of lesson.steps) {
    if (state.scene?.groups && state.scene.description === undefined)
      state.scene.description = state.scene.groups
        .map((group) => `${group.label}: ${group.items.length} cards`)
        .join('. ');
    if (state.groups) {
      if (state.groups.length > 5) throw new Error('Too many lesson groups.');
      const width = 740 / state.groups.length;
      const columns = Math.min(4, Math.max(1, Math.floor((width - 18) / 45)));
      if (state.groups.some((group) => group.items.length > columns * 3))
        throw new Error('Too many lesson tiles for a readable example.');
    }
  }
  return validateLesson(lesson, subject);
}

export function validateExamples(data, templates, subject) {
  if (data?.id !== subject || !Array.isArray(data.lessons))
    throw new Error('Invalid lesson example collection.');
  const expected = templates.filter((template) => template.available);
  const seen = new Set();
  for (const entry of data.lessons) {
    if (
      seen.has(entry.template) ||
      !expected.some((template) => template.id === entry.template) ||
      !Array.isArray(entry.examples) ||
      !entry.examples.length
    )
      throw new Error('Invalid lesson example collection.');
    seen.add(entry.template);
    const ids = new Set();
    for (const example of entry.examples) {
      if (ids.has(example.id)) throw new Error('Duplicate lesson example ID.');
      ids.add(example.id);
    }
  }
  return new Map(data.lessons.map((entry) => [entry.template, entry.examples]));
}
