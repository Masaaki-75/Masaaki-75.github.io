"use strict";

// CSS moves three evenly phased highlights over a fixed, shared surface.
// Pause when offscreen, when the tab is hidden, or at the reader's request.
(() => {
  const scene = document.querySelector(".interface-landscape");
  const toggle = document.getElementById("latent-motion-toggle");
  if (!scene || !toggle) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let visible = false;
  let paused = false;

  function update() {
    scene.classList.toggle("is-flowing", visible && !paused && !reducedMotion.matches && !document.hidden);
    toggle.hidden = reducedMotion.matches;
    toggle.setAttribute("aria-pressed", String(paused));
    toggle.setAttribute("aria-label", paused ? "Resume the representation animation" : "Pause the representation animation");
    toggle.querySelector("span").textContent = paused ? "Resume motion" : "Pause motion";
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
})();
