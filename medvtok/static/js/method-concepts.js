"use strict";

// The diagrams loop in view; preserve their phase while offscreen/in the background.
(() => {
  // Keep the medical rasters out of the initial document/download path.
  function loadImages(scene) {
    for (const image of scene.querySelectorAll("image[data-image-src]")) {
      image.setAttribute("href", image.dataset.imageSrc);
      image.removeAttribute("data-image-src");
    }
  }
  const imageObserver = "IntersectionObserver" in window ? new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      loadImages(entry.target);
      imageObserver.unobserve(entry.target);
    }
  }, { rootMargin: "600px 0px" }) : null;
  for (const scene of document.querySelectorAll("[data-method-motion]")) {
    let visible = false;
    if (imageObserver) imageObserver.observe(scene);
    else loadImages(scene);

    function update() {
      scene.classList.add("motion-enabled", "motion-ready");
      scene.classList.toggle("is-playing", visible && !document.hidden);
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
  }
})();
