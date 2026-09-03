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

function hideEmptyContainers(root: ParentNode) {
  const candidates = root.querySelectorAll("li, [data-state]")
  candidates.forEach((node) => {
    const links = node.querySelectorAll("a[href]")
    if (!links.length) {
      return
    }
    const hasVisible = Array.from(links).some(
      (link) => link.getAttribute(HIDDEN_ATTR) !== "true"
    )
    if (hasVisible) {
      node.removeAttribute(HIDDEN_ATTR)
    } else {
      node.setAttribute(HIDDEN_ATTR, "true")
    }
  })

  root.querySelectorAll("aside nav > div > div, aside nav > div").forEach((node) => {
    const links = node.querySelectorAll(":scope a[href]")
    if (!links.length) {
      return
    }
    const hasVisible = Array.from(links).some(
      (link) => link.getAttribute(HIDDEN_ATTR) !== "true"
    )
    if (!hasVisible) {
      node.setAttribute(HIDDEN_ATTR, "true")
    } else if (node.getAttribute(HIDDEN_ATTR) === "true") {
      node.removeAttribute(HIDDEN_ATTR)
    }
  })
}

export function hideUnauthorizedNav(granted: Iterable<string>) {
  ensureStyles()
  const asides = document.querySelectorAll("aside")
  asides.forEach((aside) => {
    aside.querySelectorAll("a[href]").forEach((link) => {
      const href = link.getAttribute("href")
      if (!href) {
        return
      }
      const needed = requiredPermissionForPath(href)
      if (needed && !hasPermission(granted, needed)) {
        link.setAttribute(HIDDEN_ATTR, "true")
      } else {
        link.removeAttribute(HIDDEN_ATTR)
      }
    })
    hideEmptyContainers(aside)
  })
}
