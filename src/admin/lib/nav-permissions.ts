export const NAV_READ_PERMISSIONS: { path: string; permission: string }[] = [
  { path: "/orders", permission: "order:read" },
  { path: "/products", permission: "product:read" },
  { path: "/collections", permission: "product_collection:read" },
  { path: "/categories", permission: "product_category:read" },
  { path: "/product-options", permission: "product_option:read" },
  { path: "/inventory", permission: "inventory_item:read" },
  { path: "/reservations", permission: "reservation_item:read" },
  { path: "/customers", permission: "customer:read" },
  { path: "/customer-groups", permission: "customer_group:read" },
  { path: "/promotions", permission: "promotion:read" },
  { path: "/campaigns", permission: "campaign:read" },
  { path: "/price-lists", permission: "price_list:read" },
  { path: "/activity", permission: "activity_log:read" },
  { path: "/settings/store", permission: "store:read" },
  { path: "/settings/users", permission: "user:read" },
  { path: "/settings/roles", permission: "rbac_role:read" },
  { path: "/settings/policies", permission: "rbac_policy:read" },
  { path: "/settings/regions", permission: "region:read" },
  { path: "/settings/tax-regions", permission: "tax_region:read" },
  { path: "/settings/return-reasons", permission: "return_reason:read" },
  { path: "/settings/refund-reasons", permission: "refund_reason:read" },
  { path: "/settings/sales-channels", permission: "sales_channel:read" },
  { path: "/settings/product-types", permission: "product_type:read" },
  { path: "/settings/product-tags", permission: "product_tag:read" },
  { path: "/settings/locations", permission: "stock_location:read" },
  { path: "/settings/property-labels", permission: "property_label:read" },
  { path: "/settings/translations", permission: "translation:read" },
  { path: "/settings/publishable-api-keys", permission: "api_key:read" },
  { path: "/settings/secret-api-keys", permission: "api_key:read" },
  { path: "/settings/workflows", permission: "workflow_execution:read" },
].sort((a, b) => b.path.length - a.path.length)

const ALWAYS_VISIBLE = new Set(["/settings", "/settings/profile"])

export function hasPermission(
  granted: Iterable<string>,
  needed: string
): boolean {
  const set = granted instanceof Set ? granted : new Set(granted)
  if (set.has(needed) || set.has("*:*")) {
    return true
  }
  const [resource, operation] = needed.split(":")
  return set.has(`${resource}:*`) || set.has(`*:${operation}`)
}

export function toDashboardPath(href: string): string {
  let path = href
  try {
    path = new URL(href, "http://local.invalid").pathname
  } catch {
    path = href.split("?")[0] ?? href
  }
  path = path.replace(/\/+$/, "") || "/"
  const match = path.match(
    /\/(orders|products|inventory|customers|promotions|price-lists|settings|activity|collections|categories|reservations|customer-groups|campaigns|product-options)(\/.*)?$/
  )
  if (match?.index != null) {
    return path.slice(match.index)
  }
  return path
}

export function requiredPermissionForPath(pathname: string): string | null {
  const path = toDashboardPath(pathname)
  if (ALWAYS_VISIBLE.has(path)) {
    return null
  }
  for (const entry of NAV_READ_PERMISSIONS) {
    if (path === entry.path || path.startsWith(`${entry.path}/`)) {
      return entry.permission
    }
  }
  return null
}
