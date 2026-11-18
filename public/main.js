// Theme toggle. Stores an explicit choice in localStorage; with no choice the
// page follows the system. Without JavaScript the toggle is hidden and the page
// still honours prefers-color-scheme through CSS.

(function () {
  "use strict";

  var KEY = "user-color-scheme";
  var root = document.documentElement;
  root.classList.remove("no-js");

  var button = document.querySelector(".js-mode-toggle");
  var text = document.querySelector(".js-mode-toggle-text");
  if (!button) return;

  function current() {
    var chosen = root.getAttribute("data-user-color-scheme");
    if (chosen) return chosen;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function describe() {
    if (text) {
      text.textContent = current() === "dark" ? "Switch to light mode" : "Switch to dark mode";
    }
  }

  function toggle() {
    var next = current() === "dark" ? "light" : "dark";
    root.setAttribute("data-user-color-scheme", next);
    try {
      localStorage.setItem(KEY, next);
    } catch (e) {
      /* storage unavailable; the choice lasts for this page only */
    }
    describe();
  }

  button.addEventListener("click", toggle);

  // Press "t" anywhere to flip the theme.
  document.addEventListener("keydown", function (event) {
    if (event.key === "t") toggle();
  });

  // Follow the system when it changes, unless the visitor has chosen.
  var media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", function () {
    root.removeAttribute("data-user-color-scheme");
    describe();
  });

  // Keep tabs in sync: a choice made in one tab applies to the others.
  window.addEventListener("storage", function (event) {
    if (event.key !== KEY) return;
    root.setAttribute("data-user-color-scheme", event.newValue);
    describe();
  });

  describe();
})();
