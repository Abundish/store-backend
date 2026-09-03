export type ActivityEventDefinition = {
  entity_type: string
  action: string
  id_fields: string[]
  query_entity?: string
  query_fields?: string[]
}

export const ACTIVITY_EVENT_MAP: Record<string, ActivityEventDefinition> = {
  "order.canceled": {
    entity_type: "order",
    action: "order_canceled",
    id_fields: ["id"],
    query_entity: "order",
    query_fields: ["id", "display_id", "status", "email", "total"],
  },
  "order.updated": {
    entity_type: "order",
    action: "order_updated",
    id_fields: ["id"],
    query_entity: "order",
    query_fields: ["id", "display_id", "status", "email", "total"],
  },
  "order.completed": {
    entity_type: "order",
    action: "order_completed",
    id_fields: ["id"],
    query_entity: "order",
    query_fields: ["id", "display_id", "status", "email", "total"],
  },
  "order.archived": {
    entity_type: "order",
    action: "order_archived",
    id_fields: ["id"],
    query_entity: "order",
    query_fields: ["id", "display_id", "status", "email"],
  },
  "order.fulfillment_created": {
    entity_type: "order",
    action: "fulfillment_created",
    id_fields: ["order_id", "id"],
    query_entity: "order",
    query_fields: ["id", "display_id", "status", "fulfillments.id"],
  },
  "order.fulfillment_canceled": {
    entity_type: "order",
    action: "fulfillment_canceled",
    id_fields: ["order_id", "id"],
    query_entity: "order",
    query_fields: ["id", "display_id", "status"],
  },
  "order.return_requested": {
    entity_type: "order",
    action: "return_requested",
    id_fields: ["order_id", "id"],
    query_entity: "order",
    query_fields: ["id", "display_id", "status"],
  },
  "order.return_received": {
    entity_type: "order",
    action: "return_received",
    id_fields: ["order_id", "id"],
    query_entity: "order",
    query_fields: ["id", "display_id", "status"],
  },
  "order.claim_created": {
    entity_type: "order",
    action: "claim_created",
    id_fields: ["order_id", "id"],
    query_entity: "order",
    query_fields: ["id", "display_id", "status"],
  },
  "order.exchange_created": {
    entity_type: "order",
    action: "exchange_created",
    id_fields: ["order_id", "id"],
    query_entity: "order",
    query_fields: ["id", "display_id", "status"],
  },
  "order-edit.requested": {
    entity_type: "order",
    action: "order_edit_requested",
    id_fields: ["order_id", "id"],
    query_entity: "order",
    query_fields: ["id", "display_id", "status", "items.id", "items.title", "items.quantity"],
  },
  "order-edit.confirmed": {
    entity_type: "order",
    action: "order_edited",
    id_fields: ["order_id", "id"],
    query_entity: "order",
    query_fields: ["id", "display_id", "status", "items.id", "items.title", "items.quantity"],
  },
  "order-edit.canceled": {
    entity_type: "order",
    action: "order_edit_canceled",
    id_fields: ["order_id", "id"],
    query_entity: "order",
    query_fields: ["id", "display_id", "status"],
  },
  "payment.refunded": {
    entity_type: "order",
    action: "refund_created",
    id_fields: ["id"],
    query_entity: "payment",
    query_fields: ["id", "amount", "currency_code", "payment_collection_id"],
  },
  "product-variant.updated": {
    entity_type: "product_variant",
    action: "price_updated",
    id_fields: ["id"],
    query_entity: "product_variant",
    query_fields: ["id", "title", "sku", "product_id", "prices.amount", "prices.currency_code"],
  },
  "product-variant.created": {
    entity_type: "product_variant",
    action: "variant_created",
    id_fields: ["id"],
    query_entity: "product_variant",
    query_fields: ["id", "title", "sku", "product_id"],
  },
  "inventory-level.updated": {
    entity_type: "inventory",
    action: "stock_adjusted",
    id_fields: ["id"],
    query_entity: "inventory_level",
    query_fields: [
      "id",
      "inventory_item_id",
      "location_id",
      "stocked_quantity",
      "reserved_quantity",
    ],
  },
  "inventory-level.created": {
    entity_type: "inventory",
    action: "inventory_location_changed",
    id_fields: ["id"],
    query_entity: "inventory_level",
    query_fields: ["id", "inventory_item_id", "location_id", "stocked_quantity"],
  },
  "reservation-item.created": {
    entity_type: "inventory",
    action: "reservation_created",
    id_fields: ["id"],
    query_entity: "reservation",
    query_fields: ["id", "line_item_id", "inventory_item_id", "quantity", "location_id"],
  },
  "reservation-item.deleted": {
    entity_type: "inventory",
    action: "reservation_released",
    id_fields: ["id"],
  },
  "customer.updated": {
    entity_type: "customer",
    action: "customer_updated",
    id_fields: ["id"],
    query_entity: "customer",
    query_fields: ["id", "email", "first_name", "last_name", "groups.id", "groups.name"],
  },
  "customer.created": {
    entity_type: "customer",
    action: "customer_created",
    id_fields: ["id"],
    query_entity: "customer",
    query_fields: ["id", "email", "first_name", "last_name"],
  },
  "user.created": {
    entity_type: "user",
    action: "admin_user_created",
    id_fields: ["id"],
    query_entity: "user",
    query_fields: ["id", "email", "first_name", "last_name"],
  },
  "user.updated": {
    entity_type: "user",
    action: "admin_user_updated",
    id_fields: ["id"],
    query_entity: "user",
    query_fields: ["id", "email", "first_name", "last_name"],
  },
  "user.deleted": {
    entity_type: "user",
    action: "admin_user_deleted",
    id_fields: ["id"],
  },
  "invite.created": {
    entity_type: "user",
    action: "admin_invite_created",
    id_fields: ["id"],
    query_entity: "invite",
    query_fields: ["id", "email"],
  },
  "invite.accepted": {
    entity_type: "user",
    action: "admin_invite_accepted",
    id_fields: ["id"],
  },
}

export const ACTIVITY_EVENT_NAMES = Object.keys(ACTIVITY_EVENT_MAP)

export function extractEntityIds(
  data: Record<string, unknown>,
  idFields: string[]
): string[] {
  if (Array.isArray(data.ids)) {
    return data.ids.map(String)
  }
  if (Array.isArray(data.id)) {
    return data.id.map(String)
  }
  for (const field of idFields) {
    const value = data[field]
    if (value != null && value !== "") {
      return [String(value)]
    }
  }
  return []
}
