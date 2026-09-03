import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ACTIVITY_LOG_MODULE } from "../../../../modules/activity-log"
import ActivityLogModuleService from "../../../../modules/activity-log/service"
import { activityLogToCsvRow, csvHeader } from "../../../../modules/activity-log/utils/csv"
import { buildActivityLogFilters } from "../../../../modules/activity-log/utils/filters"
import { GetActivityLogExportQuerySchema } from "../validators"

const BATCH_SIZE = 200

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const parsed = GetActivityLogExportQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid query parameters",
      errors: parsed.error.flatten(),
    })
    return
  }

  const service = req.scope.resolve<ActivityLogModuleService>(ACTIVITY_LOG_MODULE)
  const filters = buildActivityLogFilters(parsed.data)

  const stamp = new Date().toISOString().slice(0, 10)
  res.setHeader("Content-Type", "text/csv; charset=utf-8")
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="activity-log-${stamp}.csv"`
  )
  res.setHeader("Cache-Control", "no-store")

  res.write(`${csvHeader()}\n`)

  let offset = 0
  for (;;) {
    const batch = await service.listActivityLogs(filters, {
      take: BATCH_SIZE,
      skip: offset,
      order: { occurred_at: "DESC" },
    })

    if (!batch.length) {
      break
    }

    for (const row of batch) {
      res.write(`${activityLogToCsvRow(row as unknown as Record<string, unknown>)}\n`)
    }

    offset += batch.length
    if (batch.length < BATCH_SIZE) {
      break
    }
  }

  res.end()
}
