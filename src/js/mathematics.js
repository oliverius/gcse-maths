// Parse linear arithmetic only; lesson content is never executable code.
export function linearExpression(source) {
  const normalized = source
    .replaceAll('−', '-')
    .replaceAll('×', '*')
    .replaceAll('÷', '/')
    .replace(/\s/g, '')
    .replace(/(\d|\))(?=x|\()/g, '$1*');
  const tokens = normalized.match(/\d+(?:\.\d+)?|x|[()+*/-]/g) || [];
  if (tokens.join('') !== normalized)
    throw new Error('Unsupported mathematical notation.');
  let index = 0;
  const plus = (a, b, sign = 1) => ({
    coefficient: a.coefficient + sign * b.coefficient,
    constant: a.constant + sign * b.constant,
  });
  function atom() {
    const token = tokens[index++];
    if (token === '-') {
      const a = atom();
      return { coefficient: -a.coefficient, constant: -a.constant };
    }
    if (token === '+') return atom();
    if (token === '(') {
      const a = sum();
      if (tokens[index++] !== ')') throw new Error('Missing bracket.');
      return a;
    }
    if (token === 'x') return { coefficient: 1, constant: 0 };
    if (token && /^\d/.test(token))
      return { coefficient: 0, constant: Number(token) };
    throw new Error('Expected a number or x.');
  }
  function product() {
    let a = atom();
    while (['*', '/'].includes(tokens[index])) {
      const operation = tokens[index++];
      const b = atom();
      if (operation === '/') {
        if (b.coefficient || b.constant === 0)
          throw new Error('Division requires a nonzero constant.');
        a = {
          coefficient: a.coefficient / b.constant,
          constant: a.constant / b.constant,
        };
      } else {
        if (a.coefficient && b.coefficient)
          throw new Error('Only linear expressions are supported.');
        a = {
          coefficient: a.coefficient * b.constant + b.coefficient * a.constant,
          constant: a.constant * b.constant,
        };
      }
    }
    return a;
  }
  function sum() {
    let a = product();
    while (['+', '-'].includes(tokens[index])) {
      const operation = tokens[index++];
      a = plus(a, product(), operation === '+' ? 1 : -1);
    }
    return a;
  }
  const result = sum();
  if (index !== tokens.length)
    throw new Error('Unexpected mathematical symbol.');
  return result;
}
