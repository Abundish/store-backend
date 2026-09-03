import {
  defineMiddlewares,
  type AuthenticatedMedusaRequest,
  type MedusaNextFunction,
  type MedusaRequest,
  type MedusaResponse,
} from "@medusajs/framework/http"
import { Modules, PolicyOperation } from "@medusajs/framework/utils"
import {
  actorFromAuthContext,
  ensureEventBusStampsActor,
  runWithActor,
} from "../modules/activity-log/utils/actor-context"
import { ACTIVITY_LOG_RESOURCE } from "../policies/activity-log"

const activityLogReadPolicy = {
  resource: ACTIVITY_LOG_RESOURCE,
  operation: PolicyOperation.read,
}

export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin*",
      method: ["POST", "PUT", "PATCH", "DELETE"],
      middlewares: [
        (
          req: MedusaRequest,
          _res: MedusaResponse,
          next: MedusaNextFunction
        ) => {
          try {
            const eventBus = req.scope.resolve(Modules.EVENT_BUS) as {
              emit: (...args: any[]) => Promise<unknown>
            }
            ensureEventBusStampsActor(eventBus)
          } catch {
            // Event bus may be unavailable during isolated tests
          }

          const actor = actorFromAuthContext(
            (req as AuthenticatedMedusaRequest).auth_context
          )
          if (!actor) {
            return next()
          }

          runWithActor(actor, () => next())
        },
      ],
    },
    {
      matcher: "/admin/activity-log*",
      method: ["GET"],
      policies: activityLogReadPolicy,
    },
  ],
})
