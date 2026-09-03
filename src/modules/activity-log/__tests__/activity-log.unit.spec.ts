import { buildActivityLogFilters, getRetentionCutoff } from "../utils/filters"
import { activityLogToCsvRow, csvHeader } from "../utils/csv"
import { extractEntityIds } from "../utils/catalog"
import { resolveActor } from "../utils/record"
import {
  normalizeActorType,
  runWithActor,
  stampEventsWithActor,
} from "../utils/actor-context"

describe("buildActivityLogFilters", () => {
  it("maps exact filters and date bounds", () => {
    const filters = buildActivityLogFilters({
      entity_type: "order,product_variant",
      action: "refund_created",
      actor_id: "user_1",
      entity_id: "ord_1",
      date_from: "2026-01-01",
      date_to: "2026-01-02",
    })

    expect(filters.entity_type).toEqual({ $in: ["order", "product_variant"] })
    expect(filters.action).toEqual("refund_created")
    expect(filters.actor_id).toEqual("user_1")
    expect(filters.entity_id).toEqual("ord_1")
    expect(filters.occurred_at?.$gte?.toISOString()).toEqual("2026-01-01T00:00:00.000Z")
    expect(filters.occurred_at?.$lte?.toISOString()).toEqual("2026-01-02T23:59:59.999Z")
  })

  it("uses ilike search when q is provided without entity_id", () => {
    const filters = buildActivityLogFilters({ q: "ord_" })
    expect(filters.entity_id).toEqual({ $ilike: "%ord_%" })
  })
})

describe("csv", () => {
  it("escapes commas and quotes", () => {
    expect(csvHeader()).toContain("entity_id")
    const row = activityLogToCsvRow({
      id: "actlog_1",
      occurred_at: "2026-01-01T00:00:00.000Z",
      actor_type: "system",
      actor_id: null,
      entity_type: "order",
      entity_id: "ord_1",
      action: "refund_created",
      metadata: { a: 1, b: 2 },
      before_state: null,
      after_state: { status: "canceled" },
    })
    expect(row.startsWith("actlog_1,")).toBe(true)
    expect(row).toContain('"{""a"":1,""b"":2}"')
  })
})

describe("catalog", () => {
  it("extracts ids from payload variants", () => {
    expect(extractEntityIds({ id: "ord_1" }, ["id"])).toEqual(["ord_1"])
    expect(extractEntityIds({ ids: ["a", "b"] }, ["id"])).toEqual(["a", "b"])
    expect(extractEntityIds({ order_id: "ord_9" }, ["order_id", "id"])).toEqual(["ord_9"])
  })
})

describe("resolveActor", () => {
  it("defaults to system and maps admin/api key actors", () => {
    expect(resolveActor({ data: {} })).toEqual({
      actor_id: null,
      actor_type: "system",
    })
    expect(
      resolveActor({ metadata: { actor_id: "user_1", actor_type: "admin_user" } })
    ).toEqual({ actor_id: "user_1", actor_type: "admin_user" })
    expect(resolveActor({ metadata: { actor_id: "apk_123" } })).toEqual({
      actor_id: "apk_123",
      actor_type: "api_key",
    })
    expect(
      resolveActor({ metadata: { actor_id: "user_1", actor_type: "user" } })
    ).toEqual({ actor_id: "user_1", actor_type: "admin_user" })
  })

  it("falls back to the request actor context when the event has none", () => {
    runWithActor({ actor_id: "user_sam", actor_type: "admin_user" }, () => {
      expect(resolveActor({ data: { id: "variant_1" } })).toEqual({
        actor_id: "user_sam",
        actor_type: "admin_user",
      })
    })
  })
})

describe("normalizeActorType", () => {
  it("maps Medusa auth actor types onto activity-log types", () => {
    expect(normalizeActorType("user", "user_1")).toEqual("admin_user")
    expect(normalizeActorType("api-key", "apk_1")).toEqual("api_key")
    expect(normalizeActorType(undefined, "user_1")).toEqual("admin_user")
  })
})

describe("stampEventsWithActor", () => {
  it("copies the current actor onto event metadata without overwriting", () => {
    const stamped = stampEventsWithActor(
      { name: "product-variant.updated", data: { id: "variant_1" }, metadata: {} },
      { actor_id: "user_sam", actor_type: "admin_user" }
    )
    expect(stamped.metadata).toEqual({
      actor_id: "user_sam",
      actor_type: "admin_user",
    })

    const preserved = stampEventsWithActor(
      {
        name: "product-variant.updated",
        data: { id: "variant_1" },
        metadata: { actor_id: "user_other", actor_type: "admin_user" },
      },
      { actor_id: "user_sam", actor_type: "admin_user" }
    )
    expect(preserved.metadata?.actor_id).toEqual("user_other")
  })
})

describe("retention cutoff", () => {
  it("subtracts the configured number of months", () => {
    const cutoff = getRetentionCutoff(new Date("2026-09-01T00:00:00.000Z"), 12)
    expect(cutoff.toISOString()).toEqual("2025-09-01T00:00:00.000Z")
  })
})
