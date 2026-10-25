"use strict";

// RadWorld-style bus connections, adapted to MedVTok's shared visual interface.
(() => {
  const scene = document.querySelector(".med-overview");
  if (!scene) return;

  const diagram = scene.querySelector(".med-overview-diagram");
  const wires = scene.querySelector(".med-overview-wires");
  const sourceGrid = scene.querySelector(".med-modality-grid");
  const sources = [...sourceGrid.querySelectorAll(".med-modality")];
  const inputTokens = scene.querySelector(".med-input-patches .med-token-grid");
  const outputTokens = scene.querySelector(".med-shared-tokens .med-token-grid");
  const inputStage = scene.querySelector(".med-input-patches");
  const outputStage = scene.querySelector(".med-shared-tokens");
  const model = scene.querySelector(".med-model");
  const coreArrows = [...scene.querySelectorAll(".med-core-arrow")];
  const buttons = [...scene.querySelectorAll("[data-overview-task]")];
  const ports = [...scene.querySelectorAll(".med-task")];
  const compact = window.matchMedia("(max-width: 900px)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const ns = "http://www.w3.org/2000/svg";
  const cycleDuration = 4200;
  let pendingFrame;
  let animationFrame;
  let previousTime = null;
  let elapsed = 0;
  let inView = !("IntersectionObserver" in window);
  let inputPackets = [];
  let sharedPacket;
  let outputPaths = [];

  function updateActivation(active) {
    ports.forEach(port => {
      port.classList.toggle("is-active", active);
    });
    outputPaths.forEach(({ guide }) => {
      guide.classList.toggle("is-active", active);
    });
  }

  function movePacket(packet, progress) {
    if (!packet) return;
    const visible = progress !== null && progress > 0 && progress < 1;
    packet.style.opacity = visible ? String(.65 * Math.min(progress / .12, (1 - progress) / .12, 1)) : "0";
    if (visible) packet.style.strokeDashoffset = String(10 - progress * 110);
  }

  function renderFlow(phase) {
    const between = (start, end) => phase !== null && phase >= start && phase < end;
    inputPackets.forEach(packet => movePacket(packet, phase === null ? null : phase / .27));
    movePacket(sharedPacket, phase === null ? null : (phase - .27) / .08);
    outputPaths.forEach(({ packet }) => {
      movePacket(packet, phase === null ? null : (phase - .55) / .36);
    });
    // Every task receives the same shared representation in this cycle.
    updateActivation(between(.87, 1));
    inputStage.classList.toggle("is-flowing", between(.32, .41));
    coreArrows[0].classList.toggle("is-flowing", between(.36, .43));
    model.classList.toggle("is-flowing", between(.4, .49));
    coreArrows[1].classList.toggle("is-flowing", between(.45, .52));
    outputStage.classList.toggle("is-flowing", between(.47, .56));
  }

  function animate(time) {
    if (previousTime !== null) elapsed += time - previousTime;
    previousTime = time;
    if (elapsed >= cycleDuration) {
      elapsed %= cycleDuration;
    }
    renderFlow(elapsed / cycleDuration);
    animationFrame = requestAnimationFrame(animate);
  }

  function updateMotion() {
    const playing = inView && !document.hidden && !reducedMotion.matches;
    if (playing && animationFrame === undefined) {
      previousTime = null;
      animationFrame = requestAnimationFrame(animate);
    } else if (!playing) {
      cancelAnimationFrame(animationFrame);
      animationFrame = undefined;
      previousTime = null;
      renderFlow(null);
    }
  }

  function draw() {
    wires.replaceChildren();
    inputPackets = [];
    sharedPacket = undefined;
    outputPaths = [];
    if (compact.matches) return;
    const bounds = diagram.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    wires.setAttribute("viewBox", `0 0 ${bounds.width} ${bounds.height}`);
    const guides = document.createElementNS(ns, "g");
    const packets = document.createElementNS(ns, "g");
    wires.append(guides, packets);

    function relative(element) {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left - bounds.left, right: rect.right - bounds.left,
        top: rect.top - bounds.top, bottom: rect.bottom - bounds.top,
        centerY: rect.top + rect.height / 2 - bounds.top,
      };
    }
    function path(d, className, layer = guides) {
      const element = document.createElementNS(ns, "path");
      element.setAttribute("d", d);
      element.setAttribute("class", className);
      layer.append(element);
      return element;
    }
    function packet(d) {
      const element = path(d, "med-overview-packet", packets);
      element.setAttribute("pathLength", "100");
      element.setAttribute("stroke-dasharray", "10 100");
      return element;
    }

    const incoming = relative(inputTokens);
    const outgoing = relative(outputTokens);
    const sourceBounds = sources.map(relative);
    const tokenX = incoming.left - 6;
    const inputBus = (Math.max(...sourceBounds.map(source => source.right)) + tokenX) / 2;
    sourceBounds.forEach(source => {
      const branch = `M${source.right} ${source.centerY}H${inputBus}V${incoming.centerY}`;
      path(`${branch}H${tokenX}`, "med-overview-wire");
      inputPackets.push(packet(branch));
    });
    sharedPacket = packet(`M${inputBus} ${incoming.centerY}H${tokenX}`);

    const targets = ports.map(button => ({
      button, bounds: relative(button),
    }));
    const startX = outgoing.right + 6;
    const outputBus = (startX + Math.min(...targets.map(target => target.bounds.left))) / 2;
    targets.forEach(({ button, bounds: target }) => {
      const targetX = target.left;
      const route = `M${startX} ${outgoing.centerY}H${outputBus}V${target.centerY}H${targetX}`;
      outputPaths.push({ guide: path(route, "med-overview-wire"), packet: packet(route) });
    });
    renderFlow(animationFrame === undefined ? null : elapsed / cycleDuration);
  }

  function queueDraw() {
    cancelAnimationFrame(pendingFrame);
    pendingFrame = requestAnimationFrame(draw);
  }

  buttons.forEach(button => {
    button.addEventListener("click", () => {
      elapsed = 0;
      previousTime = null;
      renderFlow(animationFrame === undefined ? null : 0);
    });
  });

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      updateMotion();
    }, { threshold: .1 });
    observer.observe(scene);
  }

  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(queueDraw);
    [diagram, sourceGrid, inputTokens, outputTokens, ...sources, ...ports].forEach(element => observer.observe(element));
  } else {
    window.addEventListener("resize", queueDraw, { passive: true });
  }
  compact.addEventListener("change", queueDraw);
  reducedMotion.addEventListener("change", updateMotion);
  document.addEventListener("visibilitychange", updateMotion);
  document.fonts?.ready.then(queueDraw);
  updateMotion();
  queueDraw();
})();
