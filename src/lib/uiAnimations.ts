// Global premium UI animations: scroll reveal + staggered card entrance.
// Pure visual layer — no logic changes, no DOM additions/removals.

const REVEAL_SELECTOR = [
  ".card",
  '[class*="rounded-xl"][class*="border"]',
  '[class*="rounded-2xl"][class*="border"]',
  '[class*="rounded-lg"][class*="border"]',
].join(",");

const REVEAL_ATTR = "data-anim-reveal";
const REVEALED_ATTR = "data-anim-revealed";

function applyInitialState(el: HTMLElement) {
  if (el.hasAttribute(REVEAL_ATTR)) return;
  // Skip tiny/inline elements
  const rect = el.getBoundingClientRect();
  if (rect.width < 60 || rect.height < 28) return;
  el.setAttribute(REVEAL_ATTR, "");
  el.style.opacity = "0";
  el.style.transform = "translateY(14px)";
  el.style.transition =
    "opacity 520ms cubic-bezier(0.22, 1, 0.36, 1), transform 520ms cubic-bezier(0.22, 1, 0.36, 1)";
}

function reveal(el: HTMLElement, delay = 0) {
  if (el.hasAttribute(REVEALED_ATTR)) return;
  el.setAttribute(REVEALED_ATTR, "");
  window.setTimeout(() => {
    el.style.opacity = "1";
    el.style.transform = "translateY(0)";
  }, delay);
}

let observer: IntersectionObserver | null = null;

function getObserver() {
  if (observer) return observer;
  observer = new IntersectionObserver(
    (entries) => {
      // Stagger items that come in together
      const visible = entries.filter((e) => e.isIntersecting);
      visible.forEach((entry, i) => {
        const el = entry.target as HTMLElement;
        reveal(el, Math.min(i * 60, 240));
        observer?.unobserve(el);
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -40px 0px" },
  );
  return observer;
}

function scan(root: ParentNode = document) {
  const obs = getObserver();
  const nodes = root.querySelectorAll<HTMLElement>(REVEAL_SELECTOR);
  nodes.forEach((el) => {
    if (el.hasAttribute(REVEAL_ATTR)) return;
    applyInitialState(el);
    if (el.hasAttribute(REVEAL_ATTR)) obs.observe(el);
  });
}

export function initUiAnimations() {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  if ((window as unknown as { __uiAnimInit?: boolean }).__uiAnimInit) return;
  (window as unknown as { __uiAnimInit?: boolean }).__uiAnimInit = true;

  const start = () => {
    scan(document);
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((n) => {
          if (n.nodeType === 1) scan(n as Element);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}
