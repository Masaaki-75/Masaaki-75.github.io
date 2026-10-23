"use strict";

// CSS owns the timelines. Keep a reader's chosen phase when paused/offscreen;
// reduced motion instead restores the complete, legible static illustration.
(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  for (const scene of document.querySelectorAll("[data-method-motion]")) {
    const toggle = scene.querySelector(".method-motion-toggle");
    if (!toggle) continue;
    let visible = false;
    let paused = false;

    function update() {
      scene.classList.toggle("motion-ready", !reducedMotion.matches);
      scene.classList.toggle("is-playing", visible && !paused && !reducedMotion.matches && !document.hidden);
      toggle.hidden = reducedMotion.matches;
      toggle.setAttribute("aria-pressed", String(paused));
      const label = `${paused ? "Resume" : "Pause"} the ${scene.dataset.methodMotion} animation`;
      toggle.setAttribute("aria-label", label);
      toggle.title = label;
    }

    toggle.addEventListener("click", () => {
      paused = !paused;
      update();
    });
    document.addEventListener("visibilitychange", update);
    reducedMotion.addEventListener("change", update);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
        update();
      }, { threshold: 0 }).observe(scene);
    } else {
      visible = true;
    }
    update();
  }
})();
