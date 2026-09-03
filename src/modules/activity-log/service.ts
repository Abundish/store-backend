import { MedusaService } from "@medusajs/framework/utils"
import { ActivityLog } from "./models/activity-log"
import {
  ActivityLogModuleOptions,
  CreateActivityLogInput,
  DEFAULT_RETENTION_MONTHS,
} from "./types"
import { getRetentionCutoff } from "./utils/filters"

const PURGE_BATCH_SIZE = 500

class ActivityLogModuleService extends MedusaService({
  ActivityLog,
}) {
  protected options_: Required<ActivityLogModuleOptions>

  constructor(...args: any[]) {
    super(...args)
    const options = args[1] as ActivityLogModuleOptions | undefined
    this.options_ = {
      retention_months: options?.retention_months ?? DEFAULT_RETENTION_MONTHS,
    }
  }

  getRetentionMonths(): number {
    return this.options_.retention_months
  }

  async record(input: CreateActivityLogInput) {
    return await this.createActivityLogs({
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      action: input.action,
      actor_id: input.actor_id ?? null,
      actor_type: input.actor_type ?? "system",
      before_state: input.before_state ?? null,
      after_state: input.after_state ?? null,
      metadata: input.metadata ?? null,
      occurred_at: input.occurred_at ?? new Date(),
    })
  }

  async purgeExpired(now = new Date()): Promise<{ deleted: number }> {
    const cutoff = getRetentionCutoff(now, this.options_.retention_months)
    let deleted = 0

    for (;;) {
      const batch = await this.listActivityLogs(
        { occurred_at: { $lt: cutoff } },
        { take: PURGE_BATCH_SIZE, select: ["id"] }
      )

      if (!batch.length) {
        break
      }

      await this.deleteActivityLogs(batch.map((row) => row.id))
      deleted += batch.length

      if (batch.length < PURGE_BATCH_SIZE) {
        break
      }
    }

    return { deleted }
  }
}

export default ActivityLogModuleService
