import { AsyncLocalStorage } from "node:async_hooks"
import type { ActorType } from "../types"

export type ActivityActor = {
  actor_id: string
  actor_type: ActorType
}

const activityActorStorage = new AsyncLocalStorage<ActivityActor>()

const STAMPED = Symbol.for("abundish.activity_log.event_bus_stamped")

export function normalizeActorType(
  raw?: string | null,
  actorId?: string | null
): ActorType {
  if (raw === "admin_user" || raw === "user") {
    return "admin_user"
  }
  if (raw === "api_key" || raw === "api-key") {
    return "api_key"
  }
  if (raw === "system") {
    return "system"
  }
  if (actorId?.startsWith("apk_")) {
    return "api_key"
  }
  if (actorId?.startsWith("user_")) {
    return "admin_user"
  }
  return actorId ? "admin_user" : "system"
}

export function getCurrentActor(): ActivityActor | null {
  return activityActorStorage.getStore() ?? null
}

export function runWithActor<T>(actor: ActivityActor, fn: () => T): T {
  return activityActorStorage.run(actor, fn)
}

export function actorFromAuthContext(auth?: {
  actor_id?: string
  actor_type?: string
} | null): ActivityActor | null {
  if (!auth?.actor_id) {
    return null
  }
  return {
    actor_id: auth.actor_id,
    actor_type: normalizeActorType(auth.actor_type, auth.actor_id),
  }
}

type EventMessage = {
  name?: string
  data?: unknown
  metadata?: Record<string, unknown>
  options?: Record<string, unknown>
}

export function stampEventsWithActor<T extends EventMessage | EventMessage[]>(
  data: T,
  actor?: ActivityActor | null
): T {
  const current = actor ?? getCurrentActor()
  if (!current) {
    return data
  }

  const stamp = (event: EventMessage): EventMessage => {
    if (typeof event?.metadata?.actor_id === "string" && event.metadata.actor_id) {
      return event
    }
    return {
      ...event,
      metadata: {
        ...event.metadata,
        actor_id: current.actor_id,
        actor_type: current.actor_type,
      },
    }
  }

  return (Array.isArray(data) ? data.map(stamp) : stamp(data)) as T
}

export function ensureEventBusStampsActor(eventBus: {
  emit: (...args: any[]) => Promise<unknown>
}): void {
  const bus = eventBus as typeof eventBus & { [STAMPED]?: boolean }
  if (bus[STAMPED]) {
    return
  }
  bus[STAMPED] = true
  const originalEmit = bus.emit.bind(bus)
  bus.emit = async (data: EventMessage | EventMessage[], options?: Record<string, unknown>) => {
    return originalEmit(stampEventsWithActor(data), options)
  }
}
