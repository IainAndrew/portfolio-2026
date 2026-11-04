// Credits: a small, dependency-free enhancement layer.
//
// 1. Sections fade in as they arrive (CSS does the work; this toggles a class).
// 2. Printing opens every folded passage so the PDF carries the full record.
//
// Without JavaScript the page is complete: a readable list, native <details>.

(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.add("js");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // --- Reveal -----------------------------------------------------------------

  var reveals = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window && !reduceMotion.matches) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px" }
    );
    reveals.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    reveals.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  // --- Print ------------------------------------------------------------------

  var opened = [];

  window.addEventListener("beforeprint", function () {
    opened = [];
    document.querySelectorAll("details").forEach(function (d) {
      if (!d.open) {
        d.open = true;
        opened.push(d);
      }
    });
  });

  window.addEventListener("afterprint", function () {
    opened.forEach(function (d) {
      d.open = false;
    });
    opened = [];
  });
})();
