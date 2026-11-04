// Credits: a small, dependency-free enhancement layer.
//
// 1. "Roll credits": the page scrolls itself slowly, like end credits, until the
//    visitor touches anything. Hidden entirely when reduced motion is preferred.
// 2. Sections fade in as they arrive (CSS does the work; this toggles a class).
// 3. Printing opens every folded passage so the PDF carries the full record.
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

  // --- Roll -------------------------------------------------------------------

  var button = document.querySelector("[data-roll]");
  var rolling = false;
  var frame = null;
  var last = 0;
  var SPEED = 42; // pixels per second, roughly the pace of real end credits

  function label(text) {
    if (button) button.textContent = text;
  }

  function atBottom() {
    return window.innerHeight + window.scrollY >= root.scrollHeight - 1;
  }

  function step(now) {
    if (!rolling) return;
    if (last) {
      window.scrollBy(0, ((now - last) / 1000) * SPEED);
    }
    last = now;
    if (atBottom()) {
      stop("Roll again");
      return;
    }
    frame = requestAnimationFrame(step);
  }

  function start() {
    if (rolling || !button) return;
    rolling = true;
    last = 0;
    root.style.scrollBehavior = "auto";
    button.setAttribute("aria-pressed", "true");
    label("Pause");
    // Reveal everything so the roll is uninterrupted by fades.
    reveals.forEach(function (el) {
      el.classList.add("is-visible");
    });
    frame = requestAnimationFrame(step);
  }

  function stop(text) {
    if (!rolling) return;
    rolling = false;
    if (frame) cancelAnimationFrame(frame);
    frame = null;
    root.style.scrollBehavior = "";
    if (button) {
      button.setAttribute("aria-pressed", "false");
      label(text || "Roll credits");
    }
  }

  if (button && !reduceMotion.matches) {
    button.addEventListener("click", function () {
      if (rolling) {
        stop();
      } else {
        if (atBottom()) window.scrollTo(0, 0);
        start();
      }
    });

    // Any deliberate input from the visitor hands control back to them.
    ["wheel", "touchstart", "pointerdown"].forEach(function (type) {
      window.addEventListener(
        type,
        function (event) {
          if (rolling && !(event.target && button.contains(event.target))) stop();
        },
        { passive: true }
      );
    });

    window.addEventListener("keydown", function (event) {
      if (!rolling) return;
      var keys = ["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " ", "Escape"];
      if (keys.indexOf(event.key) !== -1) stop();
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
