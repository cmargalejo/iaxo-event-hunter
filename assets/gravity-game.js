/* Canvas interaction and presentation; the mechanics live in gravity-core.js. */
(function () {
  "use strict";
  const C = window.GravityPuzzle;
  const $ = (id) => document.getElementById(id);
  const canvas = $("map");
  const ctx = canvas.getContext("2d");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const colors = ["#8cf4cf", "#92ddeb", "#d3e5f4"];
  const starRandom = C.rng(7142);
  const sky = Array.from({ length: 65 }, () => ({
    x: starRandom() * C.WIDTH,
    y: starRandom() * C.HEIGHT,
    r: 0.8 + starRandom() * 1.6,
  }));
  let level = 0;
  let round = null;
  let shots = 0;
  let traces = [];
  let guesses = [];
  let preview = false;
  let predictions = [];
  let mode = "aim";
  let result = null;
  let scores = [];
  let port = 0;
  let angle = 0;
  let power = 45;
  let cursor = { x: 500, y: 450 };
  let drag = null;
  let frame = 0;
  let sound = false;
  let audio = null;
  let best = 0;
  let referenceReturn = null;
  const referenceColors = ["#8cf4cf", "#9ebcff", "#ffbe86"];
  const massAmount = (type) =>
    `${type.units} ${type.units === 1 ? "unidad" : "unidades"}`;
  try {
    best = clamp(
      Number(localStorage.getItem("gravity-puzzle-best-mass-v2")) || 0,
      0,
      9,
    );
  } catch (_) {
    /* Storage is optional. */
  }
  if (best) {
    $("welcome-best").hidden = false;
    $("welcome-best").textContent =
      `Tu mejor expedición: ${best} de 9 estrellas.`;
  }

  function tone(frequency, duration = 0.12) {
    if (!sound) return;
    try {
      if (!audio)
        audio = new (window.AudioContext || window.webkitAudioContext)();
      audio.resume().catch(() => {});
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
      gain.gain.setValueAtTime(0.045, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        audio.currentTime + duration,
      );
      oscillator.start();
      oscillator.stop(audio.currentTime + duration);
    } catch (_) {
      /* Play remains available without audio. */
    }
  }

  function activeCount(now = performance.now()) {
    return traces.filter((trace) => now < trace.start + trace.duration).length;
  }

  function selectReference(id) {
    const index = C.MASS_TYPES.findIndex((type) => type.id === id);
    const type = C.MASS_TYPES[index];
    $("reference-number").textContent = type.units;
    $("reference-body").setAttribute("stroke", referenceColors[index]);
    $("reference-map-title").textContent =
      `Masa conocida: ${massAmount(type)}. El mismo tiro para comparar.`;
    $("reference-explanation").textContent =
      `${massAmount(type)} · ${type.units === 1 ? "Esta es nuestra masa de referencia." : type.units === 2 ? "El doble de la masa de referencia." : "Cuatro veces la masa de referencia."}`;
    document
      .querySelectorAll("[data-reference]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.reference === id),
        ),
      );
    document.querySelectorAll("[data-reference-path]").forEach((path) => {
      const selected = path.dataset.referencePath === id;
      path.setAttribute("stroke-width", selected ? "9" : "4");
      path.setAttribute("opacity", selected ? "1" : "0.55");
      path.setAttribute("stroke-dasharray", selected ? "none" : "10 12");
    });
  }

  function setupReference() {
    const ns = "http://www.w3.org/2000/svg";
    C.MASS_TYPES.forEach((type, index) => {
      // This known, fixed example never reads the hidden round or the player's guesses.
      const trajectory = C.simulate(C.PORTS[0], 0, 45, [
        { x: 500, y: 280, mu: type.mu },
      ]);
      const path = document.createElementNS(ns, "path");
      path.dataset.referencePath = type.id;
      path.setAttribute(
        "d",
        trajectory.points
          .map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
          .join(" "),
      );
      path.setAttribute("stroke", referenceColors[index]);
      const label = document.createElementNS(ns, "text");
      const nearEnd = trajectory.points.find((p) => p.x >= 930);
      label.setAttribute("x", "940");
      label.setAttribute("y", String(nearEnd.y - 20));
      label.setAttribute("font-size", "50");
      label.setAttribute("font-family", "system-ui, sans-serif");
      label.setAttribute("fill", referenceColors[index]);
      label.setAttribute("stroke", "#0b1a2b");
      label.setAttribute("stroke-width", "5");
      label.setAttribute("paint-order", "stroke");
      label.textContent = type.units;
      $("reference-paths").append(path, label);
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.reference = type.id;
      button.style.setProperty("--reference-color", referenceColors[index]);
      const amount = document.createElement("b");
      amount.textContent = type.units;
      const name = document.createElement("span");
      name.textContent = type.label;
      button.append(amount, name);
      button.setAttribute(
        "aria-label",
        `Probar ${massAmount(type)} de masa: ${type.label.toLowerCase()}`,
      );
      button.addEventListener("click", () => selectReference(type.id));
      $("reference-options").append(button);
    });
    selectReference("small");
  }

  function openReference() {
    cancelDrag();
    referenceReturn = document.activeElement;
    selectReference("small");
    $("mass-reference").showModal();
    $("mass-reference").scrollTop = 0;
    $("reference-title").focus({ preventScroll: true });
  }

  function hypothesisReady() {
    return (
      guesses.length === C.LEVELS[level].count &&
      guesses.every((g) => C.MASS_TYPES.some((type) => type.id === g.massClass))
    );
  }

  function updatePredictions() {
    predictions =
      preview && hypothesisReady() ? C.predict(traces, guesses) : [];
  }

  function syncMassChoices() {
    const holder = $("mass-choices");
    // Retain controls while dragging and animating, so keyboard focus is stable.
    if (holder.children.length !== guesses.length) {
      holder.replaceChildren(
        ...guesses.map((guess, index) => {
          const fieldset = document.createElement("fieldset");
          fieldset.className = "mass-choice";
          const legend = document.createElement("legend");
          legend.textContent = `Marca ${index + 1}: masa en unidades`;
          const options = document.createElement("div");
          options.className = "mass-options";
          C.MASS_TYPES.forEach((type) => {
            const button = document.createElement("button");
            button.type = "button";
            button.dataset.guess = index;
            button.dataset.mass = type.id;
            const amount = document.createElement("b");
            amount.textContent = type.units;
            const name = document.createElement("span");
            name.textContent = type.label;
            button.append(amount, name);
            button.setAttribute(
              "aria-label",
              `${massAmount(type)} de masa (${type.label.toLowerCase()}) en la marca ${index + 1}`,
            );
            button.addEventListener("click", () => {
              if (result) return;
              guesses[index].massClass = type.id;
              updatePredictions();
              syncControls();
              draw();
            });
            options.append(button);
          });
          fieldset.append(legend, options);
          return fieldset;
        }),
      );
    }
    holder
      .querySelectorAll("[data-mass]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(
            guesses[Number(button.dataset.guess)].massClass ===
              button.dataset.mass,
          ),
        ),
      );
  }

  function syncControls() {
    if (!round) return;
    const count = C.LEVELS[level].count;
    const active = activeCount();
    const ready = hypothesisReady();
    $("shot-count").textContent = shots;
    $("shot-label").textContent = shots === 1 ? "sonda" : "sondas";
    $("mass-legend").textContent =
      count === 1 ? "Masa oculta" : "Masas ocultas";
    $("guess-legend").textContent = count === 1 ? "Tu marca" : "Tus marcas";
    $("angle").value = angle;
    $("power").value = power;
    $("angle-value").textContent = `${angle}°`;
    $("power-value").textContent = `${power}%`;
    $("aim-mode").setAttribute("aria-pressed", String(mode === "aim"));
    $("mark-mode").setAttribute("aria-pressed", String(mode === "mark"));
    $("mark-mode").disabled = shots === 0;
    $("mark-mode").textContent = count === 1 ? "Marcar masa" : "Marcar masas";
    $("aim-controls").hidden = mode !== "aim";
    $("mark-controls").hidden = mode !== "mark";
    $("launch").disabled = active >= 3;
    $("launch").textContent = active >= 3 ? "Sondas en vuelo…" : "Lanzar sonda";
    $("clear").disabled = traces.length === 0;
    $("check").disabled = !ready || active > 0;
    $("check").textContent = active > 0 ? "Espera a las sondas…" : "Comprobar";
    $("predict").disabled = !ready || active > 0 || !traces.length;
    $("predict").setAttribute("aria-pressed", String(preview));
    $("predict").textContent = preview
      ? "Ocultar mi predicción"
      : "Probar mi idea";
    $("prediction-note").hidden = !preview;
    syncMassChoices();
    $("clear-marks").disabled = guesses.length === 0;
    $("guess-count").textContent =
      `${guesses.length} de ${count} ${count === 1 ? "marca colocada" : "marcas colocadas"}`;
    $("mark-prompt").textContent =
      count === 1
        ? "Marca dónde está y elige cuánta masa crees que hay."
        : "Pon dos marcas y elige cuánta masa hay en cada una.";
    document
      .querySelectorAll("[data-port]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(Number(button.dataset.port) === port),
        ),
      );
    let instruction;
    if (result) {
      instruction =
        count === 1
          ? "Azul: la masa oculta. Naranja: tu marca."
          : "Azul: las masas ocultas. Naranja: tus marcas.";
    } else if (mode === "mark") {
      instruction = preview
        ? "Naranja a trazos: tu predicción. Ajusta posición y masa para seguir las pistas."
        : guesses.length === count
          ? "Elige la cantidad de masa en cada marca. Puedes probar tu idea antes de comprobar."
          : "Toca el mapa para poner tu marca. Las curvas son tus pistas.";
    } else {
      instruction =
        shots === 0
          ? "Toca una flecha para elegir la salida. Arrastra y suelta para lanzar."
          : "Sigue la curva. Toca otra flecha para cambiar de salida.";
    }
    if ($("map-instruction").textContent !== instruction)
      $("map-instruction").textContent = instruction;
    const label = result
      ? "Mapa revelado: se muestran las masas y tus marcas."
      : mode === "mark"
        ? "Mapa para marcar las masas. Flechas para mover la cruz y Enter para colocar una marca."
        : "Mapa para lanzar sondas. Toca una flecha para elegir salida. Arrastra y suelta, o usa las flechas del teclado y Espacio.";
    if (canvas.getAttribute("aria-label") !== label)
      canvas.setAttribute("aria-label", label);
  }

  function resize() {
    const box = canvas.getBoundingClientRect();
    if (!box.width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(box.width * dpr);
    canvas.height = Math.round(((box.width * C.HEIGHT) / C.WIDTH) * dpr);
    draw();
  }

  function circle(x, y, radius, fill, stroke, width = 2) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width;
      ctx.stroke();
    }
  }

  function draw(now = performance.now()) {
    if (!round) return;
    ctx.setTransform(
      canvas.width / C.WIDTH,
      0,
      0,
      canvas.height / C.HEIGHT,
      0,
      0,
    );
    ctx.clearRect(0, 0, C.WIDTH, C.HEIGHT);
    ctx.strokeStyle = "#1b3044";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 100; x < C.WIDTH; x += 100) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, C.HEIGHT);
    }
    for (let y = 100; y < C.HEIGHT; y += 100) {
      ctx.moveTo(0, y);
      ctx.lineTo(C.WIDTH, y);
    }
    ctx.stroke();
    for (const star of sky) circle(star.x, star.y, star.r, "#7190ab");

    // The map contains no visual hints about the hidden positions until checking.
    if (result) {
      for (const pair of result.pairs) {
        const m = pair.mass;
        const halo = ctx.createRadialGradient(m.x, m.y, 8, m.x, m.y, 105);
        halo.addColorStop(0, "#9ebcff55");
        halo.addColorStop(1, "#9ebcff00");
        circle(m.x, m.y, 105, halo);
        circle(m.x, m.y, 65, null, "#9ebcff77", 2);
        const massIndex = C.MASS_TYPES.findIndex(
          (type) => type.id === m.massClass,
        );
        circle(m.x, m.y, 18 + massIndex * 9, "#9ebcff33", "#9ebcff", 3);
        circle(m.x, m.y, 8, "#c9d9ff");
        ctx.setLineDash([7, 8]);
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(pair.guess.x, pair.guess.y);
        ctx.strokeStyle = "#c9d9ff99";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    for (const trace of traces) {
      const progress =
        trace.duration === 0
          ? 1
          : clamp((now - trace.start) / trace.duration, 0, 1);
      const end = Math.max(1, Math.floor(progress * (trace.points.length - 1)));
      ctx.beginPath();
      ctx.moveTo(trace.points[0].x, trace.points[0].y);
      for (let i = 1; i <= end; i += 1)
        ctx.lineTo(trace.points[i].x, trace.points[i].y);
      ctx.strokeStyle = trace.color;
      ctx.globalAlpha = progress < 1 ? 1 : 0.8;
      ctx.lineWidth = progress < 1 ? 6 : 4;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.globalAlpha = 1;
      const head = trace.points[end];
      if (progress < 1) {
        circle(head.x, head.y, 14, `${trace.color}22`);
        circle(head.x, head.y, 6, trace.color);
      } else circle(head.x, head.y, 3, trace.color);
    }

    if (preview && !result && mode === "mark") {
      ctx.setLineDash([13, 11]);
      ctx.strokeStyle = "#ffbe86";
      ctx.lineWidth = 4;
      for (const prediction of predictions) {
        ctx.beginPath();
        prediction.points.forEach((p, index) =>
          index ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y),
        );
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    C.PORTS.forEach((source, i) => {
      const selected = i === port && !result;
      const direction = source.angle + (selected ? (angle * Math.PI) / 180 : 0);
      ctx.save();
      ctx.translate(source.x, source.y);
      ctx.rotate(direction);
      circle(
        0,
        0,
        26,
        selected ? "#8cf4cf18" : "#102338",
        selected ? "#8cf4cf77" : "#34506a",
      );
      ctx.beginPath();
      ctx.moveTo(19, 0);
      ctx.lineTo(-12, -12);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-12, 12);
      ctx.closePath();
      ctx.fillStyle = selected ? "#8cf4cf" : "#607d95";
      ctx.fill();
      ctx.restore();
    });
    if (mode === "aim" && !result) {
      const source = C.PORTS[port];
      const direction = source.angle + (angle * Math.PI) / 180;
      const length = 100 + power * 1.5;
      ctx.setLineDash([8, 10]);
      ctx.beginPath();
      ctx.moveTo(
        source.x + Math.cos(direction) * 33,
        source.y + Math.sin(direction) * 33,
      );
      ctx.lineTo(
        source.x + Math.cos(direction) * length,
        source.y + Math.sin(direction) * length,
      );
      ctx.strokeStyle = "#8cf4cf88";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.setLineDash([]);
    }
    guesses.forEach((guess, i) => {
      circle(guess.x, guess.y, 27, "#442f29", "#ffbe86", 3);
      ctx.font = "bold 25px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffce9c";
      ctx.fillText(String(i + 1), guess.x, guess.y);
    });
    if (
      mode === "mark" &&
      document.activeElement === canvas &&
      !drag &&
      !result
    ) {
      ctx.strokeStyle = "#ffbe86";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cursor.x - 16, cursor.y);
      ctx.lineTo(cursor.x + 16, cursor.y);
      ctx.moveTo(cursor.x, cursor.y - 16);
      ctx.lineTo(cursor.x, cursor.y + 16);
      ctx.stroke();
    }
  }

  function animate(now) {
    frame = 0;
    draw(now);
    const active = activeCount(now);
    if (active !== animate.lastActive) syncControls();
    animate.lastActive = active;
    if (activeCount(now)) frame = requestAnimationFrame(animate);
  }

  function launch() {
    if (!round || result || mode !== "aim" || activeCount() >= 3) return;
    const trajectory = C.simulate(
      C.PORTS[port],
      C.PORTS[port].angle + (angle * Math.PI) / 180,
      power,
      round.masses,
    );
    traces.push({
      ...trajectory,
      origin: { ...C.PORTS[port] },
      angle: C.PORTS[port].angle + (angle * Math.PI) / 180,
      power,
      color: colors[shots % colors.length],
      start: performance.now(),
      duration: reducedMotion.matches
        ? 0
        : clamp(trajectory.seconds / 2, 1.2, 4) * 1000,
    });
    if (traces.length > 12) traces.shift();
    shots += 1;
    tone(440 + port * 90);
    syncControls();
    draw();
    if (!frame && activeCount()) frame = requestAnimationFrame(animate);
  }

  function cancelDrag() {
    if (!drag) return;
    const id = drag.id;
    drag = null;
    if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    draw();
  }

  function newRound() {
    cancelDrag();
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    round = C.makeRound(level, Math.floor(Math.random() * 4294967296));
    shots = 0;
    traces = [];
    guesses = [];
    preview = false;
    predictions = [];
    result = null;
    mode = "aim";
    port = 0;
    angle = 0;
    power = 45;
    cursor = { x: 500, y: 450 };
    $("welcome").hidden = true;
    $("finish").hidden = true;
    $("game").hidden = false;
    $("controls").hidden = false;
    $("result").hidden = true;
    $("legend").hidden = true;
    $("sector-label").textContent = `SECTOR ${level + 1} DE 3`;
    $("level-name").textContent = C.LEVELS[level].name;
    $("level-hint").textContent = C.LEVELS[level].hint;
    $("map-label").textContent =
      C.LEVELS[level].count === 1 ? "UNA MASA OCULTA" : "DOS MASAS OCULTAS";
    syncControls();
    resize();
    $("level-name").focus({ preventScroll: true });
    $("game").scrollIntoView({ block: "start" });
  }

  function setMode(next) {
    if (!round || result || (next === "mark" && !shots)) return;
    cancelDrag();
    mode = next;
    if (mode === "aim") {
      preview = false;
      predictions = [];
    }
    syncControls();
    draw();
  }

  function point(event) {
    const box = canvas.getBoundingClientRect();
    return {
      x: clamp(((event.clientX - box.left) / box.width) * C.WIDTH, 0, C.WIDTH),
      y: clamp(
        ((event.clientY - box.top) / box.height) * C.HEIGHT,
        0,
        C.HEIGHT,
      ),
    };
  }

  function aimAt(p) {
    const source = C.PORTS[port];
    let offset = Math.atan2(p.y - source.y, p.x - source.x) - source.angle;
    offset = Math.atan2(Math.sin(offset), Math.cos(offset));
    angle = Math.round(clamp((offset * 180) / Math.PI, -70, 70));
    power = Math.round(
      clamp((Math.hypot(p.x - source.x, p.y - source.y) - 150) / 6, 0, 100),
    );
    syncControls();
    draw();
  }

  function selectPort(index) {
    if (result) return;
    mode = "aim";
    preview = false;
    predictions = [];
    port = index;
    angle = 0;
    syncControls();
    draw();
  }

  function portAt(p) {
    const radius = Math.max(
      32,
      (32 * C.WIDTH) / canvas.getBoundingClientRect().width,
    );
    return C.PORTS.findIndex(
      (source) => Math.hypot(source.x - p.x, source.y - p.y) <= radius,
    );
  }

  function putGuess(p, index = -1) {
    const guess = {
      x: clamp(p.x, 20, C.WIDTH - 20),
      y: clamp(p.y, 20, C.HEIGHT - 20),
    };
    if (index < 0 && guesses.length === C.LEVELS[level].count) {
      index = guesses.reduce(
        (bestIndex, g, i) =>
          Math.hypot(g.x - p.x, g.y - p.y) <
          Math.hypot(guesses[bestIndex].x - p.x, guesses[bestIndex].y - p.y)
            ? i
            : bestIndex,
        0,
      );
    }
    if (
      guesses.some(
        (g, i) => i !== index && Math.hypot(g.x - guess.x, g.y - guess.y) < 80,
      )
    )
      return -1;
    if (index >= 0) guesses[index] = { ...guesses[index], ...guess };
    else {
      index = guesses.length;
      guesses.push(guess);
    }
    cursor = { ...guess };
    updatePredictions();
    syncControls();
    draw();
    return index;
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (!round || result || drag || event.button !== 0 || !event.isPrimary)
      return;
    event.preventDefault();
    canvas.focus({ preventScroll: true });
    const p = point(event);
    const hitPort = portAt(p);
    if (hitPort >= 0) selectPort(hitPort);
    const radius = (28 * C.WIDTH) / canvas.getBoundingClientRect().width;
    const nearby = guesses.findIndex(
      (g) => Math.hypot(g.x - p.x, g.y - p.y) < radius,
    );
    drag = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      moved: false,
      index: nearby,
      fromPort: hitPort >= 0,
    };
    canvas.setPointerCapture(event.pointerId);
    if (mode === "aim" && !drag.fromPort) aimAt(p);
    else {
      cursor = p;
      draw();
    }
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) >= 8)
      drag.moved = true;
    if (mode === "aim" && (!drag.fromPort || drag.moved)) aimAt(point(event));
    else if (drag.moved && drag.index >= 0) putGuess(point(event), drag.index);
  });
  canvas.addEventListener("pointerup", (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const ended = drag;
    cancelDrag();
    if (mode === "aim") {
      if (ended.fromPort && !ended.moved) return;
      aimAt(point(event));
      if (ended.moved) launch();
    } else putGuess(point(event), ended.index);
  });
  canvas.addEventListener("pointercancel", cancelDrag);
  canvas.addEventListener("lostpointercapture", cancelDrag);
  canvas.addEventListener("focus", () => draw());
  canvas.addEventListener("blur", () => {
    cancelDrag();
    draw();
  });
  canvas.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      cancelDrag();
      return;
    }
    if (
      !round ||
      result ||
      ![
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        " ",
        "Enter",
      ].includes(event.key)
    )
      return;
    event.preventDefault();
    if (mode === "aim") {
      if (event.key === " " || event.key === "Enter") {
        launch();
        return;
      }
      if (event.key === "ArrowLeft") angle = clamp(angle - 2, -70, 70);
      if (event.key === "ArrowRight") angle = clamp(angle + 2, -70, 70);
      if (event.key === "ArrowUp") power = clamp(power + 5, 0, 100);
      if (event.key === "ArrowDown") power = clamp(power - 5, 0, 100);
    } else {
      if (event.key === " " || event.key === "Enter") {
        putGuess(cursor);
        return;
      }
      const distance = event.shiftKey ? 5 : 20;
      if (event.key === "ArrowLeft") cursor.x -= distance;
      if (event.key === "ArrowRight") cursor.x += distance;
      if (event.key === "ArrowUp") cursor.y -= distance;
      if (event.key === "ArrowDown") cursor.y += distance;
      cursor.x = clamp(cursor.x, 20, C.WIDTH - 20);
      cursor.y = clamp(cursor.y, 20, C.HEIGHT - 20);
    }
    syncControls();
    draw();
  });

  $("start").addEventListener("click", () => {
    level = 0;
    scores = [];
    newRound();
    openReference();
  });
  $("open-reference").addEventListener("click", openReference);
  $("reference-close").addEventListener("click", () =>
    $("mass-reference").close(),
  );
  $("mass-reference").addEventListener("close", () => {
    if (referenceReturn && referenceReturn.isConnected)
      referenceReturn.focus({ preventScroll: true });
  });
  $("play-again").addEventListener("click", () => {
    level = 0;
    scores = [];
    newRound();
  });
  $("retry").addEventListener("click", newRound);
  $("new-map").addEventListener("click", newRound);
  $("launch").addEventListener("click", launch);
  $("aim-mode").addEventListener("click", () => setMode("aim"));
  $("mark-mode").addEventListener("click", () => setMode("mark"));
  document.querySelectorAll("[data-port]").forEach((button) =>
    button.addEventListener("click", () => {
      selectPort(Number(button.dataset.port));
    }),
  );
  ["angle", "power"].forEach((id) =>
    $(id).addEventListener("input", () => {
      angle = Number($("angle").value);
      power = Number($("power").value);
      syncControls();
      draw();
    }),
  );
  $("clear").addEventListener("click", () => {
    traces = [];
    preview = false;
    predictions = [];
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    syncControls();
    draw();
  });
  $("clear-marks").addEventListener("click", () => {
    guesses = [];
    preview = false;
    predictions = [];
    syncControls();
    draw();
  });
  $("predict").addEventListener("click", () => {
    if (result || !hypothesisReady() || activeCount() || !traces.length) return;
    preview = !preview;
    updatePredictions();
    syncControls();
    draw();
    if (preview) canvas.scrollIntoView({ block: "nearest" });
  });
  $("sound").addEventListener("click", () => {
    sound = !sound;
    $("sound").textContent = sound ? "Sonido: sí" : "Sonido: no";
    $("sound").setAttribute("aria-pressed", String(sound));
    if (sound) tone(520);
  });
  $("check").addEventListener("click", () => {
    if (result || activeCount()) return;
    const assessment = C.evaluate(round.masses, guesses, shots);
    if (!assessment) return;
    result = assessment;
    $("map-label").textContent =
      round.masses.length === 1 ? "MASA REVELADA" : "DOS MASAS REVELADAS";
    cancelDrag();
    $("controls").hidden = true;
    $("result").hidden = false;
    $("legend").hidden = false;
    $("result-title").textContent = result.solved
      ? round.masses.length === 1
        ? "¡La encontraste!"
        : "¡Las encontraste!"
      : result.found
        ? "¡La posición era buena!"
        : result.error <= 130
          ? "¡Estabas cerca!"
          : "El misterio sigue…";
    $("stars").replaceChildren(
      ...[0, 1, 2].map((index) => {
        const star = document.createElement("span");
        star.textContent = "★";
        star.setAttribute("aria-hidden", "true");
        if (index >= result.stars) star.className = "empty-star";
        return star;
      }),
    );
    $("stars").setAttribute("aria-label", `${result.stars} de 3 estrellas`);
    $("result-copy").textContent = result.solved
      ? shots <= 4
        ? "¡Buen ojo! Has acertado la posición y la cantidad de masa con cuatro sondas o menos."
        : "Has seguido bien las pistas. Prueba a resolver otro mapa con cuatro sondas o menos para conseguir tres estrellas."
      : result.found
        ? "Has encontrado dónde está, pero la cantidad de masa era distinta. En otro mapa, prueba distintas cantidades y compara las trayectorias."
        : "Mira hacia dónde se doblan los rastros. Prueba a ajustar la posición y la masa hasta que tu predicción siga las curvas.";
    $("mass-results").replaceChildren(
      ...[...result.pairs]
        .sort((a, b) => a.guessIndex - b.guessIndex)
        .map((pair) => {
          const item = document.createElement("li");
          const title = document.createElement("strong");
          title.textContent = `Marca ${pair.guessIndex + 1} · ${pair.distance <= 65 ? "posición acertada" : pair.distance <= 130 ? "posición cercana" : "posición por ajustar"}`;
          const actualType = C.MASS_TYPES.find(
            (type) => type.id === pair.mass.massClass,
          );
          const chosenType = C.MASS_TYPES.find(
            (type) => type.id === pair.guess.massClass,
          );
          const actual = `${massAmount(actualType)} (${actualType.label.toLowerCase()})`;
          const chosen = `${massAmount(chosenType)} (${chosenType.label.toLowerCase()})`;
          const detail = document.createElement("span");
          detail.textContent = pair.massCorrect
            ? `Masa: ${actual}. ¡Acertaste!`
            : `Masa real: ${actual}. Tu estimación: ${chosen}.`;
          item.append(title, detail);
          return item;
        }),
    );
    preview = false;
    predictions = [];
    $("next").textContent =
      level === 2 ? "Ver mi expedición" : "Siguiente sector";
    syncControls();
    draw();
    tone(result.solved ? 740 : 330, 0.22);
    $("result-title").focus({ preventScroll: true });
    $("result").scrollIntoView({ block: "nearest" });
  });
  $("next").addEventListener("click", () => {
    if (!result) return;
    scores[level] = result.stars;
    if (level < 2) {
      level += 1;
      newRound();
      return;
    }
    const total = scores.reduce((sum, score) => sum + score, 0);
    best = Math.max(best, total);
    try {
      localStorage.setItem("gravity-puzzle-best-mass-v2", String(best));
    } catch (_) {
      /* Optional. */
    }
    $("total-score").textContent = total;
    $("best-score").textContent =
      `Tu mejor expedición: ${best} de 9 estrellas.`;
    $("game").hidden = true;
    $("finish").hidden = false;
    $("finish-title").focus({ preventScroll: true });
    $("finish").scrollIntoView({ block: "start" });
  });
  setupReference();
  new ResizeObserver(resize).observe(canvas.parentElement);
  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches)
      traces.forEach((trace) => {
        trace.duration = 0;
      });
    syncControls();
    draw();
  });
})();
