// Exact outward squares on an anticlockwise right triangle in SVG coordinates.
export function pythagorasGeometry(a, b) {
  const vertices = { A: [0, 0], B: [a, 0], C: [0, -b] };
  const edges = {
    a: [vertices.A, vertices.B],
    b: [vertices.C, vertices.A],
    c: [vertices.B, vertices.C],
  };
  const squares = Object.fromEntries(
    Object.entries(edges).map(([id, [p, q]]) => {
      const vector = [q[0] - p[0], q[1] - p[1]],
        length = Math.hypot(...vector);
      const e = vector.map((v) => v / length),
        n = [-e[1], e[0]];
      const points = [
        p,
        q,
        [q[0] + n[0] * length, q[1] + n[1] * length],
        [p[0] + n[0] * length, p[1] + n[1] * length],
      ];
      return [
        id,
        {
          points,
          origin: p,
          e,
          n,
          length,
          angle: (Math.atan2(e[1], e[0]) * 180) / Math.PI,
          centre: points.reduce(
            (sum, v) => [sum[0] + v[0] / 4, sum[1] + v[1] / 4],
            [0, 0],
          ),
        },
      ];
    }),
  );
  return { vertices, squares };
}
export function isPrime(value) {
  if (!Number.isInteger(value) || value < 2) return false;
  for (let divisor = 2; divisor * divisor <= value; divisor++)
    if (value % divisor === 0) return false;
  return true;
}
