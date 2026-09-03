export type ActorType = "admin_user" | "system" | "api_key"

export type ActivityLogModuleOptions = {
  retention_months?: number
}

export type CreateActivityLogInput = {
  entity_type: string
  entity_id: string
  action: string
  actor_id?: string | null
  actor_type?: ActorType
  before_state?: Record<string, unknown> | null
  after_state?: Record<string, unknown> | null
  metadata?: Record<string, unknown> | null
  occurred_at?: Date
}

export type ActivityLogListFilters = {
  entity_type?: string | string[]
  action?: string | string[]
  actor_id?: string
  entity_id?: string
  date_from?: string
  date_to?: string
  q?: string
}

export const DEFAULT_RETENTION_MONTHS = 12
