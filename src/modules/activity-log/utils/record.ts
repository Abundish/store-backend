import type { MedusaContainer } from "@medusajs/framework/types"
import { ACTIVITY_LOG_MODULE } from "../index"
import ActivityLogModuleService from "../service"
import type { ActorType, CreateActivityLogInput } from "../types"

type EventLike = {
  name?: string
  data?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export function resolveActor(event?: EventLike): {
  actor_id: string | null
  actor_type: ActorType
} {
  const metadata = event?.metadata ?? {}
  const data = event?.data ?? {}
  const actorId =
    (typeof metadata.actor_id === "string" && metadata.actor_id) ||
    (typeof metadata.user_id === "string" && metadata.user_id) ||
    (typeof data.actor_id === "string" && data.actor_id) ||
    (typeof data.created_by === "string" && data.created_by) ||
    null

  const actorTypeRaw =
    (typeof metadata.actor_type === "string" && metadata.actor_type) ||
    (typeof data.actor_type === "string" && data.actor_type) ||
    null

  let actor_type: ActorType = "system"
  if (actorTypeRaw === "api_key" || actorTypeRaw === "admin_user" || actorTypeRaw === "system") {
    actor_type = actorTypeRaw
  } else if (actorId) {
    actor_type = actorId.startsWith("apk_") ? "api_key" : "admin_user"
  }

  return { actor_id: actorId, actor_type }
}

export async function recordActivitySafely(
  container: MedusaContainer,
  input: CreateActivityLogInput
): Promise<void> {
  try {
    const service = container.resolve<ActivityLogModuleService>(ACTIVITY_LOG_MODULE)
    await service.record(input)
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
