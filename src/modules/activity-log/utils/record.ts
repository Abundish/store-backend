import type { MedusaContainer } from "@medusajs/framework/types"
import { ACTIVITY_LOG_MODULE } from "../index"
import ActivityLogModuleService from "../service"
import type { ActorType, CreateActivityLogInput } from "../types"
import {
  getCurrentActor,
  normalizeActorType,
} from "./actor-context"

type EventLike = {
  name?: string
  data?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

function pickString(
  ...values: unknown[]
): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.length > 0) {
      return value
    }
  }
  return null
}

export function resolveActor(event?: EventLike): {
  actor_id: string | null
  actor_type: ActorType
} {
  const metadata = event?.metadata ?? {}
  const data = event?.data ?? {}
  const current = getCurrentActor()

  const actorId = pickString(
    metadata.actor_id,
    metadata.user_id,
    data.actor_id,
    data.created_by,
    current?.actor_id
  )

  const actorTypeRaw = pickString(
    metadata.actor_type,
    data.actor_type,
    current?.actor_type
  )

  return {
    actor_id: actorId,
    actor_type: normalizeActorType(actorTypeRaw, actorId),
  }
}

export async function recordActivitySafely(
  container: MedusaContainer,
  input: CreateActivityLogInput
): Promise<void> {
  try {
    const current = getCurrentActor()
    const service = container.resolve<ActivityLogModuleService>(ACTIVITY_LOG_MODULE)
    await service.record({
      ...input,
      actor_id: input.actor_id ?? current?.actor_id ?? null,
      actor_type:
        input.actor_type ??
        current?.actor_type ??
        (input.actor_id ? "admin_user" : "system"),
    })
  } catch (error) {
    const logger = container.resolve("logger") as {
      error: (message: string, error?: unknown) => void
    }
    logger?.error?.(
      `[activity-log] failed to record ${input.action} for ${input.entity_type}:${input.entity_id}`,
      error
    )
  }
}
