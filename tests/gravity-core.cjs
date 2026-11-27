const assert = require("node:assert/strict");
const C = require("../assets/gravity-core.js");

const straight = C.simulate(C.PORTS[0], 0, 45, []);
assert.ok(
  straight.points.every((p) => p.y === 450),
  "An unforced probe travels straight",
);
assert.ok(straight.points.at(-1).x > C.WIDTH);
const above = [{ x: 530, y: 330, mu: 3800000 }];
const below = [{ x: 530, y: 570, mu: 3800000 }];
const up = C.simulate(C.PORTS[0], 0, 45, above);
const down = C.simulate(C.PORTS[0], 0, 45, below);
assert.ok(
  up.points.at(-1).y < 300,
  "Gravity produces a visible deflection toward the mass",
);
assert.equal(up.points.length, down.points.length);
for (let i = 0; i < up.points.length; i += 1) {
  assert.ok(Math.abs(up.points[i].x - down.points[i].x) < 1e-8);
  assert.ok(
    Math.abs(up.points[i].y + down.points[i].y - 900) < 1e-8,
    "Reflected masses give reflected trajectories",
  );
}
const one = C.acceleration(320, 260, above);
const two = C.acceleration(320, 260, below);
const sum = C.acceleration(320, 260, [...above, ...below]);
assert.equal(sum.x, one.x + two.x);
assert.equal(sum.y, one.y + two.y);
assert.deepEqual(
  C.acceleration(530, 330, above),
  { x: 0, y: 0 },
  "The softened center has no singularity",
);

const mass = [{ x: 500, y: 450, mu: 3800000 }];
const energy = (p) =>
  0.5 * (p.vx ** 2 + p.vy ** 2) -
  mass[0].mu /
    Math.sqrt((p.x - 500) ** 2 + (p.y - 450) ** 2 + C.SOFTENING ** 2);
let probe = { x: 500, y: 650, vx: 125, vy: 0 };
const initialEnergy = energy(probe);
let maxDrift = 0;
for (let i = 0; i < 3600; i += 1) {
  probe = C.step(probe, mass, 1 / 120);
  assert.ok(Object.values(probe).every(Number.isFinite));
  maxDrift = Math.max(
    maxDrift,
    Math.abs((energy(probe) - initialEnergy) / initialEnergy),
  );
}
assert.ok(
  maxDrift < 0.0001,
  `Energy should remain stable over 30 simulated seconds; drift ${maxDrift}`,
);

for (let level = 0; level < 3; level += 1) {
  for (let seed = 0; seed < 300; seed += 1) {
    const round = C.makeRound(level, seed * 741103);
    assert.deepEqual(
      round,
      C.makeRound(level, seed * 741103),
      "Seeded maps are reproducible",
    );
    assert.equal(round.masses.length, level === 2 ? 2 : 1);
    assert.ok(
      round.masses.every(
        (m) => m.x >= 280 && m.x <= 720 && m.y >= 200 && m.y <= 700 && m.mu > 0,
      ),
    );
    if (level === 2)
      assert.ok(
        Math.hypot(
          round.masses[0].x - round.masses[1].x,
          round.masses[0].y - round.masses[1].y,
        ) >= 270,
      );
    for (const source of C.PORTS) {
      const path = C.simulate(source, source.angle, seed % 101, round.masses);
      assert.ok(
        path.points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
      );
      assert.ok(path.seconds <= 8);
    }
  }
}
const pair = [
  { x: 300, y: 300 },
  { x: 700, y: 600 },
];
assert.equal(
  C.evaluate(pair, [...pair].reverse(), 2).stars,
  3,
  "Marker order does not matter",
);
assert.equal(
  C.evaluate(pair, pair, 5).stars,
  2,
  "Clearing trails cannot erase the shot cost",
);
assert.equal(
  C.evaluate(
    pair,
    [
      { x: 310, y: 300 },
      { x: 900, y: 600 },
    ],
    2,
  ).stars,
  1,
  "Both hidden masses must be located",
);
assert.equal(
  C.evaluate(
    pair,
    [
      { x: 40, y: 40 },
      { x: 60, y: 60 },
    ],
    1,
  ).stars,
  0,
);
assert.equal(C.evaluate(pair, [pair[0]], 1), null);
assert.equal(C.evaluate(pair, pair, 0), null);
console.log(
  "Gravity mechanics passed: deflection, symmetry, superposition, stable energy, 900 seeded maps, scoring and marker matching.",
);
