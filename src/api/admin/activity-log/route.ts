import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ACTIVITY_LOG_MODULE } from "../../../modules/activity-log"
import ActivityLogModuleService from "../../../modules/activity-log/service"
import { buildActivityLogFilters } from "../../../modules/activity-log/utils/filters"
import { attachActorEmails } from "./helpers"
import { GetActivityLogQuerySchema } from "./validators"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const parsed = GetActivityLogQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid query parameters",
      errors: parsed.error.flatten(),
    })
    return
  }

  const service = req.scope.resolve<ActivityLogModuleService>(ACTIVITY_LOG_MODULE)
  const { limit, offset, ...filterQuery } = parsed.data

  const filters = buildActivityLogFilters(filterQuery)

  const [activity_logs, count] = await service.listAndCountActivityLogs(filters, {
    take: limit,
    skip: offset,
    order: { occurred_at: "DESC" },
  })

  const withActors = await attachActorEmails(req.scope, activity_logs)

  res.json({
    activity_logs: withActors,
    count,
    limit,
    offset,
  })
}
