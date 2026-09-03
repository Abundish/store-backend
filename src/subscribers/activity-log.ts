import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import {
  ACTIVITY_EVENT_MAP,
  ACTIVITY_EVENT_NAMES,
  extractEntityIds,
} from "../modules/activity-log/utils/catalog"
import { recordActivitySafely, resolveActor } from "../modules/activity-log/utils/record"
import { toJsonSafe } from "../modules/activity-log/utils/serialize"

type QueryGraph = {
  graph: (input: {
    entity: string
    fields: string[]
    filters: Record<string, unknown>
  }) => Promise<{ data: Record<string, unknown>[] }>
}

async function loadAfterState(
  query: QueryGraph,
  entity: string,
  fields: string[],
  id: string
): Promise<Record<string, unknown> | null> {
  try {
    const { data } = await query.graph({
      entity,
      fields,
      filters: { id },
    })
    return toJsonSafe(data?.[0] ?? null)
  } catch {
    return null
  }
}

async function resolveRefundOrderId(
  query: QueryGraph,
  paymentId: string
): Promise<{ orderId: string; after: Record<string, unknown> | null }> {
  const payment = await loadAfterState(
    query,
    "payment",
    ["id", "amount", "currency_code", "payment_collection_id"],
    paymentId
  )

  const collectionId =
    typeof payment?.payment_collection_id === "string"
      ? payment.payment_collection_id
      : null

  if (!collectionId) {
    return { orderId: paymentId, after: payment }
  }

  try {
    const { data } = await query.graph({
      entity: "order",
      fields: ["id", "display_id", "status", "email", "total"],
      filters: {
        payment_collections: { id: collectionId },
      },
    })
    const order = data?.[0]
    if (order?.id) {
      return {
        orderId: String(order.id),
        after: toJsonSafe({ order, payment }),
      }
    }
  } catch {
    // fall through — still record against the payment id
  }

  return { orderId: paymentId, after: payment }
}

export default async function activityLogHandler({
  event,
  container,
}: SubscriberArgs<Record<string, unknown>>) {
  const definition = ACTIVITY_EVENT_MAP[event.name]
  if (!definition) {
    return
  }

  const query = container.resolve("query") as QueryGraph
  const actor = resolveActor(event)
  const payload = (event.data ?? {}) as Record<string, unknown>
  const ids = extractEntityIds(payload, definition.id_fields)

  if (!ids.length) {
    await recordActivitySafely(container, {
      entity_type: definition.entity_type,
      entity_id: "unknown",
      action: definition.action,
      ...actor,
      after_state: toJsonSafe(payload),
      metadata: {
        event: event.name,
        note: "missing_entity_id",
        payload,
      },
    })
    return
  }

  for (const id of ids) {
    try {
      let entityId = id
      let entityType = definition.entity_type
      let after_state: Record<string, unknown> | null = null

      if (event.name === "payment.refunded") {
        const resolved = await resolveRefundOrderId(query, id)
        entityId = resolved.orderId
        entityType = resolved.orderId === id ? "payment" : "order"
        after_state = resolved.after
      } else if (definition.query_entity && definition.query_fields) {
        after_state = await loadAfterState(
          query,
          definition.query_entity,
          definition.query_fields,
          id
        )
      }

      await recordActivitySafely(container, {
        entity_type: entityType,
        entity_id: entityId,
        action: definition.action,
        ...actor,
        after_state,
        metadata: {
          event: event.name,
          payload,
          fulfillment_id:
            typeof payload.fulfillment_id === "string"
              ? payload.fulfillment_id
              : undefined,
          return_id:
            typeof payload.return_id === "string" ? payload.return_id : undefined,
        },
      })
    } catch (error) {
      const logger = container.resolve("logger") as {
        error: (message: string, error?: unknown) => void
      }
      logger?.error?.(
        `[activity-log] subscriber failed for ${event.name}:${id}`,
        error
      )
    }
  }
}

export const config: SubscriberConfig = {
  event: ACTIVITY_EVENT_NAMES,
}
