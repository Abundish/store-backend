import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ACTIVITY_LOG_MODULE } from "../../../../modules/activity-log"
import ActivityLogModuleService from "../../../../modules/activity-log/service"
import { attachActorEmails } from "../helpers"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const service = req.scope.resolve<ActivityLogModuleService>(ACTIVITY_LOG_MODULE)

  try {
    const activity_log = await service.retrieveActivityLog(id)
    const [withActor] = await attachActorEmails(req.scope, [activity_log])
    res.json({ activity_log: withActor })
  } catch {
    res.status(404).json({ message: `Activity log ${id} not found` })
  }
}
