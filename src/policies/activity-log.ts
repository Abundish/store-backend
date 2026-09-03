import { definePolicies } from "@medusajs/framework/utils"
import { generateResourcePolicies } from "@medusajs/medusa/utils"

export const ACTIVITY_LOG_RESOURCE = "activity_log"

export const activityLogPolicies = definePolicies(
  generateResourcePolicies([ACTIVITY_LOG_RESOURCE])
)
