/* Pure, deterministic mechanics for the simplified gravity puzzle. */
(function (root, factory) {
  const core = factory();
  if (typeof module === "object" && module.exports) module.exports = core;
  else root.GravityPuzzle = core;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const WIDTH = 1000;
  const HEIGHT = 900;
  const SOFTENING = 65;
  const MASS_TYPES = [
    { id: "small", label: "Poca", units: 1, mu: 1800000 },
    { id: "medium", label: "Media", units: 2, mu: 3600000 },
    { id: "large", label: "Mucha", units: 4, mu: 7200000 },
  ];
  const PORTS = [
    { x: 42, y: 450, angle: 0, label: "Izquierda" },
    { x: 500, y: 858, angle: -Math.PI / 2, label: "Abajo" },
    { x: 958, y: 450, angle: Math.PI, label: "Derecha" },
  ];
  const LEVELS = [
    {
      name: "Una presencia",
      count: 1,
      hint: "Busca dónde está y cuánta masa hay. Con el mismo tiro y distancia, más masa atrae más.",
    },
    {
      name: "Un nuevo misterio",
      count: 1,
      hint: "La masa puede ser distinta. Toca otra flecha del mapa para investigar desde otro lado.",
    },
    {
      name: "Dos presencias",
      count: 2,
      hint: "Hay dos masas de distinta cantidad. Localiza cada una y estima cuánta masa tiene.",
    },
  ];
  function rng(seed) {
    let state = seed >>> 0;
    return () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }
  function makeRound(level, seed) {
    const random = rng(seed);
    const masses = [];
    const count = LEVELS[level].count;
    for (let i = 0; i < count; i += 1) {
      let candidate;
      for (let attempt = 0; attempt < 100; attempt += 1) {
        candidate = {
          x: (level === 0 ? 400 : 280) + random() * (level === 0 ? 220 : 440),
          y: (level === 0 ? 290 : 200) + random() * (level === 0 ? 320 : 500),
        };
        if (
          masses.every(
            (m) => Math.hypot(m.x - candidate.x, m.y - candidate.y) >= 270,
          )
        )
          break;
        candidate = null;
      }
      if (!candidate)
        candidate = {
          x: masses[0].x < 500 ? 720 : 280,
          y: masses[0].y < 450 ? 690 : 210,
        };
      const choices = MASS_TYPES.filter(
        (type) => !masses.some((m) => m.massClass === type.id),
      );
      const type = choices[Math.floor(random() * choices.length)];
      candidate.massClass = type.id;
      candidate.mu = type.mu;
      masses.push(candidate);
    }
    return { level, masses };
  }
  function acceleration(x, y, masses) {
    let ax = 0;
    let ay = 0;
    for (const m of masses) {
      const dx = m.x - x;
      const dy = m.y - y;
      const factor = m.mu / (dx * dx + dy * dy + SOFTENING * SOFTENING) ** 1.5;
      ax += dx * factor;
      ay += dy * factor;
    }
    return { x: ax, y: ay };
  }
  function step(p, masses, dt) {
    const a = acceleration(p.x, p.y, masses);
    const x = p.x + p.vx * dt + 0.5 * a.x * dt * dt;
    const y = p.y + p.vy * dt + 0.5 * a.y * dt * dt;
    const b = acceleration(x, y, masses);
    return {
      x,
      y,
      vx: p.vx + 0.5 * (a.x + b.x) * dt,
      vy: p.vy + 0.5 * (a.y + b.y) * dt,
    };
  }
  function simulate(origin, angle, power, masses) {
    const speed = 210 + Math.max(0, Math.min(100, power)) * 2.7;
    let p = {
      x: origin.x,
      y: origin.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
    };
    const points = [{ x: p.x, y: p.y }];
    const dt = 1 / 120;
    for (let i = 0; i < 960; i += 1) {
      p = step(p, masses, dt);
      points.push({ x: p.x, y: p.y });
      if (p.x < -25 || p.x > WIDTH + 25 || p.y < -25 || p.y > HEIGHT + 25)
        break;
    }
    return { points, seconds: (points.length - 1) * dt };
  }
  function evaluate(masses, guesses, shots) {
    if (
      guesses.length !== masses.length ||
      shots < 1 ||
      guesses.some((g) => !MASS_TYPES.some((type) => type.id === g.massClass))
    )
      return null;
    const distance = (m, g) => Math.hypot(m.x - g.x, m.y - g.y);
    let order = masses.map((_, i) => i);
    if (
      masses.length === 2 &&
      distance(masses[0], guesses[1]) + distance(masses[1], guesses[0]) <
        distance(masses[0], guesses[0]) + distance(masses[1], guesses[1])
    )
      order = [1, 0];
    const pairs = masses.map((mass, i) => ({
      mass,
      guess: guesses[order[i]],
      guessIndex: order[i],
      distance: distance(mass, guesses[order[i]]),
      massCorrect: mass.massClass === guesses[order[i]].massClass,
    }));
    const error = Math.max(...pairs.map((pair) => pair.distance));
    const positionStars =
      error <= 65
        ? shots <= 4
          ? 3
          : 2
        : error <= 130
          ? 2
          : error <= 200
            ? 1
            : 0;
    const massCorrect = pairs.every((pair) => pair.massCorrect);
    const stars = Math.max(0, positionStars - (massCorrect ? 0 : 1));
    return {
      pairs,
      error,
      stars,
      massCorrect,
      found: error <= 65,
      solved: error <= 65 && massCorrect,
    };
  }
  // Predict only from the player's hypothesis and the recorded launch conditions.
  function predict(launches, guesses) {
    if (!guesses.length) return [];
    const masses = guesses.map((guess) => {
      const type = MASS_TYPES.find((item) => item.id === guess.massClass);
      return type ? { x: guess.x, y: guess.y, mu: type.mu } : null;
    });
    if (masses.some((mass) => !mass)) return [];
    return launches.map((launch) =>
      simulate(launch.origin, launch.angle, launch.power, masses),
    );
  }
  return {
    WIDTH,
    HEIGHT,
    SOFTENING,
    MASS_TYPES,
    PORTS,
    LEVELS,
    rng,
    makeRound,
    acceleration,
    step,
    simulate,
    evaluate,
    predict,
  };
});
