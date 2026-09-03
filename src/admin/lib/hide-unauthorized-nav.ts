import {
  hasPermission,
  requiredPermissionForPath,
} from "./nav-permissions"

const HIDDEN_ATTR = "data-rbac-hidden"
const STYLE_ID = "rbac-hide-unauthorized-nav"

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) {
    return
  }
  const style = document.createElement("style")
  style.id = STYLE_ID
  style.textContent = `[${HIDDEN_ATTR}="true"]{display:none !important;}`
  document.head.appendChild(style)
}

function hideAncestorsIfEmpty(link: Element) {
  let current: Element | null = link.parentElement
  for (
    let depth = 0;
    current && depth < 6 && current.tagName !== "ASIDE";
    depth += 1
  ) {
    const links = current.querySelectorAll("a[href]")
    const hasVisible = Array.from(links).some(
      (anchor) => anchor.getAttribute(HIDDEN_ATTR) !== "true"
    )
    if (links.length && !hasVisible) {
      current.setAttribute(HIDDEN_ATTR, "true")
    } else if (current.getAttribute(HIDDEN_ATTR) === "true" && hasVisible) {
      current.removeAttribute(HIDDEN_ATTR)
    }
    current = current.parentElement
  }
}

export function hideUnauthorizedNav(granted: Iterable<string>) {
  ensureStyles()
  document.querySelectorAll("aside a[href]").forEach((link) => {
    const href = link.getAttribute("href")
    if (!href) {
      return
    }
    const needed = requiredPermissionForPath(href)
    if (needed && !hasPermission(granted, needed)) {
      link.setAttribute(HIDDEN_ATTR, "true")
      hideAncestorsIfEmpty(link)
    } else {
      link.removeAttribute(HIDDEN_ATTR)
    }
  })
}
