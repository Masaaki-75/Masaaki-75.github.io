"use strict";

// The viewer uses pre-rendered slices from matched NIfTI volumes. Atlas images
// keep it buildless and allow the same page to work over HTTP and file://.
(() => {
  const dataElement = document.getElementById("reconstruction-data");
  if (!dataElement) return;
  const cases = JSON.parse(dataElement.textContent);
  const panel = document.getElementById("panel-recon3d");
  const viewer = document.getElementById("volume-comparison");
  const stages = Array.from(viewer.querySelectorAll(".recon-volume-stage"));
  const cubes = stages.map((stage) => stage.querySelector(".recon-volume"));
  const controls = Array.from(panel.querySelectorAll("[data-slice-axis]"));
  const status = document.getElementById("volume-status");
  const caseSelect = panel.querySelector("[data-volume-select]");
  const retry = panel.querySelector("[data-volume-retry]");
  const axes = { sagittal: 0, coronal: 1, axial: 2 };
  let caseIndex = 0;
  let samples = { sagittal: 32, coronal: 32, axial: 32 };
  let atlases = {};
  let generation = 0;
  let initialized = false;
  let ready = false;
  let frame = 0;
  const initialOrientation = () => new DOMMatrix().rotate(-20, -35, 0);
  let orientation = initialOrientation();

  function paintOrientation() {
    frame = 0;
    for (const cube of cubes) cube.style.transform = orientation.toString();
  }
  function scheduleOrientation() {
    if (!frame) frame = requestAnimationFrame(paintOrientation);
  }
  function rotate(dx, dy, roll = 0) {
    if (roll) orientation = new DOMMatrix().rotate(0, 0, roll).multiply(orientation);
    else {
      const distance = Math.hypot(dx, dy);
      if (!distance) return;
      orientation = new DOMMatrix().rotateAxisAngle(-dy, dx, 0, distance * .55).multiply(orientation);
    }
    scheduleOrientation();
  }
  function resetOrientation() {
    orientation = initialOrientation();
    scheduleOrientation();
  }

  function resize() {
    if (!viewer.getClientRects().length) return;
    const data = cases[caseIndex];
    const maximum = Math.max(...data.extent);
    for (const stage of stages) {
      const size = Math.min(238, stage.clientWidth * .58, stage.clientHeight * .65);
      if (!size) continue;
      const [w, d, h] = data.extent.map((extent) => extent / maximum * size);
      stage.style.setProperty("--volume-w", `${w}px`);
      stage.style.setProperty("--volume-h", `${h}px`);
      stage.style.setProperty("--volume-d", `${d}px`);
    }
    updateSlices();
  }

  function updateSlices() {
    const data = cases[caseIndex];
    const maximum = Math.max(...data.extent);
    for (const input of controls) {
      const axis = input.dataset.sliceAxis;
      const axisIndex = axes[axis];
      const sample = samples[axis];
      const index = data.axes[axis].indices[sample];
      input.value = sample;
      input.max = data.sampleCount - 1;
      const label = `${index + 1} / ${data.shape[axisIndex]}`;
      panel.querySelector(`[data-slice-readout="${axis}"]`).textContent = label;
      input.setAttribute("aria-valuetext", `${axis} slice ${label}`);
    }
    for (const stage of stages) {
      const size = Math.min(238, stage.clientWidth * .58, stage.clientHeight * .65);
      for (const [axis, axisIndex] of Object.entries(axes)) {
        const index = data.axes[axis].indices[samples[axis]];
        const direction = axis === "axial" ? -1 : 1;
        const position = direction * (index / (data.shape[axisIndex] - 1) - .5) * data.extent[axisIndex] / maximum * size;
        stage.style.setProperty(`--${axis}-position`, `${position}px`);
        if (!ready) continue;
        const image = atlases[`${stage.dataset.volumeSource}:${axis}`];
        const sample = samples[axis];
        const canvas = stage.querySelector(`canvas[data-plane="${axis}"]`);
        const ctx = canvas.getContext("2d", { alpha: false });
        const tile = data.tileSize;
        ctx.drawImage(image, (sample % data.atlasColumns) * tile, Math.floor(sample / data.atlasColumns) * tile, tile, tile, 0, 0, canvas.width, canvas.height);
      }
    }
  }

  async function loadImage(src) {
    const image = new Image();
    image.decoding = "async";
    image.src = src;
    await image.decode();
    return image;
  }

  async function selectCase(index) {
    initialized = true;
    caseIndex = index;
    const token = ++generation;
    const data = cases[index];
    ready = false;
    atlases = {};
    samples = Object.fromEntries(Object.keys(axes).map((axis) => [axis, Math.floor(data.sampleCount / 2)]));
    viewer.classList.remove("is-ready");
    viewer.setAttribute("aria-busy", "true");
    retry.hidden = true;
    caseSelect.value = String(index);
    status.textContent = "Loading paired volume slices…";
    document.getElementById("volume-case-label").textContent = `${data.modality} · ${data.dataset} · ${data.sample}`;
    document.getElementById("volume-window-label").textContent = data.modality === "CT" ? "Matched CT soft-tissue window" : "Matched MRI intensity window";
    for (const stage of stages) {
      const source = stage.dataset.volumeSource;
      const fallback = stage.querySelector(".volume-fallback");
      fallback.src = data[source + "Poster"];
      fallback.alt = `${source === "gt" ? "Input" : "MedVTok reconstruction"}, paired ${data.modality} coronal slice`;
      stage.setAttribute("aria-label", `${source === "gt" ? "Input" : "MedVTok reconstruction"}, ${data.modality} orthogonal-slice cube. Drag to rotate both views. Arrow keys rotate; Home resets.`);
    }
    resize();
    try {
      const loaded = await Promise.all(["gt", "reconstruction"].flatMap((source) => Object.keys(axes).map(async (axis) => [source + ":" + axis, await loadImage(data.axes[axis][source])])));
      if (token !== generation) return;
      atlases = Object.fromEntries(loaded);
      ready = true;
      updateSlices();
      viewer.classList.add("is-ready");
      viewer.setAttribute("aria-busy", "false");
      status.textContent = "";
    } catch (error) {
      if (token !== generation) return;
      viewer.setAttribute("aria-busy", "false");
      status.textContent = "The paired input and reconstruction are shown as static slices while the 3D view is unavailable.";
      retry.hidden = false;
    }
  }

  caseSelect.addEventListener("change", () => selectCase(Number(caseSelect.value)));
  retry.addEventListener("click", () => selectCase(caseIndex));
  for (const control of controls) control.addEventListener("input", () => {
    samples[control.dataset.sliceAxis] = Number(control.value);
    updateSlices();
  });
  panel.querySelector("[data-volume-reset]").addEventListener("click", resetOrientation);
  panel.addEventListener("panel:activate", () => {
    if (!initialized) selectCase(caseIndex);
    else resize();
  });

  for (const stage of stages) {
    let pointer = null;
    let previousX = 0;
    let previousY = 0;
    stage.addEventListener("pointerdown", (event) => {
      if (!event.isPrimary || event.button !== 0 || pointer !== null) return;
      event.preventDefault();
      pointer = event.pointerId;
      previousX = event.clientX;
      previousY = event.clientY;
      stage.focus({ preventScroll: true });
      stage.setPointerCapture(pointer);
      stage.classList.add("is-dragging");
    });
    stage.addEventListener("pointermove", (event) => {
      if (event.pointerId !== pointer) return;
      rotate(event.clientX - previousX, event.clientY - previousY);
      previousX = event.clientX;
      previousY = event.clientY;
    });
    function finish(event) {
      if (event.pointerId !== pointer) return;
      pointer = null;
      stage.classList.remove("is-dragging");
      if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    }
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) stage.addEventListener(type, finish);
    stage.addEventListener("dblclick", resetOrientation);
    stage.addEventListener("keydown", (event) => {
      const step = event.shiftKey ? 10 : 28;
      const deltas = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (event.key === "Home") { event.preventDefault(); resetOrientation(); }
      else if (event.key === "PageUp" || event.key === "PageDown") { event.preventDefault(); rotate(0, 0, event.key === "PageUp" ? 12 : -12); }
      else if (deltas[event.key]) { event.preventDefault(); rotate(...deltas[event.key]); }
    });
  }
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(viewer);
  else window.addEventListener("resize", resize);
  paintOrientation();
  if (!panel.hidden) selectCase(caseIndex);
})();
