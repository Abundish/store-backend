import type { ActivityLogListFilters } from "../types"

type FilterValue = string | string[] | { $in: string[] } | { $ilike: string } | {
  $gte?: Date
  $lte?: Date
}

export type ActivityLogQueryFilters = {
  entity_type?: FilterValue
  action?: FilterValue
  actor_id?: string
  entity_id?: FilterValue
  occurred_at?: { $gte?: Date; $lte?: Date }
}

function asList(value?: string | string[]): string[] | undefined {
  if (!value) {
    return undefined
  }
  const items = (Array.isArray(value) ? value : value.split(","))
    .map((item) => item.trim())
    .filter(Boolean)
  return items.length ? items : undefined
}

function parseDate(value: string, endOfDay: boolean): Date {
  const hasTime = value.includes("T")
  if (!hasTime && endOfDay) {
    return new Date(`${value}T23:59:59.999Z`)
  }
  if (!hasTime) {
    return new Date(`${value}T00:00:00.000Z`)
  }
  return new Date(value)
}

export function buildActivityLogFilters(
  input: ActivityLogListFilters
): ActivityLogQueryFilters {
  const filters: ActivityLogQueryFilters = {}

  const entityTypes = asList(input.entity_type)
  if (entityTypes?.length === 1) {
    filters.entity_type = entityTypes[0]
  } else if (entityTypes?.length) {
    filters.entity_type = { $in: entityTypes }
  }

  const actions = asList(input.action)
  if (actions?.length === 1) {
    filters.action = actions[0]
  } else if (actions?.length) {
    filters.action = { $in: actions }
  }

  if (input.actor_id) {
    filters.actor_id = input.actor_id
  }

  if (input.entity_id) {
    filters.entity_id = input.entity_id
  } else if (input.q?.trim()) {
    filters.entity_id = { $ilike: `%${input.q.trim()}%` }
  }

  if (input.date_from || input.date_to) {
    filters.occurred_at = {}
    if (input.date_from) {
      filters.occurred_at.$gte = parseDate(input.date_from, false)
    }
    if (input.date_to) {
      filters.occurred_at.$lte = parseDate(input.date_to, true)
    }
  }

  return filters
}

export function getRetentionCutoff(
  now: Date,
  retentionMonths: number
): Date {
  const cutoff = new Date(now)
  cutoff.setMonth(cutoff.getMonth() - retentionMonths)
  return cutoff
}
