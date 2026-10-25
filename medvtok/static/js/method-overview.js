"use strict";

(() => {
  const framework = document.querySelector(".mera-framework");
  if (!framework) return;
  const network = framework.querySelector(".mera-network");
  const wires = framework.querySelector(".mera-wires");
  if (!network || !wires) return;
  const svgNS = "http://www.w3.org/2000/svg";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const cycleDuration = 8200;
  const flow = {
    input: [.04, .22],
    encode: [.32, .43],
    features: [.46, .66],
    comparison: [.69, .77],
    alignment: [.77, .95],
  };
  const stages = [
    [".mera-input", .01, .08],
    [".mera-encoder", flow.input[1], flow.encode[1]],
    [".mera-expert-panel", flow.input[1], flow.encode[0]],
    [".mera-panel-expert.mera-expert-b", flow.input[1], flow.alignment[1]],
    [".mera-tokens", flow.encode[1], flow.alignment[1]],
    [".mera-shared-space, .mera-projection", flow.features[1], flow.alignment[1]],
  ].map(([selector, start, end]) => ({ elements: [...network.querySelectorAll(selector)], start, end }));
  const alignmentMarkers = [...network.querySelectorAll(".mera-alignment-marker")];
  let packets = [];
  let alignmentWires = [];
  let animationFrame;
  let previousTime = null;
  let elapsed = 0;
  let inView = !("IntersectionObserver" in window);

  function renderFlow(phase) {
    const between = (start, end) => phase !== null && phase >= start && phase < end;
    packets.forEach(({ element, start, end, dashLength }) => {
      const progress = phase === null ? -1 : (phase - start) / (end - start);
      const visible = progress > 0 && progress < 1;
      element.style.opacity = visible ? String(.65 * Math.min(progress / .12, (1 - progress) / .12, 1)) : "0";
      if (visible) element.style.strokeDashoffset = String(dashLength - progress * (100 + dashLength));
    });
    stages.forEach(({ elements, start, end }) => {
      elements.forEach(element => element.classList.toggle("is-receiving", between(start, end)));
    });
    // Both objectives are evaluated together, rather than implying a second training stage.
    const aligning = between(...flow.alignment);
    [...alignmentMarkers, ...alignmentWires].forEach(element => element.classList.toggle("is-aligning", aligning));
  }

  function animate(time) {
    if (previousTime !== null) elapsed = (elapsed + time - previousTime) % cycleDuration;
    previousTime = time;
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

  // Measure the same grid the reader sees, so wires stay on the box centers.
  function drawConnections() {
    if (!network || !wires) return;
    const bounds = network.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const box = selector => {
      const r = network.querySelector(selector).getBoundingClientRect();
      return { left: r.left - bounds.left, right: r.right - bounds.left,
        top: r.top - bounds.top, bottom: r.bottom - bounds.top,
        x: r.left - bounds.left + r.width / 2, y: r.top - bounds.top + r.height / 2 };
    };
    const input = box(".mera-input"), encoder = box(".mera-encoder"), tokens = box(".mera-tokens");
    const ctExpert = box(".mera-panel-expert.mera-expert-b");
    const paths = [];
    const f = n => Math.round(n * 100) / 100;
    const point = p => `${f(p[0])} ${f(p[1])}`;

    const nextPackets = [];
    function route(raw, className = "", arrow = false, timing = null, showGuide = true) {
      const p = raw.filter((v, i) => !i || v[0] !== raw[i - 1][0] || v[1] !== raw[i - 1][1]);
      if (p.length < 2) return;
      let d = `M${point(p[0])}`;
      for (let i = 1; i < p.length - 1; i++) {
        const a = p[i - 1], b = p[i], c = p[i + 1];
        const before = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const after = Math.hypot(c[0] - b[0], c[1] - b[1]);
        const radius = Math.min(8, before / 2, after / 2);
        const entry = [b[0] - (b[0] - a[0]) / before * radius, b[1] - (b[1] - a[1]) / before * radius];
        const exit = [b[0] + (c[0] - b[0]) / after * radius, b[1] + (c[1] - b[1]) / after * radius];
        d += `L${point(entry)}Q${point(b)} ${point(exit)}`;
      }
      const end = p[p.length - 1], previous = p[p.length - 2];
      d += `L${point(end)}`;
      const motionPath = d;
      if (arrow) {
        const length = Math.hypot(end[0] - previous[0], end[1] - previous[1]);
        const dx = (end[0] - previous[0]) / length, dy = (end[1] - previous[1]) / length;
        const back = [end[0] - dx * 5, end[1] - dy * 5];
        d += `M${point([back[0] - dy * 3.5, back[1] + dx * 3.5])}L${point(end)}L${point([back[0] + dy * 3.5, back[1] - dx * 3.5])}`;
      }
      if (showGuide) {
        const path = document.createElementNS(svgNS, "path");
        path.setAttribute("d", d);
        if (className) path.setAttribute("class", className);
        paths.push(path);
      }
      if (timing) {
        const length = p.slice(1).reduce((total, point, index) => total + Math.hypot(point[0] - p[index][0], point[1] - p[index][1]), 0);
        const dashLength = Math.min(14, Math.max(3, length * .12)) / length * 100;
        const element = document.createElementNS(svgNS, "path");
        element.setAttribute("d", motionPath);
        element.setAttribute("class", `${className} mera-signal`);
        element.setAttribute("pathLength", "100");
        element.setAttribute("stroke-dasharray", `${dashLength} 100`);
        nextPackets.push({ element, start: timing[0], end: timing[1], dashLength });
      }
    }

    function comparisonSignals(top, bottom, className) {
      const center = [(top[0] + bottom[0]) / 2, (top[1] + bottom[1]) / 2];
      // Meet at the alignment marker, rather than flowing into the other model.
      [top, bottom].forEach(endpoint => {
        route([endpoint, center], `${className} mera-comparison-signal`, false, flow.comparison, false);
      });
    }

    // CT feeds the tokenizer and the expert panel as parallel branches.
    route([[input.x, input.bottom], [encoder.x, encoder.top - 2]], "", true, flow.input);
    // Stop at the group frame so the experts do not appear to feed one another.
    const panel = network.querySelector(".mera-expert-panel");
    const panelBox = box(".mera-expert-panel");
    const panelFrameLeft = panelBox.left + parseFloat(getComputedStyle(panel, "::before").left);
    route([[input.left, input.y], [4, input.y], [4, panelBox.y], [panelFrameLeft - 2, panelBox.y]], "", true, flow.input);
    route([[encoder.x, encoder.bottom], [tokens.x, tokens.top - 2]], "mera-token-wire", true, flow.encode);

    const shared = box(".mera-shared-space");
    route([[tokens.x, tokens.bottom], [shared.x, shared.top]], "mera-token-wire mera-match-wire");
    const sharedLabel = network.querySelector(".mera-shared-alignment");
    sharedLabel.style.left = `${shared.x}px`;
    sharedLabel.style.top = `${(tokens.bottom + shared.top) / 2}px`;
    comparisonSignals([tokens.x, tokens.bottom], [shared.x, shared.top], "mera-token-wire");
    // This CT example selects only its corresponding expert from the panel.
    route([[ctExpert.x, ctExpert.top], [shared.x, shared.bottom + 2]], "mera-wire-b", true, flow.features);

    const railX = bounds.width - 4;
    const projection = box(".mera-projection.mera-expert-b");
    const expert = ctExpert;
    const lowerBus = projection.bottom + 22;
    // Show just the CT example's expert-space alignment, with all experts retained above.
    route([[tokens.right, tokens.y], [railX, tokens.y], [railX, lowerBus], [projection.x, lowerBus], [projection.x, projection.bottom + 2]], "mera-token-wire", true, flow.features);
    route([[projection.x, projection.top], [expert.x, expert.bottom]], "mera-wire-b mera-match-wire");
    comparisonSignals([expert.x, expert.bottom], [projection.x, projection.top], "mera-wire-b");
    const label = network.querySelector('.mera-alignment-marker[data-expert="b"]');
    label.style.left = `${expert.x}px`;
    label.style.top = `${(expert.bottom + projection.top) / 2}px`;
    wires.setAttribute("viewBox", `0 0 ${bounds.width} ${bounds.height}`);
    packets = nextPackets;
    wires.replaceChildren(...paths, ...packets.map(packet => packet.element));
    alignmentWires = [...wires.querySelectorAll(".mera-match-wire")];
    renderFlow(animationFrame === undefined ? null : elapsed / cycleDuration);
  }

  let frame;
  function scheduleConnections() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(drawConnections);
  }
  if ("ResizeObserver" in window) new ResizeObserver(scheduleConnections).observe(network);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      updateMotion();
    }, { threshold: .1 }).observe(network);
  }
  reducedMotion.addEventListener("change", updateMotion);
  document.addEventListener("visibilitychange", updateMotion);
  document.fonts?.ready.then(scheduleConnections);
  window.addEventListener("resize", scheduleConnections);
  scheduleConnections();
  updateMotion();

})();
