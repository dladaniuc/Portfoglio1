document.documentElement.classList.remove("no-js");
document.documentElement.classList.add("js");

const siteNav = document.getElementById("siteNav");
const navLinks = document.querySelectorAll("#siteNav a[data-target]");
const triggers = document.querySelectorAll("[data-target]");
const sections = document.querySelectorAll("main > section");

const FOCUSABLE =
  "a[href], area[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, object, embed, [contenteditable], [tabindex]";

function setFocusableDisabled(container, disabled) {
  const nodes = container.querySelectorAll(FOCUSABLE);

  nodes.forEach((el) => {
    if (disabled) {
      if (!el.hasAttribute("data-prev-tabindex")) {
        const prev = el.getAttribute("tabindex");
        el.setAttribute("data-prev-tabindex", prev === null ? "__null__" : prev);
      }
      el.setAttribute("tabindex", "-1");
    } else {
      const prev = el.getAttribute("data-prev-tabindex");
      if (prev !== null) {
        if (prev === "__null__") el.removeAttribute("tabindex");
        else el.setAttribute("tabindex", prev);
        el.removeAttribute("data-prev-tabindex");
      }
    }
  });
}

function setPanelA11y(panel, isActive) {
  panel.setAttribute("aria-hidden", isActive ? "false" : "true");

  if ("inert" in panel) {
    panel.inert = !isActive;
  } else {
    setFocusableDisabled(panel, !isActive);
  }
}

function initTabSemantics() {
  if (!siteNav) return;

  siteNav.setAttribute("role", "tablist");
  if (!siteNav.hasAttribute("aria-label")) siteNav.setAttribute("aria-label", "Primary");

  navLinks.forEach((a) => {
    const target = a.dataset.target;
    a.setAttribute("role", "tab");
    a.setAttribute("aria-controls", target);

    if (!a.id) a.id = `tab-${target}`;
  });

  sections.forEach((s) => {
    s.setAttribute("role", "tabpanel");
    const tab = siteNav.querySelector(`a[data-target="${s.id}"]`);
    if (tab) s.setAttribute("aria-labelledby", tab.id);
  });
}

function showSection(id) {
  sections.forEach((s) => {
    const isActive = s.id === id;
    s.classList.toggle("is-active", isActive);
    setPanelA11y(s, isActive);
  });

  navLinks.forEach((a) => {
    const isActive = a.dataset.target === id;

    a.classList.toggle("is-active", isActive);

    if (isActive) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");

    a.setAttribute("aria-selected", isActive ? "true" : "false");
    a.tabIndex = isActive ? 0 : -1;
  });
}

triggers.forEach((el) => {
  el.addEventListener("click", (e) => {
    const id = el.dataset.target;
    if (!id) return;
    e.preventDefault();
    goToSection(id);
  });
});

const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

const sectionOrder = Array.from(sections).map((s) => s.id);

function getActiveSectionId() {
  const active = Array.from(sections).find((s) => s.classList.contains("is-active"));
  return active?.id || "home";
}

function goToSection(id, { push = true, focus = true } = {}) {
  if (!sectionOrder.includes(id)) return;

  showSection(id);

  if (push) history.pushState({ id }, "", `#${id}`);

  if (focus) {
    const targetSection = document.getElementById(id);
    const heading = targetSection?.querySelector("h2, h1, h3, [tabindex]");
    if (heading) {
      if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    }
  }
}

function goRelative(delta) {
  const currentId = getActiveSectionId();
  const idx = Math.max(0, sectionOrder.indexOf(currentId));
  const nextIdx = (idx + delta + sectionOrder.length) % sectionOrder.length;
  goToSection(sectionOrder[nextIdx]);
}

initTabSemantics();

const initialHash = window.location.hash?.replace("#", "");
const startId = initialHash && sectionOrder.includes(initialHash) ? initialHash : getActiveSectionId();

goToSection(startId, { push: false, focus: false });

window.addEventListener("popstate", (ev) => {
  const id = ev.state?.id || window.location.hash?.replace("#", "") || "home";
  if (sectionOrder.includes(id)) goToSection(id, { push: false });
});

document.addEventListener("keydown", (e) => {
  const el = document.activeElement;
  const tag = el?.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select" || el?.isContentEditable || el?.closest("#siteNav")) return;

  if (!e.altKey) return;

  if (e.key === "ArrowRight") {
    e.preventDefault();
    goRelative(+1);
  }

  if (e.key === "ArrowLeft") {
    e.preventDefault();
    goRelative(-1);
  }
});

(function enableSwipe() {
  let startX = 0;
  let startY = 0;

  window.addEventListener(
    "touchstart",
    (e) => {
      const t = e.touches?.[0];
      if (!t) return;
      startX = t.clientX;
      startY = t.clientY;
    },
    { passive: true }
  );

  window.addEventListener(
    "touchend",
    (e) => {
      const t = e.changedTouches?.[0];
      if (!t) return;

      const dx = t.clientX - startX;
      const dy = t.clientY - startY;

      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      const MIN_X = 55;
      const MAX_Y = 60;

      if (absX > MIN_X && absY < MAX_Y) {
        if (dx < 0) goRelative(+1);
        else goRelative(-1);
      }
    },
    { passive: true }
  );
})();

const contactForm = document.getElementById("contactForm");
const formStatus = document.getElementById("formStatus");

if (contactForm) {
  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();

    if (!contactForm.checkValidity()) {
      contactForm.reportValidity();
      if (formStatus) {
        formStatus.textContent = "Please complete the required fields before sending.";
        formStatus.classList.remove("is-ok");
        formStatus.classList.add("is-err");
      }
      return;
    }

    if (formStatus) {
      formStatus.textContent = "Thanks! I can’t receive messages from this form yet. Please contact me via email: danielladaniuc@gmail.com";
      formStatus.classList.remove("is-err");
      formStatus.classList.add("is-ok");
    }

    contactForm.reset();
  });
}

if (siteNav) {
  const spacer = document.createElement("div");
  spacer.className = "nav-spacer";
  siteNav.insertAdjacentElement("afterend", spacer);

  const getStickyDurationMs = () => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue("--sticky-t").trim();
    if (!raw) return 220;

    if (raw.endsWith("ms")) {
      const v = parseFloat(raw);
      return Number.isFinite(v) ? v : 220;
    }
    if (raw.endsWith("s")) {
      const v = parseFloat(raw);
      return Number.isFinite(v) ? v * 1000 : 220;
    }

    const v = parseFloat(raw);
    return Number.isFinite(v) ? v : 220;
  };

  let triggerY = 0;
  let unstickTimer = null;

  const clearUnstickTimer = () => {
    if (unstickTimer) {
      window.clearTimeout(unstickTimer);
      unstickTimer = null;
    }
  };

  const recalcTrigger = () => {
    clearUnstickTimer();

    // Temporarily reset to measure original position correctly
    siteNav.classList.remove("is-sticky", "is-sticky--in");
    spacer.style.height = "0px";

    const rect = siteNav.getBoundingClientRect();
    triggerY = rect.top + window.scrollY;
  };

  const applySticky = () => {
    clearUnstickTimer();

    if (!siteNav.classList.contains("is-sticky")) {
      siteNav.classList.add("is-sticky");
      spacer.style.height = `${siteNav.offsetHeight}px`;

      requestAnimationFrame(() => {
        siteNav.classList.add("is-sticky--in");
      });
      return;
    }

    spacer.style.height = `${siteNav.offsetHeight}px`;
    if (!siteNav.classList.contains("is-sticky--in")) {
      requestAnimationFrame(() => {
        siteNav.classList.add("is-sticky--in");
      });
    }
  };

  const removeSticky = () => {
    siteNav.classList.remove("is-sticky--in");

    clearUnstickTimer();
    const ms = getStickyDurationMs();

    unstickTimer = window.setTimeout(() => {
      siteNav.classList.remove("is-sticky");
      spacer.style.height = "0px";
      unstickTimer = null;
    }, ms);
  };

  const syncStickyState = () => {
    const shouldStick = window.scrollY >= triggerY;

    if (shouldStick) applySticky();
    else if (siteNav.classList.contains("is-sticky")) removeSticky();
  };

  window.addEventListener("scroll", syncStickyState, { passive: true });

  window.addEventListener("resize", () => {
    recalcTrigger();
    syncStickyState();
  });

  window.addEventListener("load", () => {
    recalcTrigger();
    syncStickyState();
  });

  recalcTrigger();
  syncStickyState();
}
