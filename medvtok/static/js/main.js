"use strict";

// The page remains a buildless GitHub Pages site, including file:// previews.
const paperLink = document.getElementById("paper-link");
if (paperLink.getAttribute("href").trim()) {
  paperLink.removeAttribute("aria-disabled");
  paperLink.removeAttribute("tabindex");
  paperLink.removeAttribute("title");
  paperLink.querySelector("span")?.remove();
} else {
  paperLink.addEventListener("click", (event) => event.preventDefault());
}

const menuButton = document.querySelector(".menu-toggle");
const navigation = document.getElementById("site-navigation");
function setMenu(open) {
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  navigation.classList.toggle("is-open", open);
}
menuButton.addEventListener("click", () => setMenu(menuButton.getAttribute("aria-expanded") !== "true"));
navigation.addEventListener("click", (event) => {
  if (event.target.closest("a")) setMenu(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") {
    setMenu(false);
    menuButton.focus();
  }
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".navigation")) setMenu(false);
});
matchMedia("(max-width: 600px)").addEventListener("change", () => setMenu(false));
if ("IntersectionObserver" in window) {
  const navLinks = Array.from(navigation.querySelectorAll("a"));
  const observer = new IntersectionObserver((entries) => {
    const entry = entries.find((item) => item.isIntersecting);
    if (!entry) return;
    for (const link of navLinks) {
      if (link.hash === `#${entry.target.id}`) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    }
  }, { rootMargin: "-10% 0px -65% 0px" });
  for (const link of navLinks) observer.observe(document.querySelector(link.hash));
}

function primeImages(container) {
  for (const img of container.querySelectorAll("img")) {
    img.loading = "eager";
    img.decoding = "async";
  }
}

// Each tab group owns its panels and supports the standard arrow/Home/End keys.
for (const group of document.querySelectorAll('[role="tablist"]')) {
  const tabs = Array.from(group.querySelectorAll('[role="tab"]'));
  function activate(tab) {
    for (const item of tabs) {
      const selected = item === tab;
      item.setAttribute("aria-selected", String(selected));
      item.tabIndex = selected ? 0 : -1;
      const panel = document.getElementById(item.getAttribute("aria-controls"));
      panel.hidden = !selected;
      if (selected) {
        primeImages(panel);
        panel.dispatchEvent(new CustomEvent("panel:activate"));
      }
    }
  }
  for (const [index, tab] of tabs.entries()) {
    tab.addEventListener("click", () => activate(tab));
    tab.addEventListener("keydown", (event) => {
      let next;
      if (event.key === "ArrowRight") next = tabs[(index + 1) % tabs.length];
      if (event.key === "ArrowLeft") next = tabs[(index - 1 + tabs.length) % tabs.length];
      if (event.key === "Home") next = tabs[0];
      if (event.key === "End") next = tabs[tabs.length - 1];
      if (!next) return;
      event.preventDefault();
      activate(next);
      next.focus({ preventScroll: true });
      next.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
  }
}

const trainingData = JSON.parse(document.getElementById("training-data").textContent);
const corpus = document.getElementById("training-distribution");
const selectedModality = { "2d": 0, "3d": 0 };
let corpusDimension = "2d";
function creditLink(label, href) {
  const link = document.createElement("a");
  link.textContent = label;
  link.href = href;
  link.target = "_blank";
  link.rel = "noopener";
  return link;
}
function renderCorpus() {
  const collection = trainingData[corpusDimension];
  const index = selectedModality[corpusDimension];
  const modality = collection.modalities[index];
  const media = modality.media;
  const threeD = corpusDimension === "3d";
  for (const button of corpus.querySelectorAll("[data-dimension]")) {
    button.setAttribute("aria-pressed", String(button.dataset.dimension === corpusDimension));
  }
  for (const panel of corpus.querySelectorAll("[data-corpus-panel]")) {
    panel.hidden = panel.dataset.corpusPanel !== corpusDimension;
    for (const button of panel.querySelectorAll("[data-modality]")) {
      button.setAttribute("aria-pressed", String(Number(button.dataset.modality) === selectedModality[panel.dataset.corpusPanel]));
    }
  }
  const total = document.getElementById("corpus-total");
  const totalUnit = document.createElement("span");
  totalUnit.textContent = collection.unit;
  total.replaceChildren(document.createTextNode((corpusDimension === "2d" ? "28M+" : "70K+") + " "), totalUnit);
  document.getElementById("corpus-dimension-label").textContent = threeD ? "Native 3D imaging" : "2D imaging";
  document.getElementById("corpus-modality-title").textContent = modality.name;
  const share = document.getElementById("corpus-modality-share");
  const shareScope = document.createElement("span");
  shareScope.textContent = `of the ${corpusDimension.toUpperCase()} corpus`;
  share.replaceChildren(document.createTextNode(`${(modality.count / collection.total * 100).toFixed(1)}%`), shareScope);
  document.getElementById("corpus-modality-description").textContent = modality.description;
  const frame = document.getElementById("corpus-image");
  frame.replaceChildren();
  if (threeD) {
    const views = document.createElement("div");
    views.className = "corpus-volume";
    for (const [axis, src] of Object.entries(media.faces)) {
      const figure = document.createElement("figure");
      const img = new Image();
      img.src = src;
      img.alt = `Illustrative ${modality.name} ${axis} view from 3D Slicer sample data`;
      img.decoding = "async";
      const caption = document.createElement("figcaption");
      caption.textContent = axis.charAt(0).toUpperCase() + axis.slice(1);
      figure.append(img, caption);
      views.append(figure);
    }
    frame.append(views);
  } else {
    const img = new Image();
    img.src = media.image;
    img.alt = media.alt;
    img.width = media.display?.size[0] || 500;
    img.height = media.display?.size[1] || 500;
    img.decoding = "async";
    img.classList.toggle("is-flipped", Boolean(media.display?.flip_vertical));
    frame.append(img);
  }
  document.getElementById("corpus-credit").replaceChildren(
    document.createTextNode(threeD ? "Illustrative orthogonal views · " : "Illustrative image · "),
    creditLink(media.author, media.source_url),
    document.createTextNode(" · "),
    creditLink(media.license, media.license_url)
  );
}
corpus.addEventListener("click", (event) => {
  const dimension = event.target.closest("[data-dimension]");
  const modality = event.target.closest("[data-modality]");
  if (dimension) corpusDimension = dimension.dataset.dimension;
  else if (modality) selectedModality[corpusDimension] = Number(modality.dataset.modality);
  else return;
  renderCorpus();
});
renderCorpus();

// Native dialog keeps Escape, focus restoration, and full-resolution links usable.
const figureDialog = document.getElementById("figure-dialog");
const dialogImage = document.getElementById("dialog-image");
for (const link of document.querySelectorAll("[data-zoom]")) {
  link.addEventListener("click", (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || typeof figureDialog.showModal !== "function") return;
    event.preventDefault();
    dialogImage.src = link.href;
    dialogImage.alt = link.querySelector("img")?.alt || link.querySelector(".method-scene desc")?.textContent || link.getAttribute("aria-label") || "Figure";
    const minimumWidth = Number(link.dataset.minWidth || 900);
    dialogImage.style.width = `${Number(link.dataset.displayWidth) || Math.max(minimumWidth, Math.min(1200, window.innerWidth - 100))}px`;
    document.getElementById("dialog-caption").textContent = link.dataset.caption || dialogImage.alt;
    document.getElementById("dialog-original").href = link.href;
    figureDialog.showModal();
    document.body.classList.add("dialog-open");
    const viewport = figureDialog.querySelector(".dialog-image-wrap");
    viewport.scrollTop = 0;
    viewport.scrollLeft = 0;
  });
}
figureDialog.querySelector(".dialog-close").addEventListener("click", () => figureDialog.close());
figureDialog.addEventListener("click", (event) => {
  const box = figureDialog.getBoundingClientRect();
  if (event.target === figureDialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) figureDialog.close();
});
figureDialog.addEventListener("close", () => {
  document.body.classList.remove("dialog-open");
  dialogImage.removeAttribute("src");
});

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
    document.getElementById("ablation-scope").textContent = study.scope + " Each point is measured; lines only guide the eye.";
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
    explorer.style.setProperty("--chart-color", studyKey === "build" ? "#bac6eb" : "#a9cfca");
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
  switchStudy(studyKey);
  document.getElementById("ablation-static").hidden = true;
  explorer.hidden = false;
}


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
