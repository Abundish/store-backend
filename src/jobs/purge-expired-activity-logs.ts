import type { MedusaContainer } from "@medusajs/framework/types"
import { ACTIVITY_LOG_MODULE } from "../modules/activity-log"
import ActivityLogModuleService from "../modules/activity-log/service"

export default async function purgeExpiredActivityLogs(
  container: MedusaContainer
) {
  const logger = container.resolve("logger") as {
    info: (message: string) => void
    error: (message: string, error?: unknown) => void
  }
  const service = container.resolve<ActivityLogModuleService>(ACTIVITY_LOG_MODULE)

  try {
    const { deleted } = await service.purgeExpired()
    logger.info(
      `[activity-log] retention purge complete (retention_months=${service.getRetentionMonths()}, deleted=${deleted})`
    )
  } catch (error) {
    logger.error("[activity-log] retention purge failed", error)
  }
}

export const config = {
  name: "purge-expired-activity-logs",
  schedule: "0 3 * * *",
}
