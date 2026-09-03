import {
  createPromotionsWorkflow,
  updatePromotionsWorkflow,
} from "@medusajs/medusa/core-flows"
import { recordActivitySafely } from "../../modules/activity-log/utils/record"
import { toJsonSafe } from "../../modules/activity-log/utils/serialize"

type PromotionLike = {
  id?: string
  code?: string
  status?: string
  is_automatic?: boolean
}

createPromotionsWorkflow.hooks.promotionsCreated(
  async ({ promotions }, { container }) => {
    for (const promotion of (promotions ?? []) as PromotionLike[]) {
      if (!promotion?.id) {
        continue
      }
      await recordActivitySafely(container, {
        entity_type: "promotion",
        entity_id: promotion.id,
        action: "promotion_created",
        after_state: toJsonSafe(promotion),
        metadata: { source: "createPromotionsWorkflow" },
      })
    }
  }
)

updatePromotionsWorkflow.hooks.promotionsUpdated(
  async ({ promotions }, { container }) => {
    for (const promotion of (promotions ?? []) as PromotionLike[]) {
      if (!promotion?.id) {
        continue
      }
      const deactivated = promotion.status === "inactive"
      await recordActivitySafely(container, {
        entity_type: "promotion",
        entity_id: promotion.id,
        action: deactivated ? "promotion_deactivated" : "promotion_updated",
        after_state: toJsonSafe(promotion),
        metadata: { source: "updatePromotionsWorkflow" },
      })
    }
  }
)
