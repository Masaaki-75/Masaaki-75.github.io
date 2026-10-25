"use strict";

(() => {
  const references = JSON.parse(document.getElementById("benchmark-reference-data")?.textContent || "{}");

  function benchmarkLink(name) {
    if (!references[name]) return document.createTextNode(name);
    const link = document.createElement("a");
    link.className = "benchmark-source";
    link.textContent = name;
    link.href = references[name];
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.title = `${name} source (opens in a new tab)`;
    return link;
  }

  function renderTable(root, models, rows, label) {
    const table = root.querySelector("table");
    const body = document.createElement("tbody");
    for (const row of rows) {
      const tr = document.createElement("tr");
      if (row.group) tr.className = "benchmark-group-start";
      const heading = document.createElement("th");
      heading.scope = "row";
      const name = document.createElement("span");
      name.className = "benchmark-name";
      name.textContent = row.name;
      heading.append(name);
      if (row.benchmarks?.length) {
        const sources = document.createElement("span");
        sources.className = "benchmark-metric benchmark-sources";
        row.benchmarks.forEach((benchmark, index) => {
          if (index) sources.append(" · ");
          sources.append(benchmarkLink(benchmark));
        });
        heading.append(sources);
      }
      if (row.benchmark || row.metric) {
        const detail = document.createElement("span");
        detail.className = "benchmark-metric";
        if (row.benchmark) detail.append(benchmarkLink(row.benchmark));
        if (row.metric) detail.append(`${row.benchmark ? " · " : ""}${row.metric}`);
        heading.append(detail);
      }
      tr.append(heading);
      const available = Object.values(row.values).filter(Number.isFinite);
      const best = (row.lower ? Math.min : Math.max)(...available);
      const format = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: row.decimals ?? 2, maximumFractionDigits: row.decimals ?? 2,
      });
      for (const model of models) {
        const td = document.createElement("td");
        if (model === "MedVTok") td.className = "benchmark-ours";
        const value = row.values[model];
        if (!Number.isFinite(value)) {
          const missing = document.createElement("span");
          missing.className = "benchmark-missing";
          missing.setAttribute("aria-label", "Not reported");
          missing.textContent = "—";
          td.append(missing);
        } else if (value === best) {
          const strong = document.createElement("strong");
          strong.textContent = format.format(value);
          td.append(strong);
        } else td.textContent = format.format(value);
        tr.append(td);
      }
      body.append(tr);
    }
    table.querySelector("tbody").replaceWith(body);
    table.querySelector("caption").textContent = label;
  }

  function initFidelity() {
    const root = document.getElementById("fidelity-benchmarks");
    const source = document.getElementById("fidelity-benchmark-data");
    if (!root || !source) return;
    const data = JSON.parse(source.textContent);
    const models = ["MedVTok", "PUMIT", "MedVAE", "MedITok", "AToken"];
    const metricButtons = Array.from(root.querySelectorAll("[data-reconstruction-metric]"));
    const unit = root.querySelector(".benchmark-unit");
    let metric = "psnr";
    function render() {
      const rows = [];
      for (const [dim, dataset] of Object.entries(data)) {
        dataset.modalities.forEach((name, index) => {
          rows.push({ name: `${dim.toUpperCase()} ${name}`, benchmark: dataset.benchmarks[index], group: dim === "3d" && index === 0,
            values: Object.fromEntries(dataset.models.map(model => [model, dataset[metric][model][index]])),
          });
        });
      }
      unit.textContent = metric === "psnr" ? "dB ↑" : "% ↑";
      renderTable(root, models, rows, `Reconstruction · ${metric.toUpperCase()} · ${unit.textContent} · All modalities`);
    }
    for (const button of metricButtons) {
      button.addEventListener("click", () => {
        metric = button.dataset.reconstructionMetric;
        for (const item of metricButtons) item.setAttribute("aria-pressed", String(item === button));
        render();
      });
    }
    render();
  }

  function initDownstream() {
    const root = document.getElementById("downstream-benchmarks");
    const source = document.getElementById("downstream-benchmark-data");
    if (!root || !source) return;
    const data = JSON.parse(source.textContent);
    const select = root.querySelector("select");
    const models = ["MedVTok", ...data.models.filter(model => model !== "MedVTok")];
    function render() {
      const rows = [];
      for (const task of data.tasks) {
        if (!["summary", "all", task.key].includes(select.value)) continue;
        const common = { lower: task.key === "synthesis", decimals: task.decimals };
        if (select.value === "summary") {
          rows.push({ ...common, name: task.title, metric: `Mean · ${task.metric}`,
            benchmarks: [...new Set(task.breakdown.benchmarks)],
            values: Object.fromEntries(data.models.map((model, index) => [model, task.values[index]])),
          });
        } else {
          task.breakdown.categories.forEach((category, index) => {
            const name = task.key === "report" ? `3D CT · ${category}`
              : task.key === "vqa" ? category : `2D ${category}`;
            const metric = [select.value === "all" ? task.title : "", task.metric].filter(Boolean).join(" · ");
            rows.push({ ...common, name, benchmark: task.breakdown.benchmarks[index], metric, group: index === 0,
              values: Object.fromEntries(data.models.map(model => [model, task.breakdown.values[model][index]])),
            });
          });
        }
      }
      renderTable(root, models, rows, `Downstream utility · ${select.selectedOptions[0].textContent}`);
    }
    select.addEventListener("change", render);
    render();
  }

  initFidelity();
  initDownstream();
})();
