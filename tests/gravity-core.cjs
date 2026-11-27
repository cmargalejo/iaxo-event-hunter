const assert = require("node:assert/strict");
const C = require("../assets/gravity-core.js");
assert.deepEqual(
  C.MASS_TYPES.map((type) => type.units),
  [1, 2, 4],
);
for (const type of C.MASS_TYPES)
  assert.equal(
    type.mu,
    type.units * C.MASS_TYPES[0].mu,
    "Displayed mass units agree with the actual gravitational strength",
  );

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

const encountered = new Set();
for (let level = 0; level < 3; level += 1) {
  for (let seed = 0; seed < 300; seed += 1) {
    const round = C.makeRound(level, seed * 741103);
    assert.deepEqual(
      round,
      C.makeRound(level, seed * 741103),
      "Seeded maps are reproducible",
    );
    assert.equal(round.masses.length, level === 2 ? 2 : 1);
    round.masses.forEach((m) => {
      encountered.add(m.massClass);
      assert.equal(
        m.mu,
        C.MASS_TYPES.find((type) => type.id === m.massClass).mu,
      );
    });
    if (level === 2)
      assert.notEqual(
        round.masses[0].massClass,
        round.masses[1].massClass,
        "The two-mass sector always has different strengths",
      );
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
assert.equal(
  encountered.size,
  3,
  "Random maps include all three mass quantities",
);
const strengths = C.MASS_TYPES.map((type) =>
  C.acceleration(100, 250, [{ x: 500, y: 450, mu: type.mu }]),
);
assert.equal(strengths[1].x, strengths[0].x * 2);
assert.equal(
  strengths[2].y,
  strengths[1].y * 2,
  "Twice the mass gives twice the attraction at the same location",
);
const pair = [
  { x: 300, y: 300, massClass: "small" },
  { x: 700, y: 600, massClass: "large" },
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
      { x: 310, y: 300, massClass: "small" },
      { x: 900, y: 600, massClass: "large" },
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
      { x: 40, y: 40, massClass: "small" },
      { x: 60, y: 60, massClass: "large" },
    ],
    1,
  ).stars,
  0,
);
assert.equal(C.evaluate(pair, [pair[0]], 1), null);
assert.equal(C.evaluate(pair, pair, 0), null);
assert.equal(
  C.evaluate(pair, [{ x: 300, y: 300 }, pair[1]], 1),
  null,
  "Mass estimates are required",
);
assert.equal(
  C.evaluate(pair, [{ ...pair[0], massClass: "unknown" }, pair[1]], 1),
  null,
);
const swappedMasses = C.evaluate(
  pair,
  [
    { ...pair[0], massClass: "large" },
    { ...pair[1], massClass: "small" },
  ],
  1,
);
assert.equal(swappedMasses.found, true);
assert.equal(
  swappedMasses.massCorrect,
  false,
  "Quantities must match the correct positions, not just the set of masses",
);
assert.equal(swappedMasses.solved, false);
assert.equal(swappedMasses.stars, 2);

const launch = { origin: C.PORTS[1], angle: -Math.PI / 2, power: 45 };
const hypothesis = [{ x: 600, y: 400, massClass: "medium" }];
const predicted = C.predict([launch], hypothesis);
assert.deepEqual(
  predicted[0],
  C.simulate(launch.origin, launch.angle, launch.power, [
    { x: 600, y: 400, mu: 3600000 },
  ]),
  "A correct hypothesis reproduces the observed trajectory",
);
assert.notDeepEqual(
  C.predict([launch], [{ ...hypothesis[0], massClass: "large" }]),
  predicted,
  "Changing the estimated mass changes the prediction",
);
assert.deepEqual(
  C.predict([{ ...launch, points: [{ x: 999, y: 999 }] }], hypothesis),
  predicted,
  "Predictions use launch conditions and guesses, never observed positions or the secret map",
);
assert.deepEqual(C.predict([launch], [{ x: 600, y: 400 }]), []);
console.log(
  "Gravity mechanics passed: deflection, symmetry, superposition, stable energy, 900 seeded maps, scoring and marker matching.",
);
