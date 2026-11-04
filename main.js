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

  button.addEventListener("click", function () {
    var next = current() === "dark" ? "light" : "dark";
    root.setAttribute("data-user-color-scheme", next);
    try {
      localStorage.setItem(KEY, next);
    } catch (e) {
      /* storage unavailable; the choice lasts for this page only */
    }
    describe();
  });

  describe();
})();
