import {
  hasPermission,
  requiredPermissionForPath,
  toDashboardPath,
} from "../../admin/lib/nav-permissions"

describe("nav permission mapping", () => {
  it("maps dashboard paths to read permissions", () => {
    expect(requiredPermissionForPath("/app/orders")).toEqual("order:read")
    expect(requiredPermissionForPath("/app/orders/ord_1")).toEqual("order:read")
    expect(requiredPermissionForPath("/products")).toEqual("product:read")
    expect(requiredPermissionForPath("/collections")).toEqual(
      "product_collection:read"
    )
    expect(requiredPermissionForPath("/settings/users")).toEqual("user:read")
    expect(requiredPermissionForPath("/activity")).toEqual("activity_log:read")
  })

  it("keeps settings home and profile visible", () => {
    expect(requiredPermissionForPath("/settings")).toBeNull()
    expect(requiredPermissionForPath("/settings/profile")).toBeNull()
  })

  it("does not treat /settings/store as /settings", () => {
    expect(requiredPermissionForPath("/settings/store")).toEqual("store:read")
  })

  it("strips the admin basename", () => {
    expect(toDashboardPath("/app/customers/cus_1")).toEqual("/customers/cus_1")
  })

  it("honors wildcard grants", () => {
    expect(hasPermission(["*:*"], "order:read")).toBe(true)
    expect(hasPermission(["order:*"], "order:read")).toBe(true)
    expect(hasPermission(["customer:read"], "order:read")).toBe(false)
  })
})
