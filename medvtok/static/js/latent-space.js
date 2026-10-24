"use strict";

// Each light streak follows one timeline, occluded by the token module.
// Measure the real layout so the paths still join their targets after reflow.
(() => {
  const scene = document.querySelector(".interface-landscape");
  const module = scene?.querySelector(".visual-token-module");
  if (!scene || !module) return;

  const sources = [...scene.querySelectorAll(".modality-mosaic figure")];
  const tasks = [...scene.querySelectorAll(".interface-output li")];
  const colors = ["#bac6eb", "#a9cfca", "#edc2d2"];
  const ns = "http://www.w3.org/2000/svg";
  let visible = false;

  function svgElement(name, attributes = {}) {
    const element = document.createElementNS(ns, name);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    return element;
  }

  const overlay = svgElement("svg", { class: "interface-flow", "aria-hidden": "true", focusable: "false" });
  const defs = svgElement("defs");
  const mask = svgElement("mask", { id: "interface-flow-mask", maskUnits: "userSpaceOnUse" });
  const maskBackground = svgElement("rect", { fill: "white" });
  mask.append(maskBackground);
  const tokenMask = svgElement("rect", { class: "flow-token-mask", fill: "black" });
  mask.append(tokenMask);
  const labels = [...scene.querySelectorAll(".diagram-label, .diagram-footnote, .interface-core h3, .interface-core > p:last-child")];
  const labelMasks = labels.map(() => {
    const rect = svgElement("rect", { fill: "black", rx: 3 });
    mask.append(rect);
    return rect;
  });
  defs.append(mask);
  overlay.append(defs);
  const paths = svgElement("g", { mask: "url(#interface-flow-mask)" });
  overlay.append(paths);
  scene.prepend(overlay);

  function makeRoute(kind, index) {
    const color = colors[kind === "input" ? index : Math.floor(index / 2)];
    const group = svgElement("g", { class: `flow-${kind}`, color });
    const guide = svgElement("path", { class: "flow-guide" });
    group.append(guide);
    paths.append(group);
    return { guide };
  }
  const inputRoutes = colors.map((_, index) => makeRoute("input", index));
  const outputRoutes = tasks.map((task, index) => {
    task.style.setProperty("--flow-color", colors[Math.floor(index / 2)]);
    return makeRoute("output", index);
  });
  const particles = tasks.map((_, index) => {
    const packet = svgElement("path", {
      class: `flow-packet${index % 2 ? " flow-packet-branch" : ""}`,
      color: colors[Math.floor(index / 2)], pathLength: 100,
    });
    paths.append(packet);
    return packet;
  });

  const activations = module.querySelector(".visual-token-activations");
  const tokenActivations = [...module.querySelectorAll("use")].map(cell => {
    const activation = svgElement("rect", {
      class: "visual-token-activation", x: cell.getAttribute("x"), y: cell.getAttribute("y"),
      width: 34, height: 34, rx: 2, color: cell.getAttribute("color") || colors[0],
    });
    activations.append(activation);
    return activation;
  });

  function layout() {
    // The overlay sits inside the scene's border; use its own pixel coordinates.
    const bounds = overlay.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const relative = (element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left - bounds.left, right: rect.right - bounds.left,
        top: rect.top - bounds.top, bottom: rect.bottom - bounds.top, width: rect.width, height: rect.height };
    };
    const frame = relative(module.querySelector(".visual-token-frame"));
    const stack = relative(module.querySelector(".visual-token-stack"));
    const mosaic = relative(scene.querySelector(".modality-mosaic"));
    const input = relative(scene.querySelector(".interface-input"));
    const core = relative(scene.querySelector(".interface-core"));
    const output = relative(scene.querySelector(".interface-output"));
    const stackedInput = mosaic.bottom < frame.top;
    const stackedOutput = output.top >= core.bottom;
    overlay.setAttribute("viewBox", `0 0 ${bounds.width} ${bounds.height}`);
    mask.setAttribute("x", -16);
    mask.setAttribute("y", 0);
    mask.setAttribute("width", bounds.width + 32);
    mask.setAttribute("height", bounds.height);
    Object.entries({ x: -16, y: 0, width: bounds.width + 32, height: bounds.height }).forEach(([key, value]) => maskBackground.setAttribute(key, value));
    // Hide both the grid and its offset backing planes without restarting motion.
    Object.entries({ x: stack.left - 2, y: stack.top - 2, width: stack.width + 4, height: stack.height + 4 })
      .forEach(([key, value]) => tokenMask.setAttribute(key, value));

    inputRoutes.forEach((route, index) => {
      let d, tx, ty;
      if (stackedInput) {
        const source = relative(sources[6 + index]);
        const sx = source.left + source.width / 2, sy = source.bottom + 3;
        tx = frame.left + frame.width * (index + 1) / 4;
        ty = frame.top;
        const bend = (sy + ty) / 2;
        d = `M${sx} ${sy}C${sx} ${bend} ${tx} ${bend} ${tx} ${ty}`;
      } else {
        const source = relative(sources[index * 3 + 2]);
        const sx = source.right + 3, sy = source.top + source.height / 2;
        tx = frame.left;
        ty = frame.top + frame.height * (index + 1) / 4;
        const bend = (sx + tx) / 2;
        d = `M${sx} ${sy}C${bend} ${sy} ${bend} ${ty} ${tx} ${ty}`;
      }
      route.guide.setAttribute("d", d);
      route.end = { x: tx, y: ty };
    });

    outputRoutes.forEach((route, index) => {
      const target = relative(tasks[index].querySelector(".task-vignette"));
      const tx = target.left - 2, ty = target.top + target.height / 2;
      let curve, sx, sy;
      if (stackedOutput) {
        sx = frame.left + frame.width * (index + .5) / tasks.length;
        sy = frame.bottom;
        const lane = target.left - 10, bend = Math.max(core.bottom, input.bottom) + 12;
        curve = `C${sx} ${bend} ${lane} ${bend} ${lane} ${bend + 12}V${ty - 10}Q${lane} ${ty} ${tx} ${ty}`;
      } else {
        sx = frame.right;
        sy = frame.top + frame.height * (index + .5) / tasks.length;
        const bend = (sx + tx) / 2;
        curve = `C${bend} ${sy} ${bend} ${ty} ${tx} ${ty}`;
      }
      route.guide.setAttribute("d", `M${sx} ${sy}${curve}`);
      route.start = { x: sx, y: sy };
      route.curve = curve;
    });

    particles.forEach((packet, index) => {
      const incoming = inputRoutes[Math.floor(index / 2)];
      const outgoing = outputRoutes[index];
      const entry = incoming.end, exit = outgoing.start;
      const c1 = stackedInput
        ? { x: entry.x, y: entry.y + frame.height * .4 }
        : { x: entry.x + frame.width * .4, y: entry.y };
      const c2 = stackedOutput
        ? { x: exit.x, y: exit.y - frame.height * .4 }
        : { x: exit.x - frame.width * .4, y: exit.y };
      const throughGrid = `C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${exit.x} ${exit.y}`;
      packet.setAttribute("d", incoming.guide.getAttribute("d") + throughGrid + outgoing.curve);
      const length = packet.getTotalLength();
      const entryDistance = incoming.guide.getTotalLength() / length * 100;
      const exitDistance = (length - outgoing.guide.getTotalLength()) / length * 100;
      packet.style.setProperty("--flow-entry", -entryDistance);
      packet.style.setProperty("--flow-exit", -exitDistance);
      // Match the approach illustrations' thin, rounded light streak (~28 SVG units at .8 scale).
      const dash = 22 / length * 100;
      packet.style.strokeDasharray = `${dash} ${200 - dash}`;
    });
    tokenActivations.forEach((activation, index) => {
      const step = stackedInput ? Math.floor(index / 6) : index % 6;
      activation.style.setProperty("--token-delay", `${step * .36}s`);
    });

    labels.forEach((label, index) => {
      const range = document.createRange();
      range.selectNodeContents(label);
      const rect = range.getBoundingClientRect();
      Object.entries({ x: rect.left - bounds.left - 6, y: rect.top - bounds.top - 4,
        width: rect.width + 12, height: rect.height + 8 }).forEach(([key, value]) => labelMasks[index].setAttribute(key, value));
    });
    scene.classList.add("flow-ready");
  }

  // Updating path geometry leaves the common animation timeline intact.
  let resizeFrame;
  function queueLayout() {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(layout);
  }
  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(queueLayout);
    [scene, module, ...sources, ...tasks].forEach(element => observer.observe(element));
  } else {
    window.addEventListener("resize", queueLayout);
  }
  document.fonts?.ready.then(queueLayout);
  layout();

  function update() {
    scene.classList.add("motion-enabled");
    scene.classList.toggle("is-flowing", visible && !document.hidden);
  }

  document.addEventListener("visibilitychange", update);

  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      update();
    }, { threshold: 0 }).observe(scene);
  } else {
    visible = true;
  }
  update();
})();
