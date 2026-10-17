// Stable term IDs connect mathematical states across transitions.
const term = (id, text, tone = 'original') => ({ id, text, tone });
const x = term('x', 'x');
const two = term('two', '2');
const step = (title, left, right, balance, explanation, detail = '', extra = {}) => ({ title, left, right, balance, explanation, detail, ...extra });
function equationLesson(subtract) {
  const sign = subtract ? '−' : '+';
  const inverse = subtract ? '+' : '−';
  const original = term('original-three', `${sign} 3`, subtract ? 'negative' : 'original');
  const addedLeft = term('added-left', `${inverse} 3`, 'operation');
  const addedRight = term('added-right', `${inverse} 3`, 'operation');
  const answer = subtract ? '5' : '−1';
  const operation = subtract ? 'Add 3' : 'Subtract 3';
  return {
    id: subtract ? 'add-both' : 'subtract-both', label: `x ${sign} 3 = 2`, kind: 'balance', topic: 'Algebra · keep both sides equal',
    steps: [
      step('Find the value of x', [x, original], [two], 0, 'Our goal is to leave x on its own.', `The two sides are equal. ${operation} on both sides to undo ${subtract ? 'subtracting' : 'adding'} 3.`),
      step(`${operation} on the left`, [x, original, addedLeft], [two], subtract ? -1 : 1, `${operation} on the left only. The sides are now unequal.`, 'This is an intentionally unequal demonstration, not a valid equation. We must do the same to the right.', { highlight: ['added-left'] }),
      step(`${operation} on the right too`, [x, original, addedLeft], [two, addedRight], 0, 'The same operation on both sides restores equality.', 'The beam is level again. Both new terms have the same purple colour.', { highlight: ['added-right'] }),
      step('Opposites make zero', [x, term('zero', '+ 0')], [term('answer', answer, subtract ? 'original' : 'negative')], 0, `${sign}3 and ${inverse}3 cancel: together they make zero.`, subtract ? 'On the right, 2 + 3 makes 5.' : 'On the right, 2 − 3 = −1: start at 2, count back 3, and go one below zero.', { cancel: ['original-three', 'added-left'] }),
      step(`The answer is x = ${answer}`, [x], [term('answer', answer, subtract ? 'original' : 'negative')], 0, `Adding zero changes nothing. So x = ${answer}.`, subtract ? 'Check: 5 − 3 = 2. Both sides are equal.' : 'A negative answer is allowed. Check: −1 + 3 = 2. Both sides are equal.')
    ]
  };
}
const six = term('six', '6');
const times = term('times', '×');
const brackets = term('brackets', '(2 + 3)');
const five = term('five', '5', 'operation');
export const lessons = [equationLesson(true), equationLesson(false), {
  id: 'brackets', label: '6 × (2 + 3)', kind: 'expression', topic: 'Arithmetic · brackets first', steps: [
    step('Look inside the brackets', [six, times, brackets], [], null, 'The brackets group 2 + 3 together.', 'Work out this group before multiplying.'),
    step('Brackets come first', [six, times, brackets], [], null, 'First, focus on 2 + 3.', 'Keep the 6 and the multiplication sign where they are.', { highlight: ['brackets'] }),
    step('Work out the group', [six, times, five], [], null, '2 + 3 = 5. Replace the bracketed group with 5.', 'The value of the group stays the same.', { working: '2 + 3 = 5', highlight: ['five'] }),
    step('Now multiply', [six, times, five], [], null, 'We now have 6 × 5.', 'That means six groups of five.'),
    step('The answer is 30', [term('result', '30')], [], null, '6 × 5 = 30.', 'Brackets first, then multiplication.')
  ]
}];
