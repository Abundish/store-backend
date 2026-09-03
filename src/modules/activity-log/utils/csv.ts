const CSV_COLUMNS = [
  "id",
  "occurred_at",
  "actor_type",
  "actor_id",
  "entity_type",
  "entity_id",
  "action",
  "metadata",
  "before_state",
  "after_state",
] as const

export function csvHeader(): string {
  return CSV_COLUMNS.join(",")
}

function escapeCsv(value: unknown): string {
  if (value == null) {
    return ""
  }
  const raw =
    typeof value === "string"
      ? value
      : value instanceof Date
        ? value.toISOString()
        : JSON.stringify(value)
  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`
  }
  return raw
}

export function activityLogToCsvRow(row: Record<string, unknown>): string {
  return CSV_COLUMNS.map((column) => escapeCsv(row[column])).join(",")
}
