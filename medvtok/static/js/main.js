"use strict";

// Filling this anchor's href later enables the Paper button automatically.
const paperLink = document.getElementById("paper-link");
if (paperLink) {
  if (paperLink.getAttribute("href").trim()) {
    paperLink.removeAttribute("aria-disabled");
    paperLink.removeAttribute("tabindex");
    paperLink.removeAttribute("title");
  } else {
    paperLink.addEventListener("click", (event) => event.preventDefault());
  }
}

// Plain JavaScript keeps file:// previews and static subdirectory hosting working.
const tabs = Array.from(document.querySelectorAll("[data-tab]"));

function activateTab(tab) {
  for (const candidate of tabs) {
    const selected = candidate === tab;
    candidate.setAttribute("aria-selected", String(selected));
    candidate.tabIndex = selected ? 0 : -1;
    document.getElementById(candidate.getAttribute("aria-controls")).hidden = !selected;
  }
}

for (const tab of tabs) {
  tab.addEventListener("click", () => activateTab(tab));
  tab.addEventListener("keydown", (event) => {
    const index = tabs.indexOf(tab);
    let next;
    if (event.key === "ArrowRight") next = tabs[(index + 1) % tabs.length];
    if (event.key === "ArrowLeft") next = tabs[(index - 1 + tabs.length) % tabs.length];
    if (event.key === "Home") next = tabs[0];
    if (event.key === "End") next = tabs[tabs.length - 1];
    if (!next) return;
    event.preventDefault();
    activateTab(next);
    next.focus();
    next.scrollIntoView({ block: "nearest", inline: "nearest" });
  });
}

const dialog = document.getElementById("figure-dialog");
const dialogImage = document.getElementById("dialog-image");
const dialogCaption = document.getElementById("dialog-caption");
const dialogOriginal = document.getElementById("dialog-original");
const dialogModality = document.getElementById("dialog-modality-image");

for (const link of document.querySelectorAll("[data-zoom]")) {
  link.addEventListener("click", (event) => {
    // Preserve normal new-tab behavior and fall back to the image in older browsers.
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !dialog.showModal) return;
    event.preventDefault();
    const modality = link.hasAttribute("data-modality-zoom");
    dialog.classList.toggle("modality-dialog", modality);
    dialogImage.hidden = modality;
    dialogModality.hidden = !modality;
    dialogModality.replaceChildren();
    if (modality) {
      const frame = link.querySelector(".modality-image").cloneNode(true);
      frame.querySelector("img").loading = "eager";
      dialogModality.append(frame);
    } else {
      dialogImage.src = link.href;
      dialogImage.alt = link.querySelector("img").alt;
      dialogImage.style.minWidth = `${link.dataset.minWidth || 900}px`;
    }
    dialogCaption.textContent = link.dataset.caption;
    dialogOriginal.href = link.href;
    dialogOriginal.textContent = modality ? "Open original image ↗" : "Open full-resolution figure ↗";
    dialog.showModal();
    document.body.classList.add("dialog-open");
    const viewport = dialog.querySelector(".dialog-image-wrap");
    requestAnimationFrame(() => {
      viewport.scrollLeft = modality ? (viewport.scrollWidth - viewport.clientWidth) / 2 : 0;
      viewport.scrollTop = 0;
    });
  });
}

// Compose rotations around the view axes so dragging can pass through any angle.
// Each modality keeps its own orientation when its panel is hidden and reopened.
for (const stage of document.querySelectorAll(".volume-stage")) {
  const cube = stage.querySelector(".volume-cube");
  const initialOrientation = () => new DOMMatrix().rotate(-23, -34, 0);
  let orientation = initialOrientation();
  let pointer = null;
  let previousX = 0;
  let previousY = 0;
  function render() { cube.style.transform = orientation.toString(); }
  function rotate(dx, dy) {
    const distance = Math.hypot(dx, dy);
    if (!distance) return;
    orientation = new DOMMatrix().rotateAxisAngle(-dy, dx, 0, distance * .55).multiply(orientation);
    render();
  }
  function finishDrag(event) {
    if (event.pointerId !== pointer) return;
    pointer = null;
    stage.classList.remove("is-dragging");
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
  }
  stage.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0 || pointer !== null) return;
    event.preventDefault();
    pointer = event.pointerId;
    previousX = event.clientX;
    previousY = event.clientY;
    stage.focus({preventScroll: true});
    stage.setPointerCapture(pointer);
    stage.classList.add("is-dragging");
  });
  stage.addEventListener("pointermove", (event) => {
    if (event.pointerId !== pointer) return;
    rotate(event.clientX - previousX, event.clientY - previousY);
    previousX = event.clientX;
    previousY = event.clientY;
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) stage.addEventListener(type, finishDrag);
  stage.addEventListener("dblclick", () => { orientation = initialOrientation(); render(); });
  stage.addEventListener("keydown", (event) => {
    const distance = event.shiftKey ? 8 : 24;
    const deltas = {ArrowLeft:[-distance,0], ArrowRight:[distance,0], ArrowUp:[0,-distance], ArrowDown:[0,distance]};
    if (event.key === "Home") { event.preventDefault(); orientation = initialOrientation(); render(); }
    else if (deltas[event.key]) { event.preventDefault(); rotate(...deltas[event.key]); }
  });
  new ResizeObserver(() => {
    if (stage.clientWidth) stage.style.setProperty("--cube-size", `${Math.min(160,stage.clientWidth * .48)}px`);
  }).observe(stage);
  render();
}

// Discrete experiments from the paper, with no interpolated experiment values.
const ablationData = document.getElementById("ablation-data");
if (ablationData) {
  const studies = JSON.parse(ablationData.textContent);
  const explorer = document.getElementById("ablation-interactive");
  const studyButtons = Array.from(document.querySelectorAll("[data-study]"));
  const metricButtons = document.getElementById("ablation-metrics");
  const plotGrid = document.getElementById("ablation-grid");
  const plotPoints = document.getElementById("ablation-points");
  const xLabels = document.getElementById("ablation-x-labels");
  let studyKey = "build";
  let metricKey = studies[studyKey].metrics[0].key;
  let selectedIndex = studies[studyKey].defaultIndex;

  function activeMetric() {
    return studies[studyKey].metrics.find((metric) => metric.key === metricKey);
  }

  function showExperiment(index, focus = false) {
    selectedIndex = index;
    const study = studies[studyKey];
    const metric = activeMetric();
    document.getElementById("ablation-plot").dataset.unavailable = String(study.points.some(point => point.values[metricKey] === null));
    const point = study.points[index];
    const value = point.values[metricKey];
    const baselineIndex = study.deltaMode === "previous" ? Math.max(0, index - 1) : 0;
    const baseline = study.points[baselineIndex].values[metricKey];
    const delta = value === null || baseline === null ? null : value - baseline;
    document.getElementById("ablation-step").textContent = point.label;
    document.getElementById("ablation-step-title").textContent = point.title;
    document.getElementById("ablation-step-description").textContent = point.description;
    document.getElementById("ablation-value").textContent = value === null ? "Not supported" : value.toFixed(2);
    document.getElementById("ablation-value").classList.toggle("is-unavailable", value === null);
    document.getElementById("ablation-unit").textContent = value === null ? "2D-only tokenizer" : metric.unit;
    document.getElementById("ablation-delta").textContent = delta === null
      ? value === null ? "Native 3D reconstruction is not available in E6." : "Native 3D reconstruction enabled from E6 → E7."
      : index === 0
      ? "Baseline for this study"
      : `${delta >= 0 ? "+" : "−"}${Math.abs(delta).toFixed(2)} ${metric.deltaUnit} ${study.deltaMode === "previous" ? `from ${study.points[baselineIndex].label}` : "vs. λ = 0"}`;
    for (const [i, button] of Array.from(plotPoints.children).entries()) {
      button.setAttribute("aria-pressed", String(i === index));
      xLabels.children[i].classList.toggle("selected", i === index);
    }
    const experiment = point.experiment || (/^E\d+$/.test(point.label) ? point.label : null);
    for (const button of document.querySelectorAll("[data-experiment]")) {
      button.setAttribute("aria-pressed", String(button.dataset.experiment === experiment));
      const strip = button.parentElement;
      if (button.dataset.experiment === experiment && strip.scrollWidth > strip.clientWidth) {
        strip.scrollLeft = Math.max(0, button.offsetLeft - (strip.clientWidth - button.offsetWidth) / 2);
      }
    }
    if (focus) plotPoints.children[index].focus({ preventScroll: true });
  }

  function drawChart() {
    const study = studies[studyKey];
    const metric = activeMetric();
    const yPosition = (value) => 12 + (metric.domain[1] - value) / (metric.domain[1] - metric.domain[0]) * 76;
    const xPosition = (index) => {
      const fraction = study.xDomain
        ? (study.points[index].x - study.xDomain[0]) / (study.xDomain[1] - study.xDomain[0])
        : index / (study.points.length - 1);
      return 6 + fraction * 88;
    };
    document.getElementById("ablation-chart-title").textContent = metric.title;
    explorer.style.setProperty("--chart-color", study.color);
    plotGrid.replaceChildren();
    plotPoints.replaceChildren();
    xLabels.replaceChildren();

    for (const tick of metric.ticks) {
      const line = document.createElement("div");
      line.className = "chart-grid-line";
      line.style.top = `${yPosition(tick)}%`;
      const label = document.createElement("span");
      label.textContent = String(tick);
      line.append(label);
      plotGrid.append(line);
    }

    const coordinates = study.points.map((point, index) => [xPosition(index), point.values[metricKey] === null ? 88 : yPosition(point.values[metricKey])]);
    let connected = false;
    const segments = study.points.map((point, index) => {
      if (point.values[metricKey] === null) { connected = false; return ""; }
      const [x, y] = coordinates[index];
      const command = `${connected ? "L" : "M"}${x},${y}`;
      connected = true;
      return command;
    });
    document.getElementById("ablation-line").setAttribute("d", segments.join(" "));
    // The dashed bridge marks new 3D capability; E6 still has no measured score.
    const capabilityPath = studyKey === "continuity" && study.points[0].values[metricKey] === null
      ? `M${coordinates[0].join(",")} L${coordinates[1].join(",")}`
      : "";
    document.getElementById("ablation-capability-line").setAttribute("d", capabilityPath);
    for (const [index, point] of study.points.entries()) {
      const [x, y] = coordinates[index];
      const button = document.createElement("button");
      button.type = "button";
      button.className = "chart-point";
      button.style.left = `${x}%`;
      button.style.top = `${y}%`;
      const value = point.values[metricKey];
      button.classList.toggle("point-unavailable", value === null);
      button.setAttribute("aria-label", `${point.label}: ${point.title}; ${metric.title}, ${value === null ? "not supported" : value.toFixed(2)}`);
      const valueLabel = document.createElement("span");
      valueLabel.className = "point-value";
      valueLabel.textContent = value === null ? "No 3D" : value.toFixed(2);
      button.append(valueLabel);
      button.addEventListener("click", () => showExperiment(index));
      button.addEventListener("keydown", (event) => {
        let next;
        if (event.key === "ArrowRight") next = (index + 1) % study.points.length;
        if (event.key === "ArrowLeft") next = (index - 1 + study.points.length) % study.points.length;
        if (event.key === "Home") next = 0;
        if (event.key === "End") next = study.points.length - 1;
        if (next === undefined) return;
        event.preventDefault();
        showExperiment(next, true);
      });
      plotPoints.append(button);
      const label = document.createElement("span");
      label.textContent = point.label;
      label.style.left = `${x}%`;
      xLabels.append(label);
    }
    for (const button of metricButtons.children) {
      button.setAttribute("aria-pressed", String(button.dataset.metric === metricKey));
    }
    showExperiment(selectedIndex);
  }

  function switchStudy(key, index = studies[key].defaultIndex) {
    studyKey = key;
    metricKey = studies[key].metrics[0].key;
    selectedIndex = index;
    metricButtons.replaceChildren();
    for (const metric of studies[key].metrics) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.metric = metric.key;
      button.textContent = metric.label;
      button.addEventListener("click", () => {
        metricKey = metric.key;
        drawChart();
      });
      metricButtons.append(button);
    }
    for (const button of studyButtons) button.setAttribute("aria-pressed", String(button.dataset.study === key));
    drawChart();
  }

  for (const button of studyButtons) button.addEventListener("click", () => switchStudy(button.dataset.study));
  for (const button of document.querySelectorAll("[data-experiment]")) {
    button.addEventListener("click", () => switchStudy(button.dataset.experimentStudy, Number(button.dataset.experimentIndex)));
  }
  switchStudy(studyKey);
  document.getElementById("ablation-static").hidden = true;
  explorer.hidden = false;
}

const benchmarkData = JSON.parse(document.getElementById("benchmark-data").textContent);
const taskRing = document.getElementById("task-ring");
const taskDetail = document.getElementById("task-detail");
const taskCard = taskRing.closest(".radial-card");
const taskOverview = document.getElementById("task-overview");
let taskTrigger = null;

function renderLegend(id, models) {
  const legend = document.getElementById(id);
  legend.replaceChildren();
  for (const model of models) {
    const item = document.createElement("span");
    if (model === "MedVTok") item.className = "legend-ours";
    const swatch = document.createElement("i");
    swatch.style.background = benchmarkData.colors[model];
    swatch.setAttribute("aria-hidden", "true");
    item.append(swatch, document.createTextNode(model));
    legend.append(item);
  }
}

function showBarReadout(id, bar) {
  if (!bar) return;
  const element = document.getElementById(id);
  const key = [bar.dataset.category, bar.dataset.model, bar.dataset.value, bar.dataset.metric, bar.dataset.unit].join("|");
  if (element.dataset.valueKey === key) return;
  element.dataset.valueKey = key;
  const heading = document.createElement("strong");
  heading.textContent = bar.dataset.category;
  const scope = document.createElement("span");
  scope.textContent = bar.dataset.metric;
  element.replaceChildren(heading, document.createTextNode(`${bar.dataset.model} · ${bar.dataset.value} ${bar.dataset.unit}`), scope);
}

function openTask(key) {
  const task = benchmarkData.tasks.find((candidate) => candidate.key === key);
  if (!task) return;
  taskDetail.hidden = false;
  taskTrigger = taskRing.querySelector(`.radial-sector[data-task="${key}"]`);
  taskOverview.inert = true;
  taskCard.classList.add("detail-open");
  taskDetail.dataset.activeTask = key;
  const group = key === "report" ? "by CT region" : key === "vqa" ? "by benchmark" : "by modality";
  document.getElementById("task-detail-title").textContent = `${task.title} ${group}`;
  document.getElementById("task-detail-scale").textContent = task.metric;
  for (const panel of document.querySelectorAll("[data-task-breakdown]")) panel.hidden = panel.dataset.taskBreakdown !== key;
  for (const sector of taskRing.querySelectorAll(".radial-sector")) {
    const active = sector.dataset.task === key;
    sector.classList.toggle("is-selected", active);
    sector.setAttribute("aria-expanded", String(active));
  }
  const bar = taskRing.querySelector(`[data-task="${key}"][data-model="MedVTok"]`);
  showBarReadout("task-ring-readout", bar);
  document.getElementById("task-detail-scroll").scrollTop = 0;
  document.getElementById("close-task-detail").focus({preventScroll: true});
}

taskRing.addEventListener("click", (event) => {
  const sector = event.target.closest("[data-task]");
  if (sector) openTask(sector.dataset.task);
});
taskRing.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const sector = event.target.closest('.radial-sector[data-task]');
  if (sector) {
    event.preventDefault();
    openTask(sector.dataset.task);
  }
});
taskRing.addEventListener("pointerover", (event) => showBarReadout("task-ring-readout", event.target.closest(".radial-bar")));
function closeTask() {
  taskOverview.inert = false;
  taskCard.classList.remove("detail-open");
  taskDetail.hidden = true;
  taskOverview.animate([{opacity:.25,transform:"scale(.97)"},{opacity:1,transform:"scale(1)"}], {duration:matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 260,easing:"ease-out"});
  for (const sector of taskRing.querySelectorAll(".radial-sector")) {
    sector.setAttribute("aria-expanded", "false");
    sector.classList.remove("is-selected");
  }
  taskTrigger?.focus({preventScroll: true});
}
document.getElementById("close-task-detail").addEventListener("click", closeTask);
taskDetail.addEventListener("keydown", (event) => {
  if (event.key === "Escape") { event.preventDefault(); closeTask(); }
});
renderLegend("task-ring-legend", benchmarkData.task_models);
showBarReadout("task-ring-readout", taskRing.querySelector('[data-task="classification"][data-model="MedVTok"]'));

// Native SVG pies and local image assets also work in an offline file:// preview.
const training = document.getElementById("training-distribution");
function selectTrainingModality(panel, index) {
  for (const statistic of panel.querySelectorAll("[data-training-stat]")) {
    statistic.hidden = statistic.dataset.trainingStat !== index;
  }
  for (const detail of panel.querySelectorAll("[data-training-detail]")) {
    detail.hidden = detail.dataset.trainingDetail !== index;
  }
  for (const item of panel.querySelectorAll("[data-training-modality]")) {
    const selected = item.dataset.trainingModality === index;
    item.setAttribute("aria-pressed", String(selected));
    item.classList.toggle("is-selected", selected);
  }
  const active = panel.querySelector(`[data-training-detail="${index}"]`);
  active.animate([{opacity:.2,transform:"translateY(8px)"},{opacity:1,transform:"translateY(0)"}], {duration:matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 250,easing:"ease-out"});
}
training.addEventListener("click", (event) => {
  const dimensionButton = event.target.closest("[data-training-dimension]");
  if (dimensionButton) {
    const dimension = dimensionButton.dataset.trainingDimension;
    for (const panel of training.querySelectorAll("[data-training-panel]")) panel.hidden = panel.dataset.trainingPanel !== dimension;
    for (const button of training.querySelectorAll("[data-training-dimension]")) button.setAttribute("aria-pressed", String(button === dimensionButton));
    const total = document.getElementById("training-total");
    const count = document.createElement("strong");count.textContent = dimension === "2d" ? "> 28M" : "> 70K";
    total.replaceChildren(count, document.createTextNode(dimension === "2d" ? " images" : " volumes"));
  }
  const slice = event.target.closest("[data-training-modality]");
  if (slice) selectTrainingModality(slice.closest("[data-training-panel]"), slice.dataset.trainingModality);
});
training.addEventListener("keydown", (event) => {
  const slice = event.target.closest(".training-slice");
  if (!slice) return;
  const panel = slice.closest("[data-training-panel]");
  const slices = Array.from(panel.querySelectorAll(".training-slice"));
  let index = slices.indexOf(slice);
  if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectTrainingModality(panel, slice.dataset.trainingModality); }
  else if (["ArrowRight","ArrowLeft","Home","End"].includes(event.key)) {
    event.preventDefault();
    index = event.key === "Home" ? 0 : event.key === "End" ? slices.length-1 : (index+(event.key === "ArrowRight" ? 1 : -1)+slices.length)%slices.length;
    slices[index].focus();selectTrainingModality(panel, slices[index].dataset.trainingModality);
  }
});

let reconstructionDimension = "2d";
let reconstructionMetric = "psnr";
function showReconstruction() {
  for (const panel of document.querySelectorAll("[data-reconstruction-panel]")) {
    panel.hidden = panel.dataset.reconstructionPanel !== `${reconstructionDimension}-${reconstructionMetric}`;
  }
  for (const button of document.querySelectorAll("[data-reconstruction-dimension]")) {
    button.setAttribute("aria-pressed", String(button.dataset.reconstructionDimension === reconstructionDimension));
  }
  for (const button of document.querySelectorAll("[data-reconstruction-metric]")) {
    button.setAttribute("aria-pressed", String(button.dataset.reconstructionMetric === reconstructionMetric));
  }
  renderLegend("reconstruction-ring-legend", benchmarkData.reconstruction[reconstructionDimension].models);
  const current = document.querySelector(`[data-reconstruction-panel="${reconstructionDimension}-${reconstructionMetric}"]`);
  showBarReadout("reconstruction-readout", current.querySelector('[data-model="MedVTok"]'));
}
for (const button of document.querySelectorAll("[data-reconstruction-dimension]")) {
  button.addEventListener("click", () => {
    reconstructionDimension = button.dataset.reconstructionDimension;
    showReconstruction();
  });
}
for (const button of document.querySelectorAll("[data-reconstruction-metric]")) {
  button.addEventListener("click", () => {
    reconstructionMetric = button.dataset.reconstructionMetric;
    showReconstruction();
  });
}
const reconstructionRings = document.getElementById("reconstruction-rings");
for (const event of ["pointerover", "click"]) reconstructionRings.addEventListener(event, (action) => showBarReadout("reconstruction-readout", action.target.closest(".radial-bar")));
showReconstruction();

function clearFigureState() {
  document.body.classList.remove("dialog-open");
  dialogModality.replaceChildren();
}

function closeFigure() {
  dialog.close();
  clearFigureState();
}

dialog.querySelector(".dialog-close").addEventListener("click", closeFigure);
dialog.addEventListener("cancel", clearFigureState);
dialog.addEventListener("close", () => {
  if (!dialog.open) clearFigureState();
});
dialog.addEventListener("click", (event) => {
  const bounds = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom)) closeFigure();
});

function fallbackCopy(text) {
  const activeElement = document.activeElement;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.append(textarea);
  textarea.select();
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } finally {
    textarea.remove();
    if (activeElement && typeof activeElement.focus === "function") activeElement.focus({ preventScroll: true });
  }
  if (!copied) throw new Error("Clipboard unavailable");
}

for (const button of document.querySelectorAll("[data-copy]")) {
  button.addEventListener("click", async () => {
    const source = document.getElementById(button.dataset.copy);
    const label = button.textContent;
    const status = document.getElementById("copy-status");
    button.disabled = true;
    try {
      try {
        if (!navigator.clipboard || !window.isSecureContext) throw new Error("Use clipboard fallback");
        await navigator.clipboard.writeText(source.textContent);
      } catch {
        fallbackCopy(source.textContent);
      }
      button.textContent = "Copied ✓";
      status.textContent = button.dataset.copy === "bibtex" ? "BibTeX copied to clipboard." : "Inference example copied to clipboard.";
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(source);
      selection.removeAllRanges();
      selection.addRange(range);
      button.textContent = "Text selected";
      status.textContent = "Text selected. Press Ctrl+C or ⌘C to copy.";
      source.scrollIntoView({ block: "center" });
    } finally {
      window.setTimeout(() => {
        button.textContent = label;
        button.disabled = false;
      }, 2000);
    }
  });
}
